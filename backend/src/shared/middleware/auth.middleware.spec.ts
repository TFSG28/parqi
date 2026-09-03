// env.ts é avaliado no import e exige variáveis via zod. Em CI não existe
// backend/.env, por isso as variáveis são garantidas aqui — vi.hoisted corre
// antes de qualquer código do módulo de teste. Nota: os imports ESM são
// inicializados antes disto, por isso o spec assina com env.JWT_SECRET
// (o segredo que o middleware realmente usa) em vez de assumir um segredo próprio.
import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest';

vi.hoisted(() => {
    process.env.JWT_SECRET ??=
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 64 chars
    process.env.ENCRYPTION_KEY ??= 'a'.repeat(64);
    process.env.DATABASE_URL ??= 'postgres://test:5432/test';
    process.env.DATABASE_USER ??= 'test';
    process.env.DATABASE_PASSWORD ??= 'test';
    process.env.DATABASE_NAME ??= 'test';
    process.env.DATABASE_HOST ??= 'localhost';
    process.env.EMAIL ??= 'test@parqi.pt';
    process.env.EMAIL_PASS ??= 'test-pass';
    process.env.FRONT_URL ??= 'http://localhost:3000';
});

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from './auth.middleware';
import { optionalAuthMiddleware } from './optional-auth.middleware';
import { env } from '../../config/env';
import { UnauthorizedError } from '../errors/AppError';

/** Seguro: 64+ chars e diferente do segredo real em qualquer ambiente. */
const WRONG_SECRET = 'z'.repeat(64);

type Next = NextFunction & { mock?: unknown };

function makeReqRes(overrides: {
    cookies?: Record<string, string>;
    authorization?: string;
} = {}) {
    const req = {
        cookies: overrides.cookies ?? {},
        headers: overrides.authorization ? { authorization: overrides.authorization } : {},
    } as unknown as Request;
    const res = { locals: {} } as unknown as Response;
    const next = vi.fn() as unknown as Next;
    return { req, res, next };
}

afterAll(() => {
    // Só removemos se foi este spec que as definiu (CI); nunca o valor do .env.
    if (process.env.JWT_SECRET?.startsWith('0123456789abcdef')) {
        delete process.env.JWT_SECRET;
    }
});

describe('authMiddleware', () => {
    let token: string;

    beforeEach(() => {
        token = jwt.sign({ userId: 'u1', email: 'a@b.c', role: 'USER' }, env.JWT_SECRET);
    });

    it('autentica via cookie httpOnly', () => {
        const { req, res, next } = makeReqRes({ cookies: { access_token: token } });

        authMiddleware(req, res, next);

        expect((req as unknown as { user?: unknown }).user).toMatchObject({
            userId: 'u1',
            email: 'a@b.c',
        });
        expect(res.locals.authViaBearer).toBe(false);
        expect(next).toHaveBeenCalledWith(); // sem erro
    });

    it('autentica via Authorization: Bearer (app Expo) e marca authViaBearer', () => {
        const { req, res, next } = makeReqRes({ authorization: `Bearer ${token}` });

        authMiddleware(req, res, next);

        expect((req as unknown as { user?: unknown }).user).toMatchObject({ userId: 'u1' });
        expect(res.locals.authViaBearer).toBe(true);
    });

    it('prefere o Bearer quando cookie e header coexistem', () => {
        const expired = jwt.sign({ userId: 'u1', email: 'a@b.c' }, env.JWT_SECRET, { expiresIn: '-10s' });
        const { req, res, next } = makeReqRes({
            cookies: { access_token: expired },
            authorization: `Bearer ${token}`,
        });

        authMiddleware(req, res, next);

        expect((req as unknown as { user?: unknown }).user).toMatchObject({ userId: 'u1' });
        expect(res.locals.authViaBearer).toBe(true);
    });

    it('sem token chama next com UnauthorizedError', () => {
        const { req, res, next } = makeReqRes();

        authMiddleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('token assinado com outro segredo chama next com UnauthorizedError', () => {
        const forged = jwt.sign({ userId: 'u1' }, WRONG_SECRET);
        const { req, res, next } = makeReqRes({ cookies: { access_token: forged } });

        authMiddleware(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('token expirado chama next com UnauthorizedError', () => {
        const expired = jwt.sign({ userId: 'u1', email: 'a@b.c' }, env.JWT_SECRET, { expiresIn: '-10s' });
        const { req, res, next } = makeReqRes({ cookies: { access_token: expired } });

        authMiddleware(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
});

describe('optionalAuthMiddleware', () => {
    let token: string;

    beforeEach(() => {
        token = jwt.sign({ userId: 'u1', email: 'a@b.c' }, env.JWT_SECRET);
    });

    it('sem token segue como visitante (sem req.user, sem erro)', () => {
        const { req, res, next } = makeReqRes();

        optionalAuthMiddleware(req, res, next);

        expect((req as unknown as { user?: unknown }).user).toBeUndefined();
        expect(next).toHaveBeenCalledWith(); // sem erro
    });

    it('token válido preenche req.user', () => {
        const { req, res, next } = makeReqRes({ cookies: { access_token: token } });

        optionalAuthMiddleware(req, res, next);

        expect((req as unknown as { user?: unknown }).user).toMatchObject({ userId: 'u1' });
    });

    it('token inválido trata como visitante em vez de bloquear', () => {
        const forged = jwt.sign({ userId: 'u1' }, WRONG_SECRET);
        const { req, res, next } = makeReqRes({ cookies: { access_token: forged } });

        optionalAuthMiddleware(req, res, next);

        expect((req as unknown as { user?: unknown }).user).toBeUndefined();
        expect(next).toHaveBeenCalledWith(); // sem erro
    });
});
