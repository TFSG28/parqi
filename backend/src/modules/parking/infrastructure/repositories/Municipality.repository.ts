import { randomUUID } from 'node:crypto';
import { injectable } from 'tsyringe';
import { prisma } from '../../../../lib/prisma';
import type {
    IMunicipalityRepository,
    MunicipalityImportData,
} from '../../domain/repositories/IMunicipality.repository';

/**
 * Repositório dos concelhos (CAOP) sobre PostGIS.
 * A coluna de geometria é Unsupported no Prisma → manipulação via raw SQL.
 */
@injectable()
export class MunicipalityRepository implements IMunicipalityRepository {
    async upsertMunicipality(data: MunicipalityImportData): Promise<void> {
        const geojson = JSON.stringify(data.geojson);
        const id = randomUUID();
        await prisma.$executeRaw`
            INSERT INTO "Municipality" (
                "id", "createdAt", "updatedAt", "dic", "name", "distritoIlha",
                "nuts1", "nuts2", "nuts3", "nuts3Cod", "areaHa", "perimetroKm",
                "nFreguesias", "geom"
            ) VALUES (
                ${id}, NOW(), NOW(), ${data.dic}, ${data.name}, ${data.distritoIlha},
                ${data.nuts1}, ${data.nuts2}, ${data.nuts3}, ${data.nuts3Cod},
                ${data.areaHa}, ${data.perimetroKm}, ${data.nFreguesias},
                ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Force2D(ST_GeomFromGeoJSON(${geojson}))), 3))
            )
            ON CONFLICT ("dic") DO UPDATE SET
                "name" = EXCLUDED."name",
                "distritoIlha" = EXCLUDED."distritoIlha",
                "nuts1" = EXCLUDED."nuts1",
                "nuts2" = EXCLUDED."nuts2",
                "nuts3" = EXCLUDED."nuts3",
                "nuts3Cod" = EXCLUDED."nuts3Cod",
                "areaHa" = EXCLUDED."areaHa",
                "perimetroKm" = EXCLUDED."perimetroKm",
                "nFreguesias" = EXCLUDED."nFreguesias",
                "geom" = EXCLUDED."geom",
                "updatedAt" = NOW()
        `;
    }

    async backfillParkingSpots(): Promise<number> {
        const result = await prisma.$executeRaw`
            UPDATE "ParkingSpot" s
            SET "municipalityId" = m."id"
            FROM "Municipality" m
            WHERE s."municipalityId" IS NULL
              AND s."geom" IS NOT NULL
              AND ST_Contains(m."geom", s."geom")
        `;
        return result;
    }

    async count(): Promise<number> {
        const rows = await prisma.$queryRaw<{ count: number }[]>`
            SELECT COUNT(*)::int AS "count" FROM "Municipality"
        `;
        return rows[0]?.count ?? 0;
    }
}
