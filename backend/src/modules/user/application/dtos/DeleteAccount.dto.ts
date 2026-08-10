import { z } from 'zod';

export const DeleteAccountSchema = z.object({
    body: z.object({
        password: z.string().min(1, 'Indica a tua palavra-passe'),
    }),
});

export type DeleteAccountDTO = z.infer<typeof DeleteAccountSchema>['body'];
