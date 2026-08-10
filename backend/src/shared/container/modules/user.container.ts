import { container } from 'tsyringe';
import { USER_TOKENS } from '../tokens/user.tokens';

// Repositories
import { UserRepository } from '../../../modules/user/infrastructure/repositories/User.repository';

// Use Cases
import { CreateUserUseCase } from '../../../modules/user/application/usecases/CreateUser.usecase';
import { SetUserActiveUseCase } from '../../../modules/user/application/usecases/SetUserActive.usecase';

// Controllers
import { UserController } from '../../../modules/user/presentation/controllers/user.controller';

export function setupUserContainer() {
    // Repositories (Singleton)
    container.registerSingleton(USER_TOKENS.IUserRepository, UserRepository);

    // Use Cases (Transient)
    container.register(USER_TOKENS.CreateUserUseCase, CreateUserUseCase);
    container.register(USER_TOKENS.SetUserActiveUseCase, SetUserActiveUseCase);

    // Controllers (Transient)
    container.register(USER_TOKENS.UserController, UserController);
}
