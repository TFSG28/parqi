import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { LoginUseCase } from './Login.usecase';
import { UnauthorizedError } from '../../../../shared/errors/AppError';
import type { IUserRepository } from '../../../user/domain/repositories/IUser.repository';
import type { IJwtService } from '../../domain/services/IJwt.service';

interface MockUser {
    id: string;
    name: string;
    email: string;
    password: string;
    emailVerified: boolean;
    isActive: boolean;
    role: 'USER' | 'ADMIN';
}

function makeUser(overrides: Partial<MockUser> = {}): MockUser {
    return {
        id: 'user-1',
        name: 'Ana',
        email: 'ana@example.com',
        password: 'hash-do-password',
        emailVerified: true,
        isActive: true,
        role: 'USER',
        ...overrides,
    };
}

describe('LoginUseCase', () => {
    let useCase: LoginUseCase;
    let mockUsers: IUserRepository;
    let mockJwt: IJwtService;

    afterEach(() => {
        vi.restoreAllMocks();
    });

    beforeEach(() => {
        // bcryptjs é CJS externalizado — vi.mock não o intercepta; espião no módulo real.
        vi.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

        mockUsers = {
            findById: vi.fn(),
            findByEmail: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        } as unknown as IUserRepository;

        mockJwt = {
            generateToken: vi.fn().mockReturnValue('jwt-token'),
            verifyToken: vi.fn(),
        } as unknown as IJwtService;

        useCase = new LoginUseCase(mockUsers, mockJwt);
    });

    it('autentica com credenciais válidas e emite token com os claims do utilizador', async () => {
        vi.mocked(mockUsers.findByEmail).mockResolvedValue(makeUser() as never);

        const result = await useCase.execute({ email: 'ana@example.com', password: 'segredo' });

        expect(mockJwt.generateToken).toHaveBeenCalledWith({
            userId: 'user-1',
            email: 'ana@example.com',
            role: 'USER',
        });
        expect(result).toEqual({
            token: 'jwt-token',
            user: {
                id: 'user-1',
                name: 'Ana',
                email: 'ana@example.com',
                emailVerified: true,
            },
        });
    });

    it('rejeita email desconhecido', async () => {
        vi.mocked(mockUsers.findByEmail).mockResolvedValue(null);

        await expect(
            useCase.execute({ email: 'ghost@example.com', password: 'segredo' })
        ).rejects.toThrow(UnauthorizedError);
        expect(mockJwt.generateToken).not.toHaveBeenCalled();
    });

    it('rejeita palavra-passe incorreta', async () => {
        vi.mocked(mockUsers.findByEmail).mockResolvedValue(makeUser() as never);
        vi.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

        await expect(
            useCase.execute({ email: 'ana@example.com', password: 'errada' })
        ).rejects.toThrow(UnauthorizedError);
        expect(mockJwt.generateToken).not.toHaveBeenCalled();
    });

    it('bloqueia contas inativas (suspensas) mesmo com a password certa', async () => {
        vi.mocked(mockUsers.findByEmail).mockResolvedValue(
            makeUser({ isActive: false }) as never
        );

        await expect(
            useCase.execute({ email: 'ana@example.com', password: 'segredo' })
        ).rejects.toThrow(UnauthorizedError);
        expect(mockJwt.generateToken).not.toHaveBeenCalled();
    });
});
