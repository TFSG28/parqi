// Domain entity - pure business object, no external dependencies

export type ParkingType = 'SURFACE' | 'UNDERGROUND' | 'MULTI_STORY' | 'STREET' | 'OTHER';
export type CapacityRange =
    | 'RANGE_1_5'
    | 'RANGE_6_20'
    | 'RANGE_21_50'
    | 'RANGE_51_100'
    | 'RANGE_100_PLUS';
export type DataSource = 'COMMUNITY' | 'OVERPASS' | 'GEOAPIFY' | 'MUNICIPAL';
export type ContributionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';
export type GeometryType = 'POINT' | 'POLYGON';

export interface ParkingSpotEntity {
    id: string;
    name: string;
    description: string | null;
    latitude: number | null;
    longitude: number | null;
    geometryType: GeometryType;
    parkingType: ParkingType;
    capacityRange: CapacityRange | null;
    isFree: boolean | null;
    source: DataSource;
    externalId: string | null;
    status: ContributionStatus;
    trustScore: number;
    duplicateOfId: string | null;
    contributorId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ParkingVoteEntity {
    id: string;
    value: 1 | -1;
    reason: string | null;
    createdAt: Date;
}

/**
 * Geometria enviada pelos clientes (GeoJSON simplificado).
 * Coordenadas na ordem [longitude, latitude], SRID 4326.
 */
export type ParkingGeometryInput =
    | { type: 'Point'; coordinates: [number, number] }
    | { type: 'Polygon'; coordinates: [number, number][][] };

export type GeoJSONGeometry =
    | { type: 'Point'; coordinates: [number, number] }
    | { type: 'Polygon'; coordinates: [number, number][][] };
