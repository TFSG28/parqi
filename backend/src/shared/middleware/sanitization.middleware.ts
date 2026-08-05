import { Request, Response, NextFunction } from 'express';
import xss from 'xss';

const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
        return xss(value.trim());
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (value && typeof value === 'object') {
        return Object.keys(value).reduce((acc, key) => {
            acc[key] = sanitizeValue(value[key]);
            return acc;
        }, {} as any);
    }
    return value;
};

export const sanitizationMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.body) {
        req.body = sanitizeValue(req.body);
    }
    // Express 5: req.query is a read-only getter, so it can't be reassigned.
    // Override it with a sanitized data property instead.
    if (req.query) {
        Object.defineProperty(req, 'query', {
            value: sanitizeValue(req.query),
            writable: true,
            configurable: true,
            enumerable: true,
        });
    }
    if (req.params) {
        req.params = sanitizeValue(req.params);
    }
    next();
};
