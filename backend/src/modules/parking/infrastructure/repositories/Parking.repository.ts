import { injectable } from 'tsyringe';
import { Prisma } from '../../../../generated/prisma/client';
import { prisma } from '../../../../lib/prisma';
import type {
    CreateParkingRepositoryData,
    IParkingRepository,
    ParkingListFilters,
    UpdateParkingRepositoryData,
    UserContributionStats,
} from '../../domain/repositories/IParking.repository';
import type {
    ContributionStatus,
    DataSource,
    GeoJSONGeometry,
    ParkingGeometryInput,
    ParkingSpotEntity,
    ParkingVoteEntity,
} from '../../domain/entities/ParkingSpot.entity';
import { InvalidParkingActionError } from '../../domain/errors/InvalidParkingAction.error';

const SPOT_SELECT = {
    id: true,
    name: true,
    description: true,
    latitude: true,
    longitude: true,
    geometryType: true,
    parkingType: true,
    capacityRange: true,
    isFree: true,
    hasPregnantSpaces: true,
    hasDisabledSpaces: true,
    hasEvCharging: true,
    isCovered: true,
    source: true,
    externalId: true,
    status: true,
    trustScore: true,
    requiresReview: true,
    duplicateOfId: true,
    contributorId: true,
    createdAt: true,
    updatedAt: true,
} as const;

type SpotRow = Prisma.ParkingSpotGetPayload<{ select: typeof SPOT_SELECT }>;

/** Tipo do callback de $transaction do client estendido (com extensions). */
interface GeometryTransaction {
    $executeRaw: Prisma.TransactionClient['$executeRaw'];
    $queryRaw: Prisma.TransactionClient['$queryRaw'];
}

function toEntity(row: SpotRow): ParkingSpotEntity {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        latitude: row.latitude,
        longitude: row.longitude,
        geometryType: row.geometryType,
        parkingType: row.parkingType,
        capacityRange: row.capacityRange,
        isFree: row.isFree,
        hasPregnantSpaces: row.hasPregnantSpaces,
        hasDisabledSpaces: row.hasDisabledSpaces,
        hasEvCharging: row.hasEvCharging,
        isCovered: row.isCovered,
        source: row.source,
        externalId: row.externalId,
        status: row.status,
        trustScore: row.trustScore,
        requiresReview: row.requiresReview,
        duplicateOfId: row.duplicateOfId,
        contributorId: row.contributorId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

/** Escreve a geometria (point/polygon/line) nas colunas PostGIS e atualiza lat/lng. */
async function applyGeometry(
    tx: GeometryTransaction,
    id: string,
    geometry: ParkingGeometryInput
): Promise<void> {
    if (geometry.type === 'Point') {
        const [longitude, latitude] = geometry.coordinates;
        await tx.$executeRaw`
            UPDATE "ParkingSpot"
            SET "geom" = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326),
                "boundary" = NULL,
                "path" = NULL,
                "latitude" = ${latitude},
                "longitude" = ${longitude}
            WHERE "id" = ${id}
        `;
        return;
    }

    const geojson = JSON.stringify(geometry);
    // Validação no PostGIS: polígonos auto-intersecionados/degenerados dariam 500
    // na coluna geometry(...,4326) - rejeitamos com 400 ("não há lixo na BD").
    const validation = await tx.$queryRaw<{ valid: boolean; simple: boolean; hasArea: boolean; length: number }[]>`
        SELECT ST_IsValid(ST_Force2D(ST_GeomFromGeoJSON(${geojson}))) AS valid,
               ST_IsSimple(ST_Force2D(ST_GeomFromGeoJSON(${geojson}))) AS simple,
               ST_Area(ST_Force2D(ST_GeomFromGeoJSON(${geojson}))) > 0 AS "hasArea",
               ST_Length(ST_Force2D(ST_GeomFromGeoJSON(${geojson}))::geography) AS length
    `;
    if (!validation[0]?.valid) {
        throw new InvalidParkingActionError('Geometria inválida (auto-intersecionada ou degenerada)');
    }
    if (geometry.type === 'Polygon' && !validation[0]?.hasArea) {
        throw new InvalidParkingActionError('Polígono inválido (sem área)');
    }
    if (geometry.type === 'LineString') {
        if (!validation[0]?.simple) {
            throw new InvalidParkingActionError('A linha não pode cruzar-se a si própria');
        }
        // ST_Length numa geometria 4326 devolve graus; ::geography devolve metros.
        const lengthMeters = (validation[0]?.length ?? 0);
        if (lengthMeters < 3) {
            throw new InvalidParkingActionError('A linha é demasiado curta (mínimo 3 metros)');
        }
        if (lengthMeters > 2000) {
            throw new InvalidParkingActionError('A linha é demasiado longa (máximo 2 km)');
        }
        await tx.$executeRaw`
            UPDATE "ParkingSpot"
            SET "path" = ST_Force2D(ST_GeomFromGeoJSON(${geojson})),
                "boundary" = NULL,
                "geom" = ST_PointOnSurface(ST_Force2D(ST_GeomFromGeoJSON(${geojson}))),
                "latitude" = ST_Y(ST_PointOnSurface(ST_Force2D(ST_GeomFromGeoJSON(${geojson})))),
                "longitude" = ST_X(ST_PointOnSurface(ST_Force2D(ST_GeomFromGeoJSON(${geojson}))))
            WHERE "id" = ${id}
        `;
        return;
    }

    await tx.$executeRaw`
        UPDATE "ParkingSpot"
        SET "boundary" = sub.boundary,
            "path" = NULL,
            "geom" = ST_PointOnSurface(sub.boundary),
            "latitude" = ST_Y(ST_PointOnSurface(sub.boundary)),
            "longitude" = ST_X(ST_PointOnSurface(sub.boundary))
        FROM (
            SELECT ST_MakeValid(ST_Force2D(ST_GeomFromGeoJSON(${geojson}))) AS boundary
        ) AS sub
        WHERE "ParkingSpot"."id" = ${id}
    `;
}

@injectable()
export class ParkingRepository implements IParkingRepository {
    async create(data: CreateParkingRepositoryData): Promise<ParkingSpotEntity> {
        return prisma.$transaction(async (tx) => {
            const spot = await tx.parkingSpot.create({
                data: {
                    name: data.name,
                    description: data.description,
                    geometryType: data.geometry.type === 'Point' ? 'POINT' : data.geometry.type === 'LineString' ? 'LINE' : 'POLYGON',
                    parkingType: data.parkingType,
                    capacityRange: data.capacityRange,
                    isFree: data.isFree,
                    hasPregnantSpaces: data.hasPregnantSpaces ?? null,
                    hasDisabledSpaces: data.hasDisabledSpaces ?? null,
                    hasEvCharging: data.hasEvCharging ?? null,
                    isCovered: data.isCovered ?? null,
                    source: data.source,
                    externalId: data.externalId ?? null,
                    status: data.status,
                    trustScore: data.trustScore,
                    requiresReview: data.requiresReview ?? false,
                    contributorId: data.contributorId ?? null,
                    latitude: null,
                    longitude: null,
                },
                select: SPOT_SELECT,
            });

            await applyGeometry(tx, spot.id, data.geometry);

            const updated = await tx.parkingSpot.findUniqueOrThrow({
                where: { id: spot.id },
                select: SPOT_SELECT,
            });
            return toEntity(updated);
        });
    }

    async findById(id: string): Promise<ParkingSpotEntity | null> {
        const spot = await prisma.parkingSpot.findUnique({ where: { id }, select: SPOT_SELECT });
        return spot ? toEntity(spot) : null;
    }

    async findByExternalId(source: DataSource, externalId: string): Promise<ParkingSpotEntity | null> {
        const spot = await prisma.parkingSpot.findUnique({
            where: { source_externalId: { source, externalId } },
            select: SPOT_SELECT,
        });
        return spot ? toEntity(spot) : null;
    }

    async findNearby(
        latitude: number,
        longitude: number,
        radiusMeters: number,
        excludeStatuses: ContributionStatus[] = ['REJECTED']
    ): Promise<ParkingSpotEntity[]> {
        const rows = await prisma.$queryRaw<{ id: string }[]>`
            SELECT "id"
            FROM "ParkingSpot"
            WHERE "geom" IS NOT NULL
              AND ST_DWithin(
                    "geom"::geography,
                    ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
                    ${radiusMeters}
                  )
              AND "status" NOT IN (${Prisma.join(excludeStatuses)})
            LIMIT 20
        `;
        if (rows.length === 0) {
            return [];
        }
        return this.findByIds(rows.map((row) => row.id));
    }

    async list(
        filters: ParkingListFilters
    ): Promise<{ items: (ParkingSpotEntity & { geometry: GeoJSONGeometry | null })[]; total: number }> {
        const conditions: Prisma.Sql[] = [Prisma.sql`"status" IN (${Prisma.join(filters.statuses)})`];

        if (filters.bbox) {
            conditions.push(
                Prisma.sql`"geom" && ST_MakeEnvelope(${filters.bbox.minLon}, ${filters.bbox.minLat}, ${filters.bbox.maxLon}, ${filters.bbox.maxLat}, 4326)`
            );
        }
        if (filters.parkingType) {
            conditions.push(Prisma.sql`"parkingType" = ${filters.parkingType}`);
        }
        if (filters.source) {
            conditions.push(Prisma.sql`"source" = ${filters.source}`);
        }
        if (filters.requiresReview !== undefined) {
            conditions.push(Prisma.sql`"requiresReview" = ${filters.requiresReview}`);
        }

        const where = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
        const skip = (filters.page - 1) * filters.limit;

        const [totalRows, idRows] = await Promise.all([
            prisma.$queryRaw<{ total: number }[]>`
                SELECT COUNT(*)::int AS total FROM "ParkingSpot" ${where}
            `,
            prisma.$queryRaw<{ id: string }[]>`
                SELECT "id" FROM "ParkingSpot" ${where}
                ORDER BY "updatedAt" DESC
                LIMIT ${filters.limit} OFFSET ${skip}
            `,
        ]);

        const items = idRows.length > 0 ? await this.findByIds(idRows.map((row) => row.id)) : [];

        if (items.length > 0) {
            const geoRows = await prisma.$queryRaw<{ id: string; geojson: string | null }[]>`
                SELECT "id", COALESCE(
                    CASE WHEN "boundary" IS NOT NULL THEN ST_AsGeoJSON("boundary") END,
                    CASE WHEN "path" IS NOT NULL THEN ST_AsGeoJSON("path") END,
                    CASE WHEN "geom" IS NOT NULL THEN ST_AsGeoJSON("geom") END
                ) AS "geojson"
                FROM "ParkingSpot"
                WHERE "id" IN (${Prisma.join(idRows.map((row) => row.id))})
            `;
            const geometryById = new Map(
                geoRows.map((row) => [
                    row.id,
                    row.geojson ? (JSON.parse(row.geojson) as GeoJSONGeometry) : null,
                ])
            );
            return {
                items: items.map((item) => ({ ...item, geometry: geometryById.get(item.id) ?? null })),
                total: totalRows[0]?.total ?? 0,
            };
        }

        return {
            items: items.map((item) => ({ ...item, geometry: null })),
            total: totalRows[0]?.total ?? 0,
        };
    }

    async getGeometry(id: string): Promise<GeoJSONGeometry | null> {
        const rows = await prisma.$queryRaw<{ geojson: string | null }[]>`
            SELECT COALESCE(
                CASE WHEN "boundary" IS NOT NULL THEN ST_AsGeoJSON("boundary") END,
                CASE WHEN "path" IS NOT NULL THEN ST_AsGeoJSON("path") END,
                CASE WHEN "geom" IS NOT NULL THEN ST_AsGeoJSON("geom") END
            ) AS "geojson"
            FROM "ParkingSpot"
            WHERE "id" = ${id}
        `;
        const geojson = rows[0]?.geojson;
        if (!geojson) {
            return null;
        }
        return JSON.parse(geojson) as GeoJSONGeometry;
    }

    async update(id: string, data: UpdateParkingRepositoryData): Promise<ParkingSpotEntity | null> {
        const { geometry, ...rest } = data;
        const exists = await prisma.parkingSpot.findUnique({ where: { id }, select: { id: true } });
        if (!exists) {
            return null;
        }

        await prisma.$transaction(async (tx) => {
            if (Object.keys(rest).length > 0) {
                await tx.parkingSpot.update({
                    where: { id },
                    data: {
                        ...(rest.name !== undefined && { name: rest.name }),
                        ...(rest.description !== undefined && { description: rest.description }),
                        ...(rest.parkingType !== undefined && { parkingType: rest.parkingType }),
                        ...(rest.capacityRange !== undefined && { capacityRange: rest.capacityRange }),
                        ...(rest.isFree !== undefined && { isFree: rest.isFree }),
                        ...(rest.hasPregnantSpaces !== undefined && {
                            hasPregnantSpaces: rest.hasPregnantSpaces,
                        }),
                        ...(rest.hasDisabledSpaces !== undefined && {
                            hasDisabledSpaces: rest.hasDisabledSpaces,
                        }),
                        ...(rest.hasEvCharging !== undefined && { hasEvCharging: rest.hasEvCharging }),
                        ...(rest.isCovered !== undefined && { isCovered: rest.isCovered }),
                        ...(rest.trustScore !== undefined && { trustScore: rest.trustScore }),
                        ...(rest.status !== undefined && { status: rest.status }),
                        ...(rest.requiresReview !== undefined && { requiresReview: rest.requiresReview }),
                    },
                });
            }
            if (geometry) {
                await applyGeometry(tx, id, geometry);
            }
        });

        return this.findById(id);
    }

    async delete(id: string): Promise<void> {
        await prisma.parkingSpot.delete({ where: { id } });
    }

    async getVote(userId: string, parkingSpotId: string): Promise<ParkingVoteEntity | null> {
        const vote = await prisma.parkingVote.findUnique({
            where: { userId_parkingSpotId: { userId, parkingSpotId } },
            select: { id: true, value: true, reason: true, weight: true, createdAt: true },
        });
        return vote ? { ...vote, value: vote.value as 1 | -1 } : null;
    }

    async upsertVote(
        userId: string,
        parkingSpotId: string,
        value: 1 | -1,
        reason: string | null,
        weight = 1
    ): Promise<ParkingVoteEntity> {
        const vote = await prisma.parkingVote.upsert({
            where: { userId_parkingSpotId: { userId, parkingSpotId } },
            create: { userId, parkingSpotId, value, reason, weight },
            update: { value, reason, weight },
            select: { id: true, value: true, reason: true, weight: true, createdAt: true },
        });
        return { ...vote, value: vote.value as 1 | -1 };
    }

    async getVoteSummary(parkingSpotId: string): Promise<{ upvotes: number; downvotes: number }> {
        const rows = await prisma.$queryRaw<{ upvotes: number; downvotes: number }[]>`
            SELECT COALESCE(SUM("weight") FILTER (WHERE "value" = 1), 0)::float AS upvotes,
                   COALESCE(SUM("weight") FILTER (WHERE "value" = -1), 0)::float AS downvotes
            FROM "ParkingVote"
            WHERE "parkingSpotId" = ${parkingSpotId}
        `;
        const row = rows[0];
        return { upvotes: row?.upvotes ?? 0, downvotes: row?.downvotes ?? 0 };
    }

    async createModerationLog(
        parkingSpotId: string,
        moderatorId: string,
        action: 'APPROVE' | 'REJECT',
        reason: string | null
    ): Promise<void> {
        await prisma.moderationLog.create({
            data: { parkingSpotId, moderatorId, action, reason },
        });
    }

    async countUserContributionsSince(userId: string, since: Date): Promise<number> {
        return prisma.parkingSpot.count({
            where: { contributorId: userId, createdAt: { gte: since } },
        });
    }

    async countUserVotesSince(userId: string, since: Date): Promise<number> {
        return prisma.parkingVote.count({
            where: { userId, createdAt: { gte: since } },
        });
    }

    async getContributorStats(userId: string): Promise<UserContributionStats> {
        const [byStatus, received, votesGiven, avgTrust] = await Promise.all([
            prisma.parkingSpot.groupBy({
                by: ['status'],
                where: { contributorId: userId },
                _count: { _all: true },
            }),
            prisma.$queryRaw<{ upvotes: number; downvotes: number }[]>`
                SELECT COALESCE(COUNT(*) FILTER (WHERE v."value" = 1), 0)::int AS upvotes,
                       COALESCE(COUNT(*) FILTER (WHERE v."value" = -1), 0)::int AS downvotes
                FROM "ParkingVote" v
                INNER JOIN "ParkingSpot" s ON s."id" = v."parkingSpotId"
                WHERE s."contributorId" = ${userId} AND v."userId" <> ${userId}
            `,
            prisma.parkingVote.count({ where: { userId } }),
            prisma.parkingSpot.aggregate({
                where: { contributorId: userId, status: 'APPROVED' },
                _avg: { trustScore: true },
            }),
        ]);

        const count = (status: string) =>
            byStatus.find((row) => row.status === status)?._count._all ?? 0;

        return {
            total: byStatus.reduce((acc, row) => acc + row._count._all, 0),
            approved: count('APPROVED'),
            pending: count('PENDING'),
            rejected: count('REJECTED'),
            flagged: count('FLAGGED'),
            votesReceivedUp: received[0]?.upvotes ?? 0,
            votesReceivedDown: received[0]?.downvotes ?? 0,
            votesGiven,
            avgTrustApproved: Math.round((avgTrust._avg.trustScore ?? 0) * 10) / 10,
        };
    }

    private async findByIds(ids: string[]): Promise<ParkingSpotEntity[]> {
        const spots = await prisma.parkingSpot.findMany({
            where: { id: { in: ids } },
            select: SPOT_SELECT,
        });
        const byId = new Map(spots.map((spot) => [spot.id, spot]));
        return ids.map((id) => toEntity(byId.get(id)!));
    }
}
