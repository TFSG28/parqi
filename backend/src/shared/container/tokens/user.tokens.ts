export const USER_TOKENS = {
    // Repositories
    IUserRepository: Symbol.for('IUserRepository'),

    // Use Cases
    CreateUserUseCase: Symbol.for('CreateUserUseCase'),

    // Controllers
    UserController: Symbol.for('UserController'),
} as const;
