import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VerifyEmailUseCase } from './VerifyEmail.usecase';
import { EmailVerificationService } from '../../infrastructure/services/EmailVerification.service';

describe('VerifyEmailUseCase', () => {
    let useCase: VerifyEmailUseCase;
    let mockVerification: EmailVerificationService;

    beforeEach(() => {
        mockVerification = {
            verify: vi.fn().mockResolvedValue({ verified: true }),
            resend: vi.fn(),
            sendCode: vi.fn(),
        } as unknown as EmailVerificationService;

        useCase = new VerifyEmailUseCase(mockVerification);
    });

    it('delega a verificação (userId + código) ao serviço de verificação', async () => {
        const result = await useCase.execute({ userId: 'user-1', code: '123456' });

        expect(mockVerification.verify).toHaveBeenCalledWith('user-1', '123456');
        expect(result).toEqual({ verified: true });
    });

    it('propaga erros do serviço (código inválido/expirado)', async () => {
        vi.mocked(mockVerification.verify).mockRejectedValue(new Error('código inválido') as never);

        await expect(
            useCase.execute({ userId: 'user-1', code: '000000' })
        ).rejects.toThrow('código inválido');
    });
});
