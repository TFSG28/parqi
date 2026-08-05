import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors/AppError';
import { env } from '../../config/env';
import { ACCESS_TOKEN_COOKIE } from '../../config/cookie.config';

interface JwtPayload {
    userId: string;
    email: string;
    role?: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        // Web: cookie httpOnly. Mobile (app Expo): Authorization: Bearer <jwt>
        const cookieToken = req.cookies?.[ACCESS_TOKEN_COOKIE];
        const authHeader = req.headers.authorization;
        const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
        const token = bearerToken ?? cookieToken;

        if (!token) {
            throw new UnauthorizedError('Não autenticado');
        }

        const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        req.user = decoded;
        // Com Bearer não há cookies: o CSRF double-submit não se aplica (csrfMiddleware respeita esta flag).
        res.locals.authViaBearer = Boolean(bearerToken);
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(new UnauthorizedError('Sessão inválida ou expirada'));
        } else {
            next(error);
        }
    }
}
