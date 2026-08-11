import cors from 'cors';

/**
 * Em produção, aceita:
 *  • FRONT_URL (domínio do frontend web — ex. parqi.cesar.wearemateria.com)
 *  • Exceção para apps mobile (não enviam Origin header — CORS não se aplica)
 *
 * Em desenvolvimento, aceita localhost:3000 (Next.js) e localhost:19006 (Expo web).
 */
const allowedOrigins = [
    process.env.FRONT_URL || 'https://parqi.cesar.wearemateria.com',
];

export const corsMiddleware = cors({
    origin: process.env.NODE_ENV === 'production'
        ? (origin, callback) => {
            // Apps mobile e ferramentas como Postman não enviam Origin — permitir
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`Origin ${origin} não permitida pelo CORS`));
            }
        }
        : ['http://localhost:3000', 'http://localhost:19006'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With', 'Accept', 'Origin', 'X-CSRF-Token'],
    credentials: true
});
