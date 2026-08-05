import { z } from 'zod';

export const ParkingIdParamsSchema = z.object({
    params: z.object({ id: z.string().uuid('ID inválido') }),
});
