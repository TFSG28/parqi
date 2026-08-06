export class UserEntity {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly email: string,
        public readonly password: string,
        public readonly role: 'USER' | 'ADMIN',
        public readonly isActive: boolean,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
        public readonly emailVerified: boolean = false,
        public readonly emailVerificationCode: string | null = null,
        public readonly emailVerificationExpires: Date | null = null,
        public readonly emailVerificationAttempts: number = 0,
        public readonly emailVerificationSentAt: Date | null = null
    ) {}
}
