import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
    namespace Express {
        interface Request {
            correlationId?: string;
        }
    }
}

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const correlationId = req.headers['x-correlation-id'] as string || randomUUID();
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);
    next();
};
