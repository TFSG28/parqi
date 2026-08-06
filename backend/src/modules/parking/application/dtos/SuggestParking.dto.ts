import { z } from 'zod';
import { CapacityRangeEnum, ParkingTypeEnum } from './CreateParking.dto';

/**
 * Sugestão da comunidade para complementar/corrigir a informação de um parque.
 * Apenas atributos (sem geometria) — mudanças de localização seguem edição direta.
 */
export const SuggestParkingSchema = z.object({
    params: z.object({ id: z.string().uuid('ID inválido') }),
    body: z
        .object({
            name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(120).optional(),
            description: z.string().trim().max(2000, 'Descrição demasiado longa').nullish(),
            parkingType: ParkingTypeEnum.optional(),
            capacityRange: CapacityRangeEnum.nullish(),
            isFree: z.boolean().nullish(),
            hasPregnantSpaces: z.boolean().nullish(),
            hasDisabledSpaces: z.boolean().nullish(),
            hasEvCharging: z.boolean().nullish(),
            isCovered: z.boolean().nullish(),
            reason: z
                .string()
                .trim()
                .max(500, 'Motivo demasiado longo')
                .optional(),
        })
        .refine((body) => Object.keys(body).filter((k) => k !== 'reason').length > 0, {
            message: 'Indica pelo menos um campo para sugerir',
        }),
});

export type SuggestParkingDTO = z.infer<typeof SuggestParkingSchema>['body'];
