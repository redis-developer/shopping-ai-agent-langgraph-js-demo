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

// Custom AppError class
export class AppError extends Error {
    constructor(name, message, httpStatus = 500, publicMessage = null) {
        super(message);
        this.name = name;
        this.httpStatus = httpStatus;
        this.publicMessage = publicMessage;
        
        // Maintain proper stack trace
        Error.captureStackTrace(this, AppError);
    }
}

// Centralized error handler middleware
export function handleError(error, req, res, next) {
    try {
        // Log the error
        console.error('Error occurred:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString()
        });

        // Handle different error types
        if (error instanceof AppError) {
            return res.status(error.httpStatus).json({
                success: false,
                error: error.publicMessage || error.message
            });
        }

        // Default error response
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: process.env.NODE_ENV === 'development' 
                ? error.message 
                : 'Internal server error'
        });
        
    } catch (handlerError) {
        // If error handler itself fails
        console.error('Error in error handler:', handlerError);
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: 'Internal server error'
        });
    }
}
