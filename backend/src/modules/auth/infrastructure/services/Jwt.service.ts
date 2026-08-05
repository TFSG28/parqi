import { injectable } from 'tsyringe';
import jwt from 'jsonwebtoken';
import { IJwtService } from '../../domain/services/IJwt.service';

@injectable()
export class JwtService implements IJwtService {
    private readonly secret: string;
    private readonly expiresIn: jwt.SignOptions['expiresIn'];

    constructor() {
        this.secret = process.env.JWT_SECRET || 'default-secret';
        this.expiresIn = '7d';
    }

    generateToken(payload: Record<string, unknown>): string {
        return jwt.sign(payload, this.secret, {
            expiresIn: this.expiresIn,
        });
    }

    verifyToken(token: string): Record<string, unknown> {
        return jwt.verify(token, this.secret) as Record<string, unknown>;
    }
}
