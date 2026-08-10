import { z } from 'zod';

export const PushTokenSchema = z.object({
    body: z.object({
        token: z.string().min(10).max(200),
        platform: z.string().max(20).optional(),
    }),
});

export type PushTokenDTO = z.infer<typeof PushTokenSchema>['body'];
