import type { ParkingGeometryInput } from './entities/ParkingSpot.entity';
import { PORTUGAL_BOUNDS } from './const';

/** Ponto de referência de uma geometria: coordenadas do ponto ou centroide aproximado do anel exterior. */
export function getReferencePoint(geometry: ParkingGeometryInput): [number, number] {
    if (geometry.type === 'Point') {
        return geometry.coordinates;
    }
    const ring = geometry.coordinates[0];
    const sum = ring.reduce(
        (acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat] as [number, number],
        [0, 0] as [number, number]
    );
    return [sum[0] / ring.length, sum[1] / ring.length];
}

export function isInsidePortugal(latitude: number, longitude: number): boolean {
    return (
        latitude >= PORTUGAL_BOUNDS.minLat &&
        latitude <= PORTUGAL_BOUNDS.maxLat &&
        longitude >= PORTUGAL_BOUNDS.minLon &&
        longitude <= PORTUGAL_BOUNDS.maxLon
    );
}
