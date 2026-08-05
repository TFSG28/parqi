import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../errors/AppError';

export const validate = (schema: AnyZodObject) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errors = error.errors.reduce((acc, err) => {
                    const field = err.path.join('.');
                    acc[field] = err.message;
                    return acc;
                }, {} as Record<string, string>);
                
                next(new ValidationError('Dados inválidos', errors));
            } else {
                next(error);
            }
        }
    };
};
