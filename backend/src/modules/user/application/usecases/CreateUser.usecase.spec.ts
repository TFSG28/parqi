import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateUserUseCase } from './CreateUser.usecase';
import { UserAlreadyExistsError } from '../../domain/errors/UserAlreadyExists.error';
import { EmailVerificationService } from '../../../auth/infrastructure/services/EmailVerification.service';
import type { IUserRepository } from '../../domain/repositories/IUser.repository';

function makeUser(overrides: Record<string, unknown> = {}) {
    return {
        id: '1',
        name: 'João Silva',
        email: 'joao@example.com',
        password: 'hashed_password',
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: false,
        emailVerificationCode: null,
        emailVerificationExpires: null,
        emailVerificationAttempts: 0,
        emailVerificationSentAt: null,
        ...overrides,
    };
}

describe('CreateUserUseCase', () => {
    let createUserUseCase: CreateUserUseCase;
    let mockUserRepository: IUserRepository;
    let mockVerificationService: EmailVerificationService;

    beforeEach(() => {
        mockUserRepository = {
            findByEmail: vi.fn(),
            create: vi.fn(),
            findById: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        } as unknown as IUserRepository;

        mockVerificationService = {
            sendCode: vi.fn().mockResolvedValue(undefined),
        } as unknown as EmailVerificationService;

        createUserUseCase = new CreateUserUseCase(mockUserRepository, mockVerificationService);
    });

    it('deve criar um usuário com sucesso', async () => {
        const userData = {
            name: 'João Silva',
            email: 'joao@example.com',
            password: 'senha123',
            role: 'USER' as const,
        };

        vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
        vi.mocked(mockUserRepository.create).mockResolvedValue(makeUser() as never);

        const result = await createUserUseCase.execute(userData);

        expect(result).toBeDefined();
        expect(result.email).toBe(userData.email);
        expect(result.name).toBe(userData.name);
        expect(result.emailVerified).toBe(false);
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
        expect(mockUserRepository.create).toHaveBeenCalled();
        // o código de verificação é enviado logo após o registo
        expect(mockVerificationService.sendCode).toHaveBeenCalledWith('1');
    });

    it('deve lançar erro se o usuário já existe', async () => {
        const userData = {
            name: 'João Silva',
            email: 'existente@example.com',
            password: 'senha123',
            role: 'USER' as const,
        };

        vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(makeUser({
            email: userData.email,
            name: 'Usuário Existente',
        }) as never);

        await expect(createUserUseCase.execute(userData)).rejects.toThrow(
            UserAlreadyExistsError
        );
        expect(mockUserRepository.create).not.toHaveBeenCalled();
        expect(mockVerificationService.sendCode).not.toHaveBeenCalled();
    });
});
