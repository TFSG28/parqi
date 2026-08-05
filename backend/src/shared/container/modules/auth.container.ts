import { container } from 'tsyringe';
import { AUTH_TOKENS } from '../tokens/auth.tokens';

// Services
import { JwtService } from '../../../modules/auth/infrastructure/services/Jwt.service';

// Use Cases
import { LoginUseCase } from '../../../modules/auth/application/usecases/Login.usecase';
import { GetCurrentUserUseCase } from '../../../modules/auth/application/usecases/GetCurrentUser.usecase';

// Controllers
import { AuthController } from '../../../modules/auth/presentation/controllers/auth.controller';

export function setupAuthContainer() {
    // Services (Singleton)
    container.registerSingleton(AUTH_TOKENS.IJwtService, JwtService);

    // Use Cases (Transient)
    container.register(AUTH_TOKENS.LoginUseCase, LoginUseCase);
    container.register(AUTH_TOKENS.GetCurrentUserUseCase, GetCurrentUserUseCase);

    // Controllers (Transient)
    container.register(AUTH_TOKENS.AuthController, AuthController);
}
