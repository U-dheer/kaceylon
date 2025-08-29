import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configure dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: './config.env' });

// Import routes
import authRoutes from './routes/authRouter.js';
import RefreshToken from './models/refreshTokenModel.js';
import globalErrorHandler from './controllers/errorController.js';

const app = express();

// Security middleware
app.use(helmet());
// Prevent HTTP parameter pollution
// Allow these parameters to appear multiple times (useful for arrays)
// app.use(hpp());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    }
});
app.use('/api/', limiter);

// Cookie parser middleware
app.use(cookieParser());

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS middleware
// Support multiple frontend origins via FRONTEND_URLS (comma-separated)
// or the single FRONTEND_URL env var. If no origin is present (eg. Postman, server-to-server)
// allow the request. The client must send credentials for cookies to work.
const frontendUrls = process.env.FRONTEND_URLS
    ? process.env.FRONTEND_URLS.split(',').map((u) => u.trim()).filter(Boolean)
    : process.env.FRONTEND_URL
        ? [process.env.FRONTEND_URL]
        : ['http://localhost:3000'];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl/postman)
        if (!origin) return callback(null, true);

        // Accept if in whitelist
        if (frontendUrls.indexOf(origin) !== -1) {
            return callback(null, true);
        }

        // Otherwise block
        return callback(new Error('CORS policy: This origin is not allowed'), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Disposition', 'Content-Length'],
    optionsSuccessStatus: 204,
    maxAge: 86400 // cache preflight for 24 hours
};

app.use(cors(corsOptions));
// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

// Connect to MongoDB with retry/backoff and clearer guidance on failure
const connectWithRetry = async () => {
    const uri = process.env.MONGODB_URI;
    const maxAttempts = parseInt(process.env.MONGO_CONNECT_RETRIES, 10) || 5;
    const delayMs = parseInt(process.env.MONGO_CONNECT_DELAY_MS, 10) || 5000;

    // If developer opted into an in-memory fallback, try it immediately to avoid
    // repeated Atlas connection attempts while developing locally.
    if (process.env.MONGO_FALLBACK === 'true') {
        try {
            console.log('MONGO_FALLBACK=true — starting in-memory MongoDB instance for local development...');
            const { MongoMemoryServer } = await import('mongodb-memory-server');
            const mongod = await MongoMemoryServer.create();
            const memUri = mongod.getUri();
            await mongoose.connect(memUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            console.log('Connected to in-memory MongoDB (mongodb-memory-server).');

            // Ensure mongod is stopped and mongoose disconnected on process exit
            const shutdown = async () => {
                try {
                    await mongoose.disconnect();
                    await mongod.stop();
                } catch (e) {
                    // ignore
                }
                process.exit(0);
            };
            process.on('SIGINT', shutdown);
            process.on('SIGTERM', shutdown);

            return;
        } catch (memErr) {
            console.error('Failed to start mongodb-memory-server; falling back to Atlas connection attempts.');
            console.error(memErr);
            // continue to Atlas connection flow below
        }
    }

    if (!uri) {
        console.error('MongoDB connection string is not set. Please set MONGODB_URI in your environment/config.env.');
        console.error('Example (do NOT commit credentials to source control):');
        console.error("MONGODB_URI='mongodb+srv://<user>:<password>@cluster0.mongodb.net/<db>?retryWrites=true&w=majority'");
        // Exit because the app cannot function without a configured DB in most cases
        process.exit(1);
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await mongoose.connect(uri);
            console.log('MongoDB Connected');
            return;
        } catch (err) {
            const msg = err && err.message ? err.message : String(err);
            console.error(`MongoDB connection attempt ${attempt} failed: ${msg}`);

            if (attempt < maxAttempts) {
                console.log(`Retrying in ${delayMs}ms... (${attempt}/${maxAttempts})`);
                // eslint-disable-next-line no-await-in-loop
                await new Promise((resolve) => setTimeout(resolve, delayMs));
                continue;
            }

            console.error('All MongoDB connection attempts failed. Helpful checks:');
            console.error('- Verify MONGODB_URI is correct and credentials are valid.');
            console.error("- If using MongoDB Atlas, add your current IP to Network Access (IP Access List) or use 0.0.0.0/0 temporarily for testing.");
            console.error('- Ensure your cluster is running and not paused.');
            console.error('- Confirm no firewall/VPN is blocking outbound connections to Atlas hosts.');
            console.error('Full error from mongoose below:');
            console.error(err);

            // Optional fallback for local development: start an in-memory MongoDB instance
            if (process.env.MONGO_FALLBACK === 'true') {
                console.log('MONGO_FALLBACK=true — attempting to start an in-memory MongoDB instance (mongodb-memory-server)...');
                try {
                    const { MongoMemoryServer } = await import('mongodb-memory-server');
                    const mongod = await MongoMemoryServer.create();
                    const memUri = mongod.getUri();
                    await mongoose.connect(memUri);
                    console.log('Connected to in-memory MongoDB (mongodb-memory-server).');

                    // Ensure mongod is stopped and mongoose disconnected on process exit
                    const shutdown = async () => {
                        try {
                            await mongoose.disconnect();
                            await mongod.stop();
                        } catch (e) {
                            // ignore
                        }
                        process.exit(0);
                    };
                    process.on('SIGINT', shutdown);
                    process.on('SIGTERM', shutdown);

                    return;
                } catch (memErr) {
                    console.error('Failed to start mongodb-memory-server. To enable fallback, install it as a devDependency:');
                    console.error('npm install --save-dev mongodb-memory-server');
                    console.error(memErr);
                }
            }

            // Exit to avoid running a server that will immediately fail on DB operations.
            process.exit(1);
        }
    }
};

// Start initial connection attempts
connectWithRetry();

// Routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});


// 404 handler
app.use('*', (req, res, next) => {
    const error = new Error(`Route ${req.originalUrl} not found`);
    error.statusCode = 404;
    next(error);
});

// Centralized error handler
app.use(globalErrorHandler);

const PORT = process.env.PORT || 3000;

// Start HTTP server and attach a clear error handler for EADDRINUSE
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Another process is listening on that port.`);
        console.error('Stop the other process, or set a different PORT in your environment and try again.');
        process.exit(1);
    }
    console.error('Server error:', err);
    process.exit(1);
});

// Cleanup expired refresh tokens every hour
setInterval(async () => {
    try {
        const result = await RefreshToken.cleanupExpired();
        if (result.deletedCount > 0) {
            console.log(`Cleaned up ${result.deletedCount} expired refresh tokens`);
        }
    } catch (error) {
        console.error('Error cleaning up expired tokens:', error);
    }
}, 60 * 60 * 1000); // Run every hour

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    // Exit process
    process.exit(1);
});
