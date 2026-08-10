import { z } from 'zod';
import { ParkingTypeEnum } from './CreateParking.dto';

const bboxPattern = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;

export const QueryParkingSchema = z.object({
    query: z.object({
        bbox: z
            .string()
            .regex(bboxPattern, 'bbox deve ter o formato "minLon,minLat,maxLon,maxLat"')
            .optional(),
        type: ParkingTypeEnum.optional(),
        // Pesquisa por nome (sem bbox: procura em todo o país)
        q: z.string().trim().min(2).max(80).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
});

export type QueryParkingDTO = z.infer<typeof QueryParkingSchema>['query'];
