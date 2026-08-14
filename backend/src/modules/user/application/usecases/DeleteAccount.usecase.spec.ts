import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { DeleteAccountUseCase } from './DeleteAccount.usecase';
import { UserNotFoundError } from '../../domain/errors/UserNotFound.error';
import { ForbiddenError, UnauthorizedError } from '../../../../shared/errors/AppError';
import type { IUserRepository } from '../../domain/repositories/IUser.repository';

interface MockUser {
    id: string;
    name: string;
    email: string;
    password: string;
    role: 'USER' | 'ADMIN';
}

function makeUser(overrides: Partial<MockUser> = {}): MockUser {
    return {
        id: 'user-1',
        name: 'Ana',
        email: 'ana@example.com',
        password: 'hash-do-password',
        role: 'USER',
        ...overrides,
    };
}

describe('DeleteAccountUseCase (RGPD)', () => {
    let useCase: DeleteAccountUseCase;
    let mockUsers: IUserRepository;

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

        useCase = new DeleteAccountUseCase(mockUsers);
    });

    it('elimina a conta quando a palavra-passe confirma', async () => {
        vi.mocked(mockUsers.findById).mockResolvedValue(makeUser() as never);

        await useCase.execute('user-1', 'segredo');

        expect(bcrypt.compare).toHaveBeenCalledWith('segredo', 'hash-do-password');
        expect(mockUsers.delete).toHaveBeenCalledWith('user-1');
    });

    it('rejeita palavra-passe incorreta sem eliminar nada', async () => {
        vi.mocked(mockUsers.findById).mockResolvedValue(makeUser() as never);
        vi.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

        await expect(useCase.execute('user-1', 'errada')).rejects.toThrow(UnauthorizedError);
        expect(mockUsers.delete).not.toHaveBeenCalled();
    });

    it('bloqueia a eliminação de contas de administrador', async () => {
        vi.mocked(mockUsers.findById).mockResolvedValue(makeUser({ role: 'ADMIN' }) as never);

        await expect(useCase.execute('user-1', 'segredo')).rejects.toThrow(ForbiddenError);
        expect(mockUsers.delete).not.toHaveBeenCalled();
    });

    it('lança erro se a conta não existe', async () => {
        vi.mocked(mockUsers.findById).mockResolvedValue(null);

        await expect(useCase.execute('nope', 'segredo')).rejects.toThrow(UserNotFoundError);
        expect(mockUsers.delete).not.toHaveBeenCalled();
    });
});
