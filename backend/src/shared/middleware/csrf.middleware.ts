import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors/AppError';
import { CSRF_COOKIE } from '../../config/cookie.config';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Stateless double-submit CSRF protection.
 *
 * For state-changing requests, the token sent in the `X-CSRF-Token` header must
 * match the `csrf_token` cookie. A cross-origin attacker can trigger a request
 * with the cookie (browsers attach it automatically) but cannot read it to set
 * the matching header, so the two only align for same-origin requests.
 *
 * Chain it after `authMiddleware` on authenticated mutating routes:
 *   router.post('/logout', authMiddleware, csrfMiddleware, controller.logout);
 */
export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
    if (!UNSAFE_METHODS.has(req.method)) {
        return next();
    }

    const headerToken = req.headers['x-csrf-token'];
    const cookieToken = req.cookies?.[CSRF_COOKIE];

    if (!cookieToken || typeof headerToken !== 'string' || headerToken !== cookieToken) {
        return next(new ForbiddenError('CSRF token inválido'));
    }

    next();
}
