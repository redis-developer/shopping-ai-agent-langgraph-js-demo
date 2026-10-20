// HTTP Status Codes
export const HttpStatusCode = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,

    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,

    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503
};

export const ErrorType = {
    INVALID_INPUT: 'INVALID_INPUT',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    UNKNOWN: 'UNKNOWN',
}

// Map ErrorType to HTTP Status Codes
const ERROR_TYPE_TO_HTTP_STATUS = {
    [ErrorType.INVALID_INPUT]: HttpStatusCode.BAD_REQUEST,
    [ErrorType.UNAUTHORIZED]: HttpStatusCode.UNAUTHORIZED,
    [ErrorType.FORBIDDEN]: HttpStatusCode.FORBIDDEN,
    [ErrorType.NOT_FOUND]: HttpStatusCode.NOT_FOUND,
    [ErrorType.CONFLICT]: HttpStatusCode.CONFLICT,
    [ErrorType.INTERNAL_SERVER_ERROR]: HttpStatusCode.INTERNAL_SERVER_ERROR,
    [ErrorType.UNKNOWN]: HttpStatusCode.INTERNAL_SERVER_ERROR,
};

// Custom AppError class
export class AppError extends Error {
    constructor(name, message, errorType, options = {}) {
        super(message);
        this.name = name;
        this.message = message;
        this.errorType = errorType || ErrorType.UNKNOWN;
        this.publicMessage = options.publicMessage || null;
        this.data = options.data || null;

        // Maintain proper stack trace
        Error.captureStackTrace(this, AppError);
    }

    // Get HTTP status code based on error type
    getHttpStatus() {
        return ERROR_TYPE_TO_HTTP_STATUS[this.errorType] || HttpStatusCode.INTERNAL_SERVER_ERROR;
    }
}

// Centralized error handler middleware
export function handleError(error, req, res, next) {
    try {
        // Log the error
        console.error('Error occurred:', {
            name: error.name,
            message: error.message,
            errorType: error.errorType,
            stack: error.stack,
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString()
        });

        // Handle different error types
        if (error instanceof AppError) {
            return res.status(error.getHttpStatus()).json({
                success: false,
                error: error.publicMessage || error.message,
                ...(error.data && { data: error.data })
            });
        }

        // Default error response
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: process.env.NODE_ENV === 'development'
                ? error.message
                : "We couldn't complete this action. Please try again in a bit. If the problem persists, contact the maintainer for help."
        });

    } catch (handlerError) {
        // If error handler itself fails
        console.error('Error in error handler:', handlerError);
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: "We couldn't complete this action. Please try again in a bit. If the problem persists, contact the maintainer for help."
        });
    }
}
