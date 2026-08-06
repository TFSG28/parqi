import { z } from 'zod';

export const VerifyEmailSchema = z.object({
    body: z.object({
        code: z
            .string()
            .trim()
            .regex(/^\d{6}$/, 'O código tem 6 dígitos'),
    }),
});

export type VerifyEmailDTO = z.infer<typeof VerifyEmailSchema>['body'];
