import { z } from 'zod';

export const SetUserActiveSchema = z.object({
    body: z.object({
        isActive: z.boolean(),
    }),
});

export type SetUserActiveDTO = z.infer<typeof SetUserActiveSchema>['body'];
