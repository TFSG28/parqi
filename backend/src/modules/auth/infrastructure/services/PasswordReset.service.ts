import { inject, injectable } from 'tsyringe';
import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { IUserRepository } from '../../../user/domain/repositories/IUser.repository';
import * as mailer from '../../../../lib/mailer';
import { env } from '../../../../config/env';
import { TooManyRequestsError, ValidationError } from '../../../../shared/errors/AppError';
import {
    EMAIL_CODE_LENGTH,
    EMAIL_CODE_MAX_ATTEMPTS,
    EMAIL_CODE_TTL_MS,
    EMAIL_RESEND_INTERVAL_MS,
    hashEmailCode,
    safeEqualHex,
} from '../../../../shared/utils/email-code.util';

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
    );
}

/**
 * Recuperação de palavra-passe por código de 6 dígitos, com o mesmo modelo
 * da verificação de email (sha256, 15 min, 5 tentativas, reenvio 60s).
 * Nunca revela se o email existe: pedidos para contas inexistentes ou
 * demasiado frequentes devolvem silenciosamente sucesso.
 */
@injectable()
export class PasswordResetService {
    constructor(
        @inject(USER_TOKENS.IUserRepository)
        private readonly userRepository: IUserRepository
    ) { }

    async requestReset(email: string): Promise<void> {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            return;
        }

        const last = user.passwordResetSentAt;
        const elapsed = last ? Date.now() - last.getTime() : Number.POSITIVE_INFINITY;
        if (elapsed < EMAIL_RESEND_INTERVAL_MS) {
            // silencioso: não confirmar a existência da conta via timing/erros
            return;
        }

        const code = String(randomInt(0, 1_000_000)).padStart(EMAIL_CODE_LENGTH, '0');
        await this.userRepository.update(user.id, {
            passwordResetCode: hashEmailCode(code),
            passwordResetExpires: new Date(Date.now() + EMAIL_CODE_TTL_MS),
            passwordResetAttempts: 0,
            passwordResetSentAt: new Date(),
        });

        const sent = await mailer.sendEmail(
            user.email,
            'Parqi — recupera a tua palavra-passe',
            `<p>Olá <strong>${escapeHtml(user.name)}</strong>,</p>
             <p>Usa o código abaixo para definir uma palavra-passe nova:</p>
             <p style="font-size:30px;font-weight:800;letter-spacing:8px;text-align:center;color:#0647AC;background:#F0F4FF;border-radius:10px;padding:14px">${code}</p>
             <p>O código expira em <strong>15 minutos</strong>. Se não pediste esta alteração, ignora este email — a tua palavra-passe mantém-se.</p>`
        );

        if (!sent && env.NODE_ENV !== 'production') {
            console.log(`[parqi] Código de recuperação de ${user.email}: ${code}`);
        }
    }

    async reset(email: string, code: string, newPassword: string): Promise<void> {
        const invalid = () =>
            new ValidationError('Código inválido ou expirado. Pede um novo código.');

        const user = await this.userRepository.findByEmail(email);
        if (!user || !user.passwordResetCode || !user.passwordResetExpires) {
            throw invalid();
        }
        if (user.passwordResetAttempts >= EMAIL_CODE_MAX_ATTEMPTS) {
            throw new TooManyRequestsError('Demasiadas tentativas. Pede um novo código.');
        }
        if (user.passwordResetExpires.getTime() < Date.now()) {
            throw invalid();
        }
        if (!safeEqualHex(hashEmailCode(code.trim()), user.passwordResetCode)) {
            await this.userRepository.update(user.id, {
                passwordResetAttempts: user.passwordResetAttempts + 1,
            });
            throw invalid();
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await this.userRepository.update(user.id, {
            password: hashed,
            passwordResetCode: null,
            passwordResetExpires: null,
            passwordResetAttempts: 0,
            passwordResetSentAt: null,
        });
    }
}
