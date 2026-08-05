import { inject, injectable } from 'tsyringe';
import bcrypt from 'bcryptjs';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { IUserRepository } from '../../domain/repositories/IUser.repository';
import { CreateUserDTO } from '../dtos/CreateUser.dto';
import { UserAlreadyExistsError } from '../../domain/errors/UserAlreadyExists.error';

@injectable()
export class CreateUserUseCase {
    constructor(
        @inject(USER_TOKENS.IUserRepository)
        private userRepository: IUserRepository
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

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            isActive: user.isActive,
            createdAt: user.createdAt,
        };
    }
}
