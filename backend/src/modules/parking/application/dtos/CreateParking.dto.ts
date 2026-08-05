import { z } from 'zod';

export const ParkingTypeEnum = z.enum([
    'SURFACE',
    'UNDERGROUND',
    'MULTI_STORY',
    'STREET',
    'OTHER',
]);

export const CapacityRangeEnum = z.enum([
    'RANGE_1_5',
    'RANGE_6_20',
    'RANGE_21_50',
    'RANGE_51_100',
    'RANGE_100_PLUS',
]);

const coordinates = z.tuple([
    z.number().min(-180).max(180, 'Longitude fora do intervalo'),
    z.number().min(-90).max(90, 'Latitude fora do intervalo'),
]);

const position = z.object({
    type: z.literal('Point'),
    coordinates,
});

const closedRing = z
    .array(coordinates)
    .min(4, 'O polígono precisa de pelo menos 4 vértices')
    .refine(
        (ring) => ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1],
        { message: 'O anel do polígono deve estar fechado (primeiro = último vértice)' }
    );

const polygon = z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(closedRing).min(1, 'O polígono precisa de pelo menos um anel'),
});

export const CreateParkingSchema = z.object({
    body: z.object({
        name: z
            .string()
            .trim()
            .min(2, 'Nome deve ter pelo menos 2 caracteres')
            .max(120, 'Nome demasiado longo'),
        description: z.string().trim().max(2000, 'Descrição demasiado longa').optional(),
        geometry: z.discriminatedUnion('type', [position, polygon]),
        parkingType: ParkingTypeEnum,
        capacityRange: CapacityRangeEnum.optional(),
        isFree: z.boolean().optional(),
    }),
});

export type CreateParkingDTO = z.infer<typeof CreateParkingSchema>['body'];
