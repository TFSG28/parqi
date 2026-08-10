import { z } from 'zod';

export const ResetPasswordSchema = z.object({
    body: z.object({
        email: z.email('Email inválido'),
        code: z.string().regex(/^\d{6}$/, 'O código tem 6 dígitos'),
        password: z.string().min(6, 'A palavra-passe deve ter pelo menos 6 caracteres'),
    }),
});

export type ResetPasswordDTO = z.infer<typeof ResetPasswordSchema>['body'];
