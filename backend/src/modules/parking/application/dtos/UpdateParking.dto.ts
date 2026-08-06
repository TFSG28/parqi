import { z } from 'zod';
import { CapacityRangeEnum, ParkingTypeEnum } from './CreateParking.dto';

const coordinates = z.tuple([
    z.number().min(-180).max(180),
    z.number().min(-90).max(90),
]);

const position = z.object({ type: z.literal('Point'), coordinates });

const closedRing = z
    .array(coordinates)
    .min(4)
    .refine(
        (ring) => ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1],
        { message: 'O anel do polígono deve estar fechado' }
    );

const polygon = z.object({ type: z.literal('Polygon'), coordinates: z.array(closedRing).min(1) });

const line = z.object({
    type: z.literal('LineString'),
    coordinates: z.array(coordinates).min(2).max(100),
});

export const UpdateParkingSchema = z.object({
    params: z.object({ id: z.string().uuid('ID inválido') }),
    body: z
        .object({
            name: z.string().trim().min(2).max(120).optional(),
            description: z.string().trim().max(2000).nullish(),
            geometry: z.discriminatedUnion('type', [position, polygon, line]).optional(),
            parkingType: ParkingTypeEnum.optional(),
            capacityRange: CapacityRangeEnum.nullish(),
            isFree: z.boolean().nullish(),
            hasPregnantSpaces: z.boolean().nullish(),
            hasDisabledSpaces: z.boolean().nullish(),
            hasEvCharging: z.boolean().nullish(),
            isCovered: z.boolean().nullish(),
        })
        .refine((body) => Object.keys(body).length > 0, {
            message: 'Sem campos para atualizar',
        }),
});

export type UpdateParkingDTO = z.infer<typeof UpdateParkingSchema>;
