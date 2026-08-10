import { container } from 'tsyringe';
import { USER_TOKENS } from '../tokens/user.tokens';

// Repositories
import { UserRepository } from '../../../modules/user/infrastructure/repositories/User.repository';

// Use Cases
import { CreateUserUseCase } from '../../../modules/user/application/usecases/CreateUser.usecase';
import { SetUserActiveUseCase } from '../../../modules/user/application/usecases/SetUserActive.usecase';
import { DeleteAccountUseCase } from '../../../modules/user/application/usecases/DeleteAccount.usecase';

// Services
import { PushService } from '../../../modules/user/infrastructure/services/Push.service';

// Controllers
import { UserController } from '../../../modules/user/presentation/controllers/user.controller';

export function setupUserContainer() {
    // Repositories (Singleton)
    container.registerSingleton(USER_TOKENS.IUserRepository, UserRepository);

    // Use Cases (Transient)
    // Services (Singleton)
    container.registerSingleton(USER_TOKENS.PushService, PushService);

    container.register(USER_TOKENS.CreateUserUseCase, CreateUserUseCase);
    container.register(USER_TOKENS.SetUserActiveUseCase, SetUserActiveUseCase);
    container.register(USER_TOKENS.DeleteAccountUseCase, DeleteAccountUseCase);

    // Controllers (Transient)
    container.register(USER_TOKENS.UserController, UserController);
}
