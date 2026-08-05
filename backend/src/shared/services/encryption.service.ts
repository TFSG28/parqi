import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

export class EncryptionService {
    static encrypt(text: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    static decrypt(text: string): string {
        const parts = text.split(':');
        const iv = Buffer.from(parts.shift()!, 'hex');
        const encryptedText = parts.join(':');
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
