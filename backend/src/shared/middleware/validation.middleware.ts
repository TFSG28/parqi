import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { ValidationError } from '../errors/AppError';

export const validate = (schema: ZodTypeAny) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            // Substitui o body pelos dados validados: campos desconhecidos (ex.: role)
            // são removidos pelo Zod, evitando mass assignment a jusante.
            if (parsed && typeof parsed === 'object' && 'body' in parsed) {
                req.body = (parsed as { body: unknown }).body;
            }
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errors = error.issues.reduce((acc, err) => {
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
