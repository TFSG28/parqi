export type ParkingType = 'SURFACE' | 'UNDERGROUND' | 'MULTI_STORY' | 'STREET' | 'OTHER';

export type CapacityRange =
    | 'RANGE_1_5'
    | 'RANGE_6_20'
    | 'RANGE_21_50'
    | 'RANGE_51_100'
    | 'RANGE_100_PLUS';

export type ContributionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';

export type DataSource = 'COMMUNITY' | 'OVERPASS' | 'GEOAPIFY';

/** GeoJSON simplificado (coordenadas [longitude, latitude]). */
export type Geometry =
    | { type: 'Point'; coordinates: [number, number] }
    | { type: 'Polygon'; coordinates: [number, number][][] };

export interface ParkingSpot {
    id: string;
    name: string;
    description: string | null;
    latitude: number | null;
    longitude: number | null;
    geometryType: 'POINT' | 'POLYGON';
    parkingType: ParkingType;
    capacityRange: CapacityRange | null;
    isFree: boolean | null;
    source: DataSource;
    status: ContributionStatus;
    trustScore: number;
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
