import { inject, injectable } from 'tsyringe';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { IUserRepository } from '../../domain/repositories/IUser.repository';
import { UserNotFoundError } from '../../domain/errors/UserNotFound.error';
import { ForbiddenError } from '../../../../shared/errors/AppError';

/**
 * Suspende ou reativa uma conta (só admin). Contas suspensas mantêm o login
 * bloqueado e as ações da comunidade recusadas mesmo com JWT ainda válido.
 */
@injectable()
export class SetUserActiveUseCase {
    constructor(
        @inject(USER_TOKENS.IUserRepository)
        private readonly userRepository: IUserRepository
    ) {}

    async execute(userId: string, isActive: boolean) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new UserNotFoundError();
        }
        if (user.role === 'ADMIN') {
            throw new ForbiddenError('Não é possível suspender um administrador.');
        }

        const updated = await this.userRepository.update(userId, { isActive });
        return {
            id: updated.id,
            name: updated.name,
            email: updated.email,
            isActive: updated.isActive,
        };
    }
}
