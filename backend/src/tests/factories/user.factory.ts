import { UserEntity } from '../../modules/user/domain/entities/User.entity';
import bcrypt from 'bcryptjs';

export class UserFactory {
    static create(overrides?: Partial<UserEntity>): UserEntity {
        return new UserEntity(
            overrides?.id || 'test-user-id',
            overrides?.name || 'Test User',
            overrides?.email || 'test@example.com',
            overrides?.password || bcrypt.hashSync('Test@123', 10),
            overrides?.role ?? 'USER',
            overrides?.isActive ?? true,
            overrides?.createdAt || new Date(),
            overrides?.updatedAt || new Date()
        );
    }

    static createMany(count: number, overrides?: Partial<UserEntity>): UserEntity[] {
        return Array.from({ length: count }, (_, i) =>
            this.create({
                ...overrides,
                id: `test-user-${i}`,
                email: `test${i}@example.com`,
            })
        );
    }
}
