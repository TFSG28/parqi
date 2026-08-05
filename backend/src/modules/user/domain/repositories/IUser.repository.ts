import { UserEntity } from '../entities/User.entity';

export interface IUserRepository {
    findById(id: string): Promise<UserEntity | null>;
    findByEmail(email: string): Promise<UserEntity | null>;
    create(data: { name: string; email: string; password: string }): Promise<UserEntity>;
    update(id: string, data: Partial<UserEntity>): Promise<UserEntity>;
    delete(id: string): Promise<void>;
}
