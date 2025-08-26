import AppError from "../utils/AppError.js";
const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
}

const handleDuplicateFieldsDB = err => {
    let value = '';
    if (err.keyValue) {
        value = Object.values(err.keyValue)[0];
    } else if (err.errmsg) {
        try {
            value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
        } catch (e) {
            value = err.errmsg;
        }
    } else {
        value = 'duplicate value';
    }

    const message = `Duplicate field value: ${JSON.stringify(value)}. Please use another value.`;
    return new AppError(message, 400);
}
const handleValidationErrorDB = err => {

    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data.${errors.join('. ')}`;
    return new AppError(message, 400);
}

const handleJWTError = () => new AppError('Invalid token. Please log in again.', 401);

const handleJWTExpiredError = () => new AppError('Your token has expired. Please log in again.', 401);

const handleMulterError = err => {
    if (err && err.name === 'MulterError') {
        return new AppError(err.message || 'File upload error', 400);
    }
    return null;
}

const handleMongoNetworkError = () => new AppError('Database connection error. Please try again later.', 500);

const handleSyntaxError = err => {
    if (err && err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return new AppError('Invalid JSON payload', 400);
    }
    return null;
}

const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        stack: err.stack
    });
}

const sendErrorProd = (err, res) => {
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });
    } else {
        console.error('ERROR:', err);
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong'
        });
    }
}

export default function globalErrorHandler(err, req, res, next) {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    const env = process.env.NODE_ENV ? process.env.NODE_ENV.trim() : 'development';

    if (env === 'development') {
        sendErrorDev(err, res);
        return;
    }

    // production: map known errors to operational AppErrors
    let processedError = err;

    const syntax = handleSyntaxError(err);
    if (syntax) processedError = syntax;

    const multerErr = handleMulterError(err);
    if (multerErr) processedError = multerErr;

    if (err.name === 'MongoNetworkError') processedError = handleMongoNetworkError();
    if (err.name === 'CastError') processedError = handleCastErrorDB(err);
    if (err.code === 11000) processedError = handleDuplicateFieldsDB(err);
    if (err.name === 'ValidationError') processedError = handleValidationErrorDB(err);
    if (err.name === 'JsonWebTokenError') processedError = handleJWTError();
    if (err.name === 'TokenExpiredError') processedError = handleJWTExpiredError();

    sendErrorProd(processedError, res);
}