import { z } from 'zod';

export const ForgotPasswordSchema = z.object({
    body: z.object({
        email: z.email('Email inválido'),
    }),
});

export type ForgotPasswordDTO = z.infer<typeof ForgotPasswordSchema>['body'];
