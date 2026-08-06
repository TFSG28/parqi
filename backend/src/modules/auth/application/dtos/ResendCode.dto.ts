import { z } from 'zod';

export const ResendCodeSchema = z.object({
    body: z.object({}).optional(),
});
