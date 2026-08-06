import { inject, injectable } from 'tsyringe';
import { AUTH_TOKENS } from '../../../../shared/container/tokens/auth.tokens';
import { EmailVerificationService } from '../../infrastructure/services/EmailVerification.service';
import { VerifyEmailDTO } from '../dtos/VerifyEmail.dto';

export interface VerifyEmailInput extends VerifyEmailDTO {
    userId: string;
}

@injectable()
export class VerifyEmailUseCase {
    constructor(
        @inject(AUTH_TOKENS.EmailVerificationService)
        private readonly verificationService: EmailVerificationService
    ) {}

    async execute(input: VerifyEmailInput) {
        return this.verificationService.verify(input.userId, input.code);
    }
}
