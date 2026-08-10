import { inject, injectable } from 'tsyringe';
import bcrypt from 'bcryptjs';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { IUserRepository } from '../../domain/repositories/IUser.repository';
import { UserNotFoundError } from '../../domain/errors/UserNotFound.error';
import { ForbiddenError, UnauthorizedError } from '../../../../shared/errors/AppError';

/**
 * Eliminação de conta (RGPD). Exige a palavra-passe atual para impedir
 * eliminação com um JWT roubado. O schema trata do resto: votos e sugestões
 * caem em cascata; contribuições ficam anonimizadas (contributorId -> null).
 */
@injectable()
export class DeleteAccountUseCase {
    constructor(
        @inject(USER_TOKENS.IUserRepository)
        private readonly userRepository: IUserRepository
    ) {}

    async execute(userId: string, password: string): Promise<void> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new UserNotFoundError();
        }
        if (user.role === 'ADMIN') {
            throw new ForbiddenError('Contas de administrador não podem ser eliminadas pela app.');
        }
        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
            throw new UnauthorizedError('Palavra-passe incorreta.');
        }

        await this.userRepository.delete(userId);
    }
}
