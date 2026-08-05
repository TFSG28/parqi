import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { csrfMiddleware } from './csrf.middleware';
import { ForbiddenError } from '../errors/AppError';

const run = (method: string, headerToken?: string, cookieToken?: string) => {
    const req = {
        method,
        headers: headerToken ? { 'x-csrf-token': headerToken } : {},
        cookies: cookieToken ? { csrf_token: cookieToken } : {},
    } as unknown as Request;
    const next = vi.fn() as unknown as NextFunction;
    csrfMiddleware(req, {} as Response, next);
    return (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
};

describe('csrfMiddleware', () => {
    it('allows safe methods without a token', () => {
        expect(run('GET')).toBeUndefined();
    });

    it('allows unsafe methods when header matches the cookie', () => {
        expect(run('POST', 'abc123', 'abc123')).toBeUndefined();
    });

    it('rejects when header and cookie differ', () => {
        expect(run('POST', 'abc123', 'different')).toBeInstanceOf(ForbiddenError);
    });

    it('rejects when the header is missing', () => {
        expect(run('DELETE', undefined, 'abc123')).toBeInstanceOf(ForbiddenError);
    });

    it('rejects when the cookie is missing', () => {
        expect(run('PUT', 'abc123', undefined)).toBeInstanceOf(ForbiddenError);
    });
});
