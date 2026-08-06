export type SuggestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ParkingSuggestionEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    /** Diff proposto: { name?, description?, parkingType?, capacityRange?, isFree?, ... } */
    data: Record<string, unknown>;
    status: SuggestionStatus;
    reason: string | null;
    reviewedAt: Date | null;
    parkingSpotId: string;
    suggestedById: string;
    reviewedById: string | null;
}

export interface CreateSuggestionRepositoryData {
    data: Record<string, unknown>;
    reason: string | null;
    parkingSpotId: string;
    suggestedById: string;
}

export interface ISuggestionRepository {
    create(data: CreateSuggestionRepositoryData): Promise<ParkingSuggestionEntity>;
    findById(id: string): Promise<ParkingSuggestionEntity | null>;
    listByStatus(status: SuggestionStatus, page: number, limit: number): Promise<{
        items: ParkingSuggestionEntity[];
        total: number;
    }>;
    update(
        id: string,
        data: { status: SuggestionStatus; reason?: string | null; reviewedById?: string; reviewedAt?: Date }
    ): Promise<ParkingSuggestionEntity | null>;
}
