import { z } from 'zod';

export const VoteParkingSchema = z.object({
    params: z.object({ id: z.string().uuid('ID inválido') }),
    body: z
        .object({
            value: z.union([z.literal(1), z.literal(-1)]),
            reason: z.string().trim().max(200, 'Motivo demasiado longo').optional(),
        })
        .refine((body) => body.value === 1 || (body.reason !== undefined && body.reason.length > 0), {
            message: 'Indica o motivo do voto negativo',
            path: ['reason'],
        }),
});

export type VoteParkingDTO = z.infer<typeof VoteParkingSchema>['body'];
