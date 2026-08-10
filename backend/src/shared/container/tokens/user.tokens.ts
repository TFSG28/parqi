export const USER_TOKENS = {
    // Repositories
    IUserRepository: Symbol.for('IUserRepository'),

    // Use Cases
    CreateUserUseCase: Symbol.for('CreateUserUseCase'),
    SetUserActiveUseCase: Symbol.for('SetUserActiveUseCase'),

    // Controllers
    UserController: Symbol.for('UserController'),
} as const;
