import { container } from 'tsyringe';
import { AUTH_TOKENS } from '../tokens/auth.tokens';

// Services
import { JwtService } from '../../../modules/auth/infrastructure/services/Jwt.service';
import { EmailVerificationService } from '../../../modules/auth/infrastructure/services/EmailVerification.service';

// Use Cases
import { LoginUseCase } from '../../../modules/auth/application/usecases/Login.usecase';
import { GetCurrentUserUseCase } from '../../../modules/auth/application/usecases/GetCurrentUser.usecase';
import { VerifyEmailUseCase } from '../../../modules/auth/application/usecases/VerifyEmail.usecase';
import { ResendCodeUseCase } from '../../../modules/auth/application/usecases/ResendCode.usecase';

// Controllers
import { AuthController } from '../../../modules/auth/presentation/controllers/auth.controller';

export function setupAuthContainer() {
    // Services (Singleton)
    container.registerSingleton(AUTH_TOKENS.IJwtService, JwtService);
    container.registerSingleton(AUTH_TOKENS.EmailVerificationService, EmailVerificationService);

    // Use Cases (Transient)
    container.register(AUTH_TOKENS.LoginUseCase, LoginUseCase);
    container.register(AUTH_TOKENS.GetCurrentUserUseCase, GetCurrentUserUseCase);
    container.register(AUTH_TOKENS.VerifyEmailUseCase, VerifyEmailUseCase);
    container.register(AUTH_TOKENS.ResendCodeUseCase, ResendCodeUseCase);

    // Controllers (Transient)
    container.register(AUTH_TOKENS.AuthController, AuthController);
}
