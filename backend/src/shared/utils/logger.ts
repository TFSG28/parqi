import pino from 'pino';
import pinoHttp from 'pino-http';

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
        }
    } : undefined,
    formatters: {
        level: (label) => {
            return { level: label };
        },
    },
    base: {
        env: process.env.NODE_ENV,
    },
});

export const httpLogger = pinoHttp({
    logger,
    customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
    },
    customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} ${res.statusCode}`;
    },
    customErrorMessage: (req, res, err) => {
        return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
    },
    customAttributeKeys: {
        req: 'request',
        res: 'response',
        err: 'error',
        responseTime: 'duration',
    },
    serializers: {
        req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url,
            correlationId: req.raw.correlationId,
        }),
        res: (res) => ({
            statusCode: res.statusCode,
        }),
    },
});
