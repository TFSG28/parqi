import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateUserUseCase } from './CreateUser.usecase';
import { UserAlreadyExistsError } from '../../domain/errors/UserAlreadyExists.error';
import type { IUserRepository } from '../../domain/repositories/IUser.repository';

describe('CreateUserUseCase', () => {
  let createUserUseCase: CreateUserUseCase;
  let mockUserRepository: IUserRepository;

  beforeEach(() => {
    // Criar um mock do repositório
    mockUserRepository = {
      findByEmail: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as IUserRepository;

    // Criar o caso de uso com o mock
    createUserUseCase = new CreateUserUseCase(mockUserRepository);
  });

  it('deve criar um usuário com sucesso', async () => {
    // Arrange (Preparar)
    const userData = {
      name: 'João Silva',
      email: 'joao@example.com',
      password: 'senha123',
      role: 'USER' as const,
    };

    vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(mockUserRepository.create).mockResolvedValue({
      id: '1',
      name: userData.name,
      email: userData.email,
      password: 'hashed_password',
      role: userData.role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Act (Executar)
    const result = await createUserUseCase.execute(userData);

    // Assert (Verificar)
    expect(result).toBeDefined();
    expect(result.email).toBe(userData.email);
    expect(result.name).toBe(userData.name);
    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
    expect(mockUserRepository.create).toHaveBeenCalled();
  });

  it('deve lançar erro se o usuário já existe', async () => {
    // Arrange
    const userData = {
      name: 'João Silva',
      email: 'existente@example.com',
      password: 'senha123',
      role: 'USER' as const,
    };

    vi.mocked(mockUserRepository.findByEmail).mockResolvedValue({
      id: '1',
      name: 'Usuário Existente',
      email: userData.email,
      password: 'hashed',
      role: 'USER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Act & Assert
    await expect(createUserUseCase.execute(userData)).rejects.toThrow(
      UserAlreadyExistsError
    );
    expect(mockUserRepository.create).not.toHaveBeenCalled();
  });

  it('deve validar dados obrigatórios', async () => {
    // Arrange
    const invalidData = {
      name: '',
      email: 'invalido',
      password: '123',
      role: 'USER' as const,
    };

    // Act & Assert
    await expect(createUserUseCase.execute(invalidData)).rejects.toThrow();
  });
});
