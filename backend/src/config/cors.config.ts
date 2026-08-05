import cors from 'cors';

const allowedOrigins = [
    process.env.FRONT_URL || 'http://localhost:3000',
];

export const corsMiddleware = cors({
    origin: process.env.NODE_ENV === 'production'
        ? allowedOrigins
        : 'http://localhost:3000',
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With', 'Accept', 'Origin', 'X-CSRF-Token'],
    credentials: true
});
