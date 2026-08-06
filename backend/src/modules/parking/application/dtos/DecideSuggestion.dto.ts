import { z } from 'zod';

export const DecideSuggestionSchema = z.object({
    params: z.object({ id: z.string().uuid('ID inválido') }),
    body: z.object({
        action: z.enum(['APPROVE', 'REJECT']),
        reason: z.string().trim().max(500, 'Motivo demasiado longo').optional(),
    }),
});

export type DecideSuggestionDTO = z.infer<typeof DecideSuggestionSchema>['body'];
