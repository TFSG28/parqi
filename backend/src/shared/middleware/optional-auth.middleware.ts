import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { ACCESS_TOKEN_COOKIE } from '../../config/cookie.config';

/**
 * Auth opcional: se existir um token válido (cookie ou Bearer), preenche
 * `req.user`; caso contrário segue sem erro. Usado em rotas públicas que
 * enriquecem a resposta consoante o utilizador (ex.: GET /parking/:id com
 * o voto do próprio). Rotas que exijam sessão continuam a usar authMiddleware.
 */
export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
    try {
        const cookieToken = req.cookies?.[ACCESS_TOKEN_COOKIE];
        const authHeader = req.headers.authorization;
        const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
        const token = bearerToken ?? cookieToken;

        if (!token) {
            return next();
        }

        const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; email: string; role?: string };
        req.user = decoded;
    } catch {
        // Token ausente ou inválido: trata como visitante
    }
    next();
}
