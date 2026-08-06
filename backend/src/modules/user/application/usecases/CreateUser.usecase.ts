import { inject, injectable } from 'tsyringe';
import bcrypt from 'bcryptjs';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { AUTH_TOKENS } from '../../../../shared/container/tokens/auth.tokens';
import { IUserRepository } from '../../domain/repositories/IUser.repository';
import { CreateUserDTO } from '../dtos/CreateUser.dto';
import { UserAlreadyExistsError } from '../../domain/errors/UserAlreadyExists.error';
import { EmailVerificationService } from '../../../auth/infrastructure/services/EmailVerification.service';

@injectable()
export class CreateUserUseCase {
    constructor(
        @inject(USER_TOKENS.IUserRepository)
        private userRepository: IUserRepository,
        @inject(AUTH_TOKENS.EmailVerificationService)
        private readonly emailVerificationService: EmailVerificationService
    ) {}

    async execute(data: CreateUserDTO) {
        const existingUser = await this.userRepository.findByEmail(data.email);

        if (existingUser) {
            throw new UserAlreadyExistsError();
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const user = await this.userRepository.create({
            ...data,
            password: hashedPassword,
        });

        // Envia o código de verificação de email (a conta fica por validar até
        // o utilizador introduzir o código recebido).
        await this.emailVerificationService.sendCode(user.id);

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            isActive: user.isActive,
            emailVerified: false,
            createdAt: user.createdAt,
        };
    }
}
