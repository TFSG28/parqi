import { inject, injectable } from 'tsyringe';
import bcrypt from 'bcryptjs';
import { AUTH_TOKENS } from '../../../../shared/container/tokens/auth.tokens';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { IUserRepository } from '../../../user/domain/repositories/IUser.repository';
import { IJwtService } from '../../domain/services/IJwt.service';
import { LoginDTO } from '../dtos/Login.dto';
import { UnauthorizedError } from '../../../../shared/errors/AppError';

@injectable()
export class LoginUseCase {
    constructor(
        @inject(USER_TOKENS.IUserRepository)
        private readonly userRepository: IUserRepository,
        @inject(AUTH_TOKENS.IJwtService)
        private readonly jwtService: IJwtService
    ) {}

    async execute(data: LoginDTO) {
        const user = await this.userRepository.findByEmail(data.email);

        if (!user) {
            throw new UnauthorizedError('Credenciais inválidas');
        }

        if (!user.isActive) {
            throw new UnauthorizedError('Usuário inativo');
        }

        const isPasswordValid = await bcrypt.compare(data.password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedError('Credenciais inválidas');
        }

        const token = this.jwtService.generateToken({
            userId: user.id,
            email: user.email,
        });

        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        };
    }
}
