export const USER_TOKENS = {
    // Repositories
    IUserRepository: Symbol.for('IUserRepository'),

    // Services
    PushService: Symbol.for('PushService'),

    // Use Cases
    CreateUserUseCase: Symbol.for('CreateUserUseCase'),
    SetUserActiveUseCase: Symbol.for('SetUserActiveUseCase'),
    DeleteAccountUseCase: Symbol.for('DeleteAccountUseCase'),

    // Controllers
    UserController: Symbol.for('UserController'),
} as const;
