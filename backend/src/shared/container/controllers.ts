import { container } from 'tsyringe';
import { AUTH_TOKENS } from './tokens/auth.tokens';
import { USER_TOKENS } from './tokens/user.tokens';

// Controllers
import { AuthController } from '../../modules/auth/presentation/controllers/auth.controller';
import { UserController } from '../../modules/user/presentation/controllers/user.controller';

/**
 * Container Facade - Exports resolved instances
 * Routes import from here, they don't know DI details
 */

export const authController = container.resolve<AuthController>(AUTH_TOKENS.AuthController);
export const userController = container.resolve<UserController>(USER_TOKENS.UserController);
