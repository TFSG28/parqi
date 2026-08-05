import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError';

/**
 * Role-based authorization guard. Use AFTER `authMiddleware`, which populates
 * `req.user`. Pass the roles allowed to access the route.
 *
 *   router.delete('/users/:id', authMiddleware, requireRole('admin'), handler);
 *   router.get('/reports', authMiddleware, requireRole('admin', 'manager'), handler);
 *
 * Note: `req.user.role` must be present in the JWT payload. Include `role`
 * when signing the token at login for this guard to be effective.
 */
export function requireRole(...allowedRoles: string[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const role = req.user?.role;

        if (!req.user) {
            return next(new UnauthorizedError('Não autenticado'));
        }

        if (!role || !allowedRoles.includes(role)) {
            return next(new ForbiddenError('Acesso negado'));
        }

        next();
    };
}
