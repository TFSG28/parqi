export type ParkingType = 'SURFACE' | 'UNDERGROUND' | 'MULTI_STORY' | 'STREET' | 'OTHER';

export type CapacityRange =
    | 'RANGE_1_5'
    | 'RANGE_6_20'
    | 'RANGE_21_50'
    | 'RANGE_51_100'
    | 'RANGE_100_PLUS';

export type ContributionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';

export type DataSource = 'COMMUNITY' | 'OVERPASS' | 'GEOAPIFY' | 'MUNICIPAL';

/** GeoJSON simplificado (coordenadas [longitude, latitude]). */
export type Geometry =
    | { type: 'Point'; coordinates: [number, number] }
    | { type: 'Polygon'; coordinates: [number, number][][] }
    | { type: 'LineString'; coordinates: [number, number][] };

export interface ParkingSpot {
    id: string;
    name: string;
    description: string | null;
    latitude: number | null;
    longitude: number | null;
    geometryType: 'POINT' | 'POLYGON' | 'LINE';
    parkingType: ParkingType;
    capacityRange: CapacityRange | null;
    isFree: boolean | null;
    hasPregnantSpaces: boolean | null;
    hasDisabledSpaces: boolean | null;
    hasEvCharging: boolean | null;
    isCovered: boolean | null;
    source: DataSource;
    status: ContributionStatus;
    trustScore: number;
    requiresReview: boolean;
    contributorId: string | null;
    createdAt: string;
    updatedAt: string;
    geometry: Geometry | null;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'USER' | 'ADMIN';
    isActive: boolean;
    emailVerified?: boolean;
}

export interface LoginResult {
    user: User;
    csrfToken: string;
    token: string;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export type SuggestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ParkingSuggestion {
    id: string;
    data: Record<string, unknown>;
    status: SuggestionStatus;
    reason: string | null;
    createdAt: string;
    parkingSpotId: string;
    suggestedById: string;
}

export type SuggestResult =
    | { applied: true; spot: ParkingSpot }
    | { applied: false; suggestion: ParkingSuggestion };

export interface ReputationInfo {
    score: number;
    isTrusted: boolean;
    isNew: boolean;
    voteWeight: number;
}

export interface ContributorStats {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    flagged: number;
    approvedRate: number;
    avgTrustApproved: number;
    votesGiven: number;
    votesReceivedUp: number;
    votesReceivedDown: number;
    reputation: ReputationInfo;
}
