import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireRole } from './role.middleware';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError';

const run = (user: unknown, roles: string[]) => {
    const req = { user } as unknown as Request;
    const next = vi.fn() as unknown as NextFunction;
    requireRole(...roles)(req, {} as Response, next);
    return (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
};

describe('requireRole', () => {
    it('passes when the user has an allowed role', () => {
        expect(run({ userId: '1', email: 'a@b.c', role: 'admin' }, ['admin'])).toBeUndefined();
    });

    it('passes when one of several allowed roles matches', () => {
        expect(run({ role: 'manager' }, ['admin', 'manager'])).toBeUndefined();
    });

    it('rejects with ForbiddenError when the role is not allowed', () => {
        expect(run({ role: 'user' }, ['admin'])).toBeInstanceOf(ForbiddenError);
    });

    it('rejects with ForbiddenError when the user has no role', () => {
        expect(run({ userId: '1', email: 'a@b.c' }, ['admin'])).toBeInstanceOf(ForbiddenError);
    });

    it('rejects with UnauthorizedError when there is no authenticated user', () => {
        expect(run(undefined, ['admin'])).toBeInstanceOf(UnauthorizedError);
    });
});
