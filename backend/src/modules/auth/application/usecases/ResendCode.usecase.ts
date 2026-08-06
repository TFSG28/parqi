import { inject, injectable } from 'tsyringe';
import { AUTH_TOKENS } from '../../../../shared/container/tokens/auth.tokens';
import { EmailVerificationService } from '../../infrastructure/services/EmailVerification.service';

export interface ResendCodeInput {
    userId: string;
}

@injectable()
export class ResendCodeUseCase {
    constructor(
        @inject(AUTH_TOKENS.EmailVerificationService)
        private readonly verificationService: EmailVerificationService
    ) {}

    async execute(input: ResendCodeInput) {
        return this.verificationService.resend(input.userId);
    }
}
