import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResendCodeUseCase } from './ResendCode.usecase';
import { EmailVerificationService } from '../../infrastructure/services/EmailVerification.service';

describe('ResendCodeUseCase', () => {
    let useCase: ResendCodeUseCase;
    let mockVerification: EmailVerificationService;

    beforeEach(() => {
        mockVerification = {
            verify: vi.fn(),
            resend: vi.fn().mockResolvedValue({ sent: true }),
            sendCode: vi.fn(),
        } as unknown as EmailVerificationService;

        useCase = new ResendCodeUseCase(mockVerification);
    });

    it('delega o reenvio do código ao serviço de verificação', async () => {
        const result = await useCase.execute({ userId: 'user-1' });

        expect(mockVerification.resend).toHaveBeenCalledWith('user-1');
        expect(mockVerification.verify).not.toHaveBeenCalled();
        expect(result).toEqual({ sent: true });
    });

    it('propaga erros do serviço (cooldown/excedeu tentativas)', async () => {
        vi.mocked(mockVerification.resend).mockRejectedValue(new Error('aguarda antes de reenviar') as never);

        await expect(useCase.execute({ userId: 'user-1' })).rejects.toThrow(
            'aguarda antes de reenviar'
        );
    });
});
