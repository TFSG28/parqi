import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SetUserActiveUseCase } from './SetUserActive.usecase';
import { UserNotFoundError } from '../../domain/errors/UserNotFound.error';
import { ForbiddenError } from '../../../../shared/errors/AppError';
import type { IUserRepository } from '../../domain/repositories/IUser.repository';

function makeUser(overrides: Record<string, unknown> = {}) {
    return {
        id: 'user-1',
        name: 'Ana',
        email: 'ana@example.com',
        role: 'USER',
        isActive: true,
        ...overrides,
    };
}

describe('SetUserActiveUseCase', () => {
    let useCase: SetUserActiveUseCase;
    let mockUsers: IUserRepository;

    beforeEach(() => {
        mockUsers = {
            findById: vi.fn(),
            update: vi.fn().mockImplementation((id, data) =>
                Promise.resolve(makeUser({ id, ...data }))
            ),
            findByEmail: vi.fn(),
            create: vi.fn(),
            delete: vi.fn(),
        } as unknown as IUserRepository;

        useCase = new SetUserActiveUseCase(mockUsers);
    });

    it('suspende uma conta ativa', async () => {
        vi.mocked(mockUsers.findById).mockResolvedValue(makeUser() as never);

        const result = await useCase.execute('user-1', false);

        expect(mockUsers.update).toHaveBeenCalledWith('user-1', { isActive: false });
        expect(result.isActive).toBe(false);
    });

    it('reativa uma conta suspensa', async () => {
        vi.mocked(mockUsers.findById).mockResolvedValue(makeUser({ isActive: false }) as never);

        const result = await useCase.execute('user-1', true);

        expect(mockUsers.update).toHaveBeenCalledWith('user-1', { isActive: true });
        expect(result.isActive).toBe(true);
    });

    it('utilizador desconhecido recebe UserNotFoundError', async () => {
        vi.mocked(mockUsers.findById).mockResolvedValue(null as never);

        await expect(useCase.execute('ghost', false)).rejects.toThrow(UserNotFoundError);
        expect(mockUsers.update).not.toHaveBeenCalled();
    });

    it('não permite suspender um administrador', async () => {
        vi.mocked(mockUsers.findById).mockResolvedValue(makeUser({ role: 'ADMIN' }) as never);

        await expect(useCase.execute('admin-1', false)).rejects.toThrow(ForbiddenError);
        expect(mockUsers.update).not.toHaveBeenCalled();
    });
});
