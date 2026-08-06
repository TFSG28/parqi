import { injectable } from 'tsyringe';
import { prisma } from '../../../../lib/prisma';
import type {
    CreateSuggestionRepositoryData,
    ISuggestionRepository,
    ParkingSuggestionEntity,
    SuggestionStatus,
} from '../../domain/repositories/ISuggestion.repository';

const SUGGESTION_SELECT = {
    id: true,
    createdAt: true,
    updatedAt: true,
    data: true,
    status: true,
    reason: true,
    reviewedAt: true,
    parkingSpotId: true,
    suggestedById: true,
    reviewedById: true,
} as const;

type Row = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    data: unknown;
    status: string;
    reason: string | null;
    reviewedAt: Date | null;
    parkingSpotId: string;
    suggestedById: string;
    reviewedById: string | null;
};

function toEntity(row: Row): ParkingSuggestionEntity {
    return {
        id: row.id,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        data: (row.data ?? {}) as Record<string, unknown>,
        status: row.status as SuggestionStatus,
        reason: row.reason,
        reviewedAt: row.reviewedAt,
        parkingSpotId: row.parkingSpotId,
        suggestedById: row.suggestedById,
        reviewedById: row.reviewedById,
    };
}

@injectable()
export class SuggestionRepository implements ISuggestionRepository {
    async create(data: CreateSuggestionRepositoryData): Promise<ParkingSuggestionEntity> {
        const row = await prisma.parkingSuggestion.create({
            data: {
                data: data.data,
                reason: data.reason,
                parkingSpotId: data.parkingSpotId,
                suggestedById: data.suggestedById,
            },
            select: SUGGESTION_SELECT,
        });
        return toEntity(row);
    }

    async findById(id: string): Promise<ParkingSuggestionEntity | null> {
        const row = await prisma.parkingSuggestion.findUnique({ where: { id }, select: SUGGESTION_SELECT });
        return row ? toEntity(row) : null;
    }

    async listByStatus(
        status: SuggestionStatus,
        page: number,
        limit: number
    ): Promise<{ items: ParkingSuggestionEntity[]; total: number }> {
        const [rows, total] = await Promise.all([
            prisma.parkingSuggestion.findMany({
                where: { status },
                orderBy: { createdAt: 'asc' },
                skip: (page - 1) * limit,
                take: limit,
                select: SUGGESTION_SELECT,
            }),
            prisma.parkingSuggestion.count({ where: { status } }),
        ]);
        return { items: rows.map(toEntity), total };
    }

    async update(
        id: string,
        data: {
            status: SuggestionStatus;
            reason?: string | null;
            reviewedById?: string;
            reviewedAt?: Date;
        }
    ): Promise<ParkingSuggestionEntity | null> {
        const row = await prisma.parkingSuggestion.update({
            where: { id },
            data: {
                status: data.status,
                ...(data.reason !== undefined && { reason: data.reason }),
                ...(data.reviewedById !== undefined && { reviewedById: data.reviewedById }),
                ...(data.reviewedAt !== undefined && { reviewedAt: data.reviewedAt }),
            },
            select: SUGGESTION_SELECT,
        });
        return row ? toEntity(row) : null;
    }
}
