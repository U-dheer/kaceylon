import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import RefreshToken from './refreshTokenModel.js';

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true,
        maxlength: [50, 'Name cannot be more than 50 characters'],
        minlength: [2, 'Name must be at least 2 characters']
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },
    role: {
        type: String,
        enum: {
            values: ['admin', 'super-admin'],
            message: 'Role must be either admin or super-admin'
        },
        default: 'admin'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    passwordResetToken: String,
    passwordResetExpires: Date
}, {
    timestamps: true
});

// Index for filtering by role and active status (common admin queries)
adminSchema.index({ role: 1, isActive: 1 });

// Hash password before saving
adminSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
adminSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT access token
adminSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            id: this._id,
            email: this.email,
            role: this.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRE
        }
    );
};

// Generate JWT refresh token
adminSchema.methods.generateRefreshToken = async function () {
    const refreshToken = jwt.sign(
        {
            id: this._id
        },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn: process.env.JWT_REFRESH_EXPIRE
        }
    );

    // Parse expiresIn to get seconds
    const expiresIn = process.env.JWT_REFRESH_EXPIRE;
    let expiresInSeconds;

    if (expiresIn.includes('d')) {
        expiresInSeconds = parseInt(expiresIn) * 24 * 60 * 60;
    } else if (expiresIn.includes('h')) {
        expiresInSeconds = parseInt(expiresIn) * 60 * 60;
    } else if (expiresIn.includes('m')) {
        expiresInSeconds = parseInt(expiresIn) * 60;
    } else {
        expiresInSeconds = parseInt(expiresIn);
    }

    // Store refresh token in separate collection
    await RefreshToken.createToken(this._id, refreshToken, expiresInSeconds);

    return refreshToken;
};



export default mongoose.model('Admin', adminSchema);
