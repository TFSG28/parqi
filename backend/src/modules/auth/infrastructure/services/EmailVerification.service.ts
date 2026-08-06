import { inject, injectable } from 'tsyringe';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { IUserRepository } from '../../../user/domain/repositories/IUser.repository';
import * as mailer from '../../../../lib/mailer';
import { env } from '../../../../config/env';
import { TooManyRequestsError, UnauthorizedError, ValidationError } from '../../../../shared/errors/AppError';

export const EMAIL_CODE_LENGTH = 6;
export const EMAIL_CODE_TTL_MS = 15 * 60 * 1000;
export const EMAIL_CODE_MAX_ATTEMPTS = 5;
export const EMAIL_RESEND_INTERVAL_MS = 60 * 1000;

/** O código nunca é guardado em texto limpo — só o sha256. */
export function hashEmailCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
}

/** Comparação em tempo constante (evita timing attacks num espaço de 10^6 códigos). */
export function safeEqualHex(a: string, b: string): boolean {
    const aBuf = Buffer.from(a, 'hex');
    const bBuf = Buffer.from(b, 'hex');
    if (aBuf.length !== bBuf.length) {
        return false;
    }
    return timingSafeEqual(aBuf, bBuf);
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
    );
}

/**
 * Verificação de email por código de 6 dígitos (anti-bot/anti-spam):
 *  - o código expira em 15 min e há limite de tentativas (5);
 *  - reenvio com intervalo mínimo de 60s;
 *  - em dev sem SMTP configurado, o código sai no log do servidor.
 */
@injectable()
export class EmailVerificationService {
    constructor(
        @inject(USER_TOKENS.IUserRepository)
        private readonly userRepository: IUserRepository
    ) {}

    private generateCode(): string {
        return String(randomInt(0, 1_000_000)).padStart(EMAIL_CODE_LENGTH, '0');
    }

    /** Gera um código novo, guarda o hash e envia por email. */
    async sendCode(userId: string): Promise<void> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            return; // nunca revelar que a conta existe
        }

        const code = this.generateCode();
        const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MS);
        await this.userRepository.update(userId, {
            emailVerificationCode: hashEmailCode(code),
            emailVerificationExpires: expiresAt,
            emailVerificationAttempts: 0,
            emailVerificationSentAt: new Date(),
        });

        const sent = await mailer.sendEmail(
            user.email,
            'Parqi — confirma o teu email',
            `<p>Olá <strong>${escapeHtml(user.name)}</strong>,</p>
             <p>Usa o código abaixo para validar a tua conta:</p>
             <p style="font-size:30px;font-weight:800;letter-spacing:8px;text-align:center;color:#3B6BFF;background:#F0F4FF;border-radius:10px;padding:14px">${code}</p>
             <p>O código expira em <strong>15 minutos</strong>. Se não foste tu, ignora este email.</p>`
        );

        if (!sent && env.NODE_ENV !== 'production') {
            // Sem SMTP em dev: log do código para testar o fluxo
            console.log(`[parqi] Código de verificação de ${user.email}: ${code}`);
        }
    }

    /** Valida o código do utilizador autenticado. */
    async verify(userId: string, code: string): Promise<{ emailVerified: true }> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new UnauthorizedError('Não autenticado');
        }
        if (user.emailVerified) {
            return { emailVerified: true };
        }
        if (!user.emailVerificationCode || !user.emailVerificationExpires) {
            throw new ValidationError('Não existe um código ativo. Pede um novo.');
        }
        if (user.emailVerificationAttempts >= EMAIL_CODE_MAX_ATTEMPTS) {
            throw new TooManyRequestsError('Demasiadas tentativas. Pede um novo código.');
        }
        if (user.emailVerificationExpires.getTime() < Date.now()) {
            throw new ValidationError('O código expirou. Pede um novo.');
        }

        if (!safeEqualHex(hashEmailCode(code.trim()), user.emailVerificationCode)) {
            await this.userRepository.update(userId, {
                emailVerificationAttempts: user.emailVerificationAttempts + 1,
            });
            throw new ValidationError('Código incorreto. Verifica e tenta de novo.');
        }

        await this.userRepository.update(userId, {
            emailVerified: true,
            emailVerificationCode: null,
            emailVerificationExpires: null,
            emailVerificationAttempts: 0,
            emailVerificationSentAt: null,
        });
        return { emailVerified: true };
    }

    /** Reenvio do código com limite de 60s entre envios. */
    async resend(userId: string): Promise<{ resentAt: Date; waitSeconds: number }> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new UnauthorizedError('Não autenticado');
        }
        if (user.emailVerified) {
            return { resentAt: new Date(), waitSeconds: 0 };
        }

        const last = user.emailVerificationSentAt;
        const elapsed = last ? Date.now() - last.getTime() : Number.POSITIVE_INFINITY;
        if (elapsed < EMAIL_RESEND_INTERVAL_MS) {
            const waitSeconds = Math.ceil((EMAIL_RESEND_INTERVAL_MS - elapsed) / 1000);
            throw new TooManyRequestsError(`Aguarda ${waitSeconds}s antes de pedir outro código.`, {
                waitSeconds,
            });
        }

        await this.sendCode(userId);
        return { resentAt: new Date(), waitSeconds: 0 };
    }
}
