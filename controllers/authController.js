import Admin from '../models/userModel.js';
import RefreshToken from '../models/refreshTokenModel.js';
import sendEmail from '../utils/emailService.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Authentication Middleware Functions
// Protect routes - verify access token
const protect = asyncHandler(async (req, res, next) => {
    let token;

    // Support case-insensitive 'Bearer' and tolerate extra spaces
    const authHeader = req.headers.authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.split(' ')[1];
    }

    // Optional fallback: allow access token in a cookie named `accessToken`
    if (!token && req.cookies && req.cookies.accessToken) {
        token = req.cookies.accessToken;
    }

    if (!token) {
        return next(new AppError('Not authorized to access this route', 401));
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get admin from token
        const admin = await Admin.findById(decoded.id).select('-password');

        if (!admin) {
            return next(new AppError('Token is not valid', 401));
        }

        if (!admin.isActive) {
            return next(new AppError('Account is deactivated', 401));
        }

        req.admin = admin;
        next();
    } catch (error) {
        // Provide clearer message for expired tokens
        if (error && error.name === 'TokenExpiredError') {
            return next(new AppError('Token expired', 401));
        }
        return next(new AppError('Token is not valid', 401));
    }
});

// Verify refresh token
const verifyRefreshToken = asyncHandler(async (req, res, next) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return next(new AppError('Refresh token is required', 400));
    }

    try {
        // Find valid refresh token in database
        const tokenDoc = await RefreshToken.findValidToken(refreshToken);

        if (!tokenDoc) {
            return next(new AppError('Invalid or expired refresh token', 401));
        }

        const admin = tokenDoc.user;

        if (!admin) {
            return next(new AppError('Invalid refresh token', 401));
        }

        req.admin = admin;
        req.refreshToken = refreshToken;
        req.tokenDoc = tokenDoc;
        next();
    } catch (error) {
        return next(new AppError('Invalid refresh token', 401));
    }
});

// Authorize roles
const authorize = (...roles) => {
    return (req, res, next) => {
        // Ensure the protect middleware ran and set req.admin
        if (!req || !req.admin) {
            return next(new AppError('Not authorized to access this route', 401));
        }

        if (!roles.includes(req.admin.role)) {
            return next(new AppError(`Role ${req.admin.role} is not authorized to access this route`, 403));
        }
        next();
    };
};

// Helper function to set refresh token cookie
const setRefreshTokenCookie = (res, refreshToken) => {
    // In production we need SameSite='none' and secure=true for cross-site cookies
    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions = {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        path: '/', // sent to entire site so logout and other endpoints can read/revoke
    };

    // Optionally set cookie domain when provided (useful for subdomain setups)
    if (process.env.COOKIE_DOMAIN) {
        cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }

    res.cookie('refreshToken', refreshToken, cookieOptions);
};

// Helper function to clear refresh token cookie
const clearRefreshTokenCookie = (res) => {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions = {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/',
    };
    if (process.env.COOKIE_DOMAIN) {
        cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }
    res.clearCookie('refreshToken', cookieOptions);
};


const register = asyncHandler(async (req, res, next) => {
    const { name, email, password, role = 'admin' } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
        return next(new AppError('Admin with this email already exists', 400));
    }

    // Create admin (validation handled by mongoose schema)
    const admin = await Admin.create({
        name,
        email,
        password,
        role
    });

    // Generate tokens
    const accessToken = admin.generateAccessToken();
    const refreshToken = await admin.generateRefreshToken();

    // Set refresh token as HTTP-only cookie
    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
        success: true,
        message: 'Admin registered successfully',
        data: {
            admin,
            accessToken
        }
    });
});


const login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
        return next(new AppError('Email and password are required', 400));
    }

    // Check if admin exists and password is correct
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
        return next(new AppError('Invalid credentials', 401));
    }

    const isPasswordCorrect = await admin.comparePassword(password);
    if (!isPasswordCorrect) {
        return next(new AppError('Invalid credentials', 401));
    }

    if (!admin.isActive) {
        return next(new AppError('Account is deactivated', 401));
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate tokens
    const accessToken = admin.generateAccessToken();
    const refreshToken = await admin.generateRefreshToken();

    // Set refresh token as HTTP-only cookie
    setRefreshTokenCookie(res, refreshToken);

    // Remove password from response (convert to plain object and delete password)
    const adminWithoutPassword = admin.toObject();
    delete adminWithoutPassword.password;

    res.json({
        success: true,
        message: 'Login successful',
        data: {
            admin: adminWithoutPassword,
            accessToken
        }
    });
});


const refreshToken = asyncHandler(async (req, res, next) => {
    const admin = req.admin;
    const oldRefreshToken = req.refreshToken;

    // Use the token document supplied by verifyRefreshToken (preferred)
    const tokenDoc = req.tokenDoc;

    // Reuse / replay detection: if the token has already been revoked, treat as possible theft
    if (tokenDoc && tokenDoc.isRevoked) {
        try {
            // Revoke all tokens for this user as a precaution
            await RefreshToken.revokeAllForUser(admin._id);
        } catch (err) {
            console.error('Error revoking all tokens after reuse detection:', err && err.message ? err.message : err);
        }
        return next(new AppError('Refresh token reuse detected. All sessions revoked. Please log in again.', 401));
    }

    // Atomically consume/revoke the presented refresh token to avoid races.
    try {
        if (tokenDoc && tokenDoc.token) {
            // Attempt an atomic update: set isRevoked = true only if it was false
            const consumed = await RefreshToken.findOneAndUpdate(
                { token: tokenDoc.token, isRevoked: false },
                { isRevoked: true },
                { new: true }
            );

            if (!consumed) {
                // Token was already revoked by another request -> treat as reuse
                try {
                    await RefreshToken.revokeAllForUser(admin._id);
                } catch (err) {
                    console.error('Error revoking all tokens after atomic consume failure:', err && err.message ? err.message : err);
                }
                return next(new AppError('Refresh token reuse detected. All sessions revoked. Please log in again.', 401));
            }
        } else if (oldRefreshToken) {
            await RefreshToken.revokeToken(oldRefreshToken);
        }
    } catch (err) {
        console.error('Error consuming old refresh token during rotation:', err && err.message ? err.message : err);
        // do not block rotation for revocation errors
    }

    // Issue a new refresh token and persist it via the Admin model method
    const newRefreshToken = await admin.generateRefreshToken();

    // Set the new refresh token as an HTTP-only cookie so the client retains it
    setRefreshTokenCookie(res, newRefreshToken);

    // Generate new access token and return to client
    const accessToken = admin.generateAccessToken();

    res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
            accessToken
        }
    });
});


const logout = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
        // Revoke the specific refresh token
        await RefreshToken.revokeToken(refreshToken);
    }

    // Clear the refresh token cookie
    clearRefreshTokenCookie(res);

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});


export {
    register,
    login,
    refreshToken,
    logout,
    protect,
    verifyRefreshToken,
    authorize
};
