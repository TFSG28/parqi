import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
    EmailVerificationService,
    EMAIL_CODE_MAX_ATTEMPTS,
    EMAIL_CODE_TTL_MS,
    hashEmailCode,
} from './EmailVerification.service';
import { TooManyRequestsError, ValidationError } from '../../../../shared/errors/AppError';
import type { IUserRepository } from '../../../user/domain/repositories/IUser.repository';
import * as mailer from '../../../../lib/mailer';

function makeUser(overrides: Record<string, unknown> = {}) {
    return {
        id: 'user-1',
        name: 'João Silva',
        email: 'joao@example.com',
        emailVerified: false,
        emailVerificationCode: hashEmailCode('123456'),
        emailVerificationExpires: new Date(Date.now() + EMAIL_CODE_TTL_MS),
        emailVerificationAttempts: 0,
        emailVerificationSentAt: new Date(Date.now() - 2 * 60 * 1000),
        ...overrides,
    } as never;
}

describe('EmailVerificationService', () => {
    let service: EmailVerificationService;
    let mockRepo: IUserRepository;
    let sendEmailSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        // spy no namespace (o serviço usa mailer.sendEmail)
        sendEmailSpy = vi.spyOn(mailer, 'sendEmail').mockResolvedValue(true);

        mockRepo = {
            findById: vi.fn(),
            findByEmail: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        } as unknown as IUserRepository;
        service = new EmailVerificationService(mockRepo);
    });

    afterEach(() => {
        sendEmailSpy.mockRestore();
    });

    it('sendCode guarda o hash do código e envia o email', async () => {
        vi.mocked(mockRepo.findById).mockResolvedValue(makeUser());
        await service.sendCode('user-1');

        expect(sendEmailSpy).toHaveBeenCalledWith(
            'joao@example.com',
            expect.stringContaining('confirma'),
            expect.stringContaining('código')
        );
        const updateCall = vi.mocked(mockRepo.update).mock.calls[0];
        expect(updateCall[0]).toBe('user-1');
        const data = updateCall[1];
        expect(typeof data.emailVerificationCode).toBe('string');
        expect(data.emailVerificationCode).toMatch(/^[0-9a-f]{64}$/); // sha256
        expect(data.emailVerificationAttempts).toBe(0);
        expect((data.emailVerificationExpires as Date).getTime()).toBeGreaterThan(Date.now());
    });

    it('sendCode não revela que a conta não existe', async () => {
        vi.mocked(mockRepo.findById).mockResolvedValue(null);
        await expect(service.sendCode('user-inexistente')).resolves.toBeUndefined();
        expect(sendEmailSpy).not.toHaveBeenCalled();
    });

    it('verify valida o código correto e limpa os campos', async () => {
        vi.mocked(mockRepo.findById).mockResolvedValue(makeUser());
        const result = await service.verify('user-1', '123456');

        expect(result).toEqual({ emailVerified: true });
        const data = vi.mocked(mockRepo.update).mock.calls[0][1];
        expect(data.emailVerified).toBe(true);
        expect(data.emailVerificationCode).toBeNull();
        expect(data.emailVerificationExpires).toBeNull();
    });

    it('verify rejeita código errado e incrementa tentativas', async () => {
        vi.mocked(mockRepo.findById).mockResolvedValue(makeUser());
        await expect(service.verify('user-1', '000000')).rejects.toThrow(ValidationError);
        expect(vi.mocked(mockRepo.update).mock.calls[0][1]).toEqual(
            expect.objectContaining({ emailVerificationAttempts: 1 })
        );
    });

    it('verify rejeita código expirado', async () => {
        vi.mocked(mockRepo.findById).mockResolvedValue(
            makeUser({ emailVerificationExpires: new Date(Date.now() - 1000) })
        );
        await expect(service.verify('user-1', '123456')).rejects.toThrow(/expirou/);
    });

    it('verify bloqueia após demasiadas tentativas', async () => {
        vi.mocked(mockRepo.findById).mockResolvedValue(
            makeUser({ emailVerificationAttempts: EMAIL_CODE_MAX_ATTEMPTS })
        );
        await expect(service.verify('user-1', '123456')).rejects.toThrow(TooManyRequestsError);
    });

    it('resend bloqueia dentro de 60s com waitSeconds em details', async () => {
        vi.mocked(mockRepo.findById).mockResolvedValue(
            makeUser({ emailVerificationSentAt: new Date() })
        );
        const error: TooManyRequestsError | null = await service.resend('user-1').then(
            () => null,
            (e: TooManyRequestsError) => e
        );
        expect(error).toBeInstanceOf(TooManyRequestsError);
        expect(error!.details?.waitSeconds).toBeGreaterThan(0);
        expect(error!.details?.waitSeconds).toBeLessThanOrEqual(60);
    });

    it('resend envia novo código após o intervalo', async () => {
        vi.mocked(mockRepo.findById).mockResolvedValue(
            makeUser({ emailVerificationSentAt: new Date(Date.now() - 120 * 1000) })
        );
        const result = await service.resend('user-1');
        expect(result.waitSeconds).toBe(0);
        expect(sendEmailSpy).toHaveBeenCalled();
    });
});
