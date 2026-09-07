import { createHash, timingSafeEqual } from 'node:crypto';

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
