export const AUTH_TOKENS = {
    // Services
    IJwtService: Symbol.for('IJwtService'),
    EmailVerificationService: Symbol.for('EmailVerificationService'),
    PasswordResetService: Symbol.for('PasswordResetService'),

    // Use Cases
    LoginUseCase: Symbol.for('LoginUseCase'),
    GetCurrentUserUseCase: Symbol.for('GetCurrentUserUseCase'),
    VerifyEmailUseCase: Symbol.for('VerifyEmailUseCase'),
    ResendCodeUseCase: Symbol.for('ResendCodeUseCase'),

    // Controllers
    AuthController: Symbol.for('AuthController'),
} as const;
