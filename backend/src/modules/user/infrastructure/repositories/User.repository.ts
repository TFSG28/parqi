import { injectable } from 'tsyringe';
import { prisma } from '../../../../lib/prisma';
import { IUserRepository } from '../../domain/repositories/IUser.repository';
import { UserEntity } from '../../domain/entities/User.entity';

function toEntity(user: {
    id: string;
    name: string;
    email: string;
    password: string;
    role: 'USER' | 'ADMIN';
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    emailVerified: boolean;
    emailVerificationCode: string | null;
    emailVerificationExpires: Date | null;
    emailVerificationAttempts: number;
    emailVerificationSentAt: Date | null;
    passwordResetCode: string | null;
    passwordResetExpires: Date | null;
    passwordResetAttempts: number;
    passwordResetSentAt: Date | null;
    pushToken: string | null;
}): UserEntity {
    return new UserEntity(
        user.id,
        user.name,
        user.email,
        user.password,
        user.role,
        user.isActive,
        user.createdAt,
        user.updatedAt,
        user.emailVerified,
        user.emailVerificationCode,
        user.emailVerificationExpires,
        user.emailVerificationAttempts,
        user.emailVerificationSentAt,
        user.passwordResetCode,
        user.passwordResetExpires,
        user.passwordResetAttempts,
        user.passwordResetSentAt,
        user.pushToken
    );
}

@injectable()
export class UserRepository implements IUserRepository {
    async findById(id: string): Promise<UserEntity | null> {
        const user = await prisma.user.findUnique({ where: { id } });
        return user ? toEntity(user) : null;
    }

    async findByEmail(email: string): Promise<UserEntity | null> {
        const user = await prisma.user.findUnique({ where: { email } });
        return user ? toEntity(user) : null;
    }

    async create(data: { name: string; email: string; password: string }): Promise<UserEntity> {
        // Sem verificação de email obrigatória: a conta já nasce validada.
        const user = await prisma.user.create({ data: { ...data, emailVerified: true } });
        return toEntity(user);
    }

    async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
        const user = await prisma.user.update({ where: { id }, data });
        return toEntity(user);
    }

    async delete(id: string): Promise<void> {
        await prisma.user.delete({ where: { id } });
    }
}
