export class UserEntity {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly email: string,
        public readonly password: string,
        public readonly isActive: boolean,
        public readonly createdAt: Date,
        public readonly updatedAt: Date
    ) {}
}
