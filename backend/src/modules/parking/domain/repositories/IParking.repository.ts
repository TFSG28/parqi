import type {
    CapacityRange,
    ContributionStatus,
    DataSource,
    GeoJSONGeometry,
    ParkingGeometryInput,
    ParkingSpotEntity,
    ParkingType,
    ParkingVoteEntity,
} from '../entities/ParkingSpot.entity';

export interface CreateParkingRepositoryData {
    name: string;
    description: string | null;
    geometry: ParkingGeometryInput;
    parkingType: ParkingType;
    capacityRange: CapacityRange | null;
    isFree: boolean | null;
    source: DataSource;
    externalId?: string | null;
    status: ContributionStatus;
    trustScore: number;
    contributorId?: string | null;
}

export interface UpdateParkingRepositoryData {
    name?: string;
    description?: string | null;
    geometry?: ParkingGeometryInput;
    parkingType?: ParkingType;
    capacityRange?: CapacityRange | null;
    isFree?: boolean | null;
    trustScore?: number;
    status?: ContributionStatus;
}

export interface ParkingListFilters {
    bbox?: { minLon: number; minLat: number; maxLon: number; maxLat: number } | null;
    parkingType?: ParkingType | null;
    statuses: ContributionStatus[];
    page: number;
    limit: number;
}

export interface IParkingRepository {
    create(data: CreateParkingRepositoryData): Promise<ParkingSpotEntity>;
    findById(id: string): Promise<ParkingSpotEntity | null>;
    findByExternalId(source: DataSource, externalId: string): Promise<ParkingSpotEntity | null>;
    findNearby(
        latitude: number,
        longitude: number,
        radiusMeters: number,
        excludeStatuses?: ContributionStatus[]
    ): Promise<ParkingSpotEntity[]>;
    list(
        filters: ParkingListFilters
    ): Promise<{ items: (ParkingSpotEntity & { geometry: GeoJSONGeometry | null })[]; total: number }>;
    getGeometry(id: string): Promise<GeoJSONGeometry | null>;
    update(id: string, data: UpdateParkingRepositoryData): Promise<ParkingSpotEntity | null>;
    delete(id: string): Promise<void>;

    getVote(userId: string, parkingSpotId: string): Promise<ParkingVoteEntity | null>;
    upsertVote(
        userId: string,
        parkingSpotId: string,
        value: 1 | -1,
        reason: string | null
    ): Promise<ParkingVoteEntity>;
    getVoteSummary(parkingSpotId: string): Promise<{ upvotes: number; downvotes: number }>;

    createModerationLog(
        parkingSpotId: string,
        moderatorId: string,
        action: 'APPROVE' | 'REJECT',
        reason: string | null
    ): Promise<void>;
}
