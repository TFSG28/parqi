import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetCurrentUserUseCase } from './GetCurrentUser.usecase';
import { NotFoundError } from '../../../../shared/errors/AppError';
import type { IUserRepository } from '../../../user/domain/repositories/IUser.repository';

function makeUser(overrides: Record<string, unknown> = {}) {
    return {
        id: 'user-1',
        name: 'Ana',
        email: 'ana@example.com',
        password: 'hash',
        role: 'USER',
        isActive: true,
        emailVerified: true,
        ...overrides,
    };
}

describe('GetCurrentUserUseCase', () => {
    let useCase: GetCurrentUserUseCase;
    let mockUsers: IUserRepository;

    beforeEach(() => {
        mockUsers = {
            findById: vi.fn(),
            findByEmail: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        } as unknown as IUserRepository;

        useCase = new GetCurrentUserUseCase(mockUsers);
    });

    it('devolve o perfil público do utilizador autenticado', async () => {
        vi.mocked(mockUsers.findById).mockResolvedValue(makeUser() as never);

        const result = await useCase.execute('user-1');

        expect(mockUsers.findById).toHaveBeenCalledWith('user-1');
        // Nunca expõe password nem campos de verificação de email.
        expect(result).toEqual({
            id: 'user-1',
            name: 'Ana',
            email: 'ana@example.com',
            role: 'USER',
            isActive: true,
            emailVerified: true,
        });
        expect(result).not.toHaveProperty('password');
    });

    it('lança NotFoundError para id desconhecido', async () => {
        vi.mocked(mockUsers.findById).mockResolvedValue(null as never);

        await expect(useCase.execute('ghost')).rejects.toThrow(NotFoundError);
    });
});
