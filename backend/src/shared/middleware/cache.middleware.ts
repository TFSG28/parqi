import { Request, Response, NextFunction } from 'express';
import { cacheGet, cacheSet } from '../../config/cache.config';

export const cacheMiddleware = (ttl = 300) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (req.method !== 'GET') {
            return next();
        }

        // Respostas por utilizador (auth opcional, ex.: myVote) nunca podem
        // ser servidas a partir de uma cache partilhada por URL.
        if (req.user) {
            return next();
        }

        const key = `cache:${req.originalUrl}`;
        const cached = await cacheGet(key);

        if (cached) {
            return res.json(JSON.parse(cached));
        }

        const originalJson = res.json.bind(res);
        res.json = (body: unknown) => {
            cacheSet(key, JSON.stringify(body), ttl).catch(() => {});
            return originalJson(body);
        };

        next();
    };
};
