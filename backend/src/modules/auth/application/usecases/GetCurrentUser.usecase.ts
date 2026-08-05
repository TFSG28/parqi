import { inject, injectable } from 'tsyringe';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { IUserRepository } from '../../../user/domain/repositories/IUser.repository';
import { NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class GetCurrentUserUseCase {
    constructor(
        @inject(USER_TOKENS.IUserRepository)
        private readonly userRepository: IUserRepository
    ) {}

    async execute(userId: string) {
        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new NotFoundError('Usuário não encontrado');
        }

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            isActive: user.isActive,
        };
    }
}
