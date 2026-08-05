import { Request } from 'express';

export function getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
}

export function getUserAgent(req: Request): string {
    return req.headers['user-agent'] || 'unknown';
}
