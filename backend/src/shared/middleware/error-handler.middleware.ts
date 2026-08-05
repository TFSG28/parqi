import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../errors/AppError';
import { logger } from '../utils/logger';

export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
            ...(err instanceof ValidationError && err.errors && { errors: err.errors })
        });
    }

    logger.error({
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
    }, 'Erro inesperado');

    const message = process.env.NODE_ENV === 'production' 
        ? 'Erro interno do servidor' 
        : err.message;

    return res.status(500).json({
        status: 'error',
        message
    });
}
