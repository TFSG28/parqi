import { injectable } from 'tsyringe';
import { prisma } from '../../../../lib/prisma';
import { IUserRepository } from '../../domain/repositories/IUser.repository';
import { UserEntity } from '../../domain/entities/User.entity';

@injectable()
export class UserRepository implements IUserRepository {
    async findById(id: string): Promise<UserEntity | null> {
        const user = await prisma.user.findUnique({
            where: { id },
        });

        if (!user) return null;

        return new UserEntity(
            user.id,
            user.name,
            user.email,
            user.password,
            user.role,
            user.isActive,
            user.createdAt,
            user.updatedAt
        );
    }

    async findByEmail(email: string): Promise<UserEntity | null> {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) return null;

        return new UserEntity(
            user.id,
            user.name,
            user.email,
            user.password,
            user.role,
            user.isActive,
            user.createdAt,
            user.updatedAt
        );
    }

    async create(data: { name: string; email: string; password: string }): Promise<UserEntity> {
        const user = await prisma.user.create({
            data,
        });

        return new UserEntity(
            user.id,
            user.name,
            user.email,
            user.password,
            user.role,
            user.isActive,
            user.createdAt,
            user.updatedAt
        );
    }

    async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
        const user = await prisma.user.update({
            where: { id },
            data,
        });

        return new UserEntity(
            user.id,
            user.name,
            user.email,
            user.password,
            user.role,
            user.isActive,
            user.createdAt,
            user.updatedAt
        );
    }

    async delete(id: string): Promise<void> {
        await prisma.user.delete({
            where: { id },
        });
    }
}
