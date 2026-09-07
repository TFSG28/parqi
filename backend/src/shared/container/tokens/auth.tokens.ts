export const AUTH_TOKENS = {
    // Services
    IJwtService: Symbol.for('IJwtService'),
    PasswordResetService: Symbol.for('PasswordResetService'),

    // Use Cases
    LoginUseCase: Symbol.for('LoginUseCase'),
    GetCurrentUserUseCase: Symbol.for('GetCurrentUserUseCase'),

    // Controllers
    AuthController: Symbol.for('AuthController'),
} as const;
