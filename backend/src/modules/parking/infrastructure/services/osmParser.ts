/**
 * Parsing de elementos OSM/Overpass partilhado entre os importadores
 * (OverpassImporter por concelho e OsmImporter país inteiro por bbox).
 */
import { getReferencePoint, isInsidePortugal } from '../../domain/geo';
import type {
    CapacityRange,
    ParkingGeometryInput,
    ParkingType,
} from '../../domain/entities/ParkingSpot.entity';
import type { IParkingRepository } from '../../domain/repositories/IParking.repository';

export interface OverpassElement {
    type: 'node' | 'way';
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    geometry?: { lat: number; lon: number }[];
    tags?: Record<string, string>;
}

export type ParsedOsmParking = Omit<
    Parameters<IParkingRepository['create']>[0],
    'source' | 'externalId' | 'status' | 'trustScore'
>;

/** Converte um elemento OSM (node/way com amenity=parking) nos dados do parque. */
export function parseOsmElement(element: OverpassElement): ParsedOsmParking | null {
    const tags = element.tags ?? {};
    if (tags.access === 'private') {
        return null;
    }

    const geometry = extractGeometry(element);
    if (!geometry) {
        return null;
    }

    const osmId = `${element.type}/${element.id}`;
    return {
        name: tags.name?.trim() || `Parque de estacionamento (OSM ${osmId})`,
        description: null,
        geometry,
        parkingType: mapParkingType(tags.parking),
        capacityRange: mapCapacity(tags.capacity),
        isFree: mapIsFree(tags.fee),
        hasPregnantSpaces: mapBooleanTag(tags['capacity:pregnant']),
        hasDisabledSpaces: mapBooleanTag(tags['capacity:disabled']),
        hasEvCharging: tags.charging_station === 'yes' ? true : null,
        isCovered: mapBooleanTag(tags.covered),
    };
}

export function extractGeometry(element: OverpassElement): ParkingGeometryInput | null {
    if (element.type === 'node' && element.lat !== undefined && element.lon !== undefined) {
        return { type: 'Point', coordinates: [element.lon, element.lat] };
    }

    if (element.type === 'way' && element.geometry && element.geometry.length > 0) {
        const coords = element.geometry.map((p) => [p.lon, p.lat] as [number, number]);
        if (coords.length >= 4) {
            const closed =
                coords[0][0] === coords[coords.length - 1][0] &&
                coords[0][1] === coords[coords.length - 1][1];
            const ring = closed ? coords : [...coords, coords[0]];
            return { type: 'Polygon', coordinates: [ring] };
        }
        return { type: 'Point', coordinates: boundsCenter(coords) };
    }

    if (element.center) {
        return { type: 'Point', coordinates: [element.center.lon, element.center.lat] };
    }

    return null;
}

export function mapParkingType(value?: string): ParkingType {
    switch (value) {
        case 'surface':
            return 'SURFACE';
        case 'underground':
            return 'UNDERGROUND';
        case 'multi-storey':
            return 'MULTI_STORY';
        case 'street_side':
            return 'STREET';
        default:
            return 'OTHER';
    }
}

export function mapCapacity(value?: string): CapacityRange | null {
    const capacity = Number.parseInt(value ?? '', 10);
    if (Number.isNaN(capacity) || capacity <= 0) {
        return null;
    }
    if (capacity <= 5) return 'RANGE_1_5';
    if (capacity <= 20) return 'RANGE_6_20';
    if (capacity <= 50) return 'RANGE_21_50';
    if (capacity <= 100) return 'RANGE_51_100';
    return 'RANGE_100_PLUS';
}

export function mapIsFree(fee?: string): boolean | null {
    if (fee === 'no') return true;
    if (fee === 'yes') return false;
    return null;
}

/** Mapeia tags como "covered=yes/no" ou "capacity:disabled=2" para booleano. */
export function mapBooleanTag(value?: string): boolean | null {
    if (!value) return null;
    const v = value.trim().toLowerCase();
    if (v === 'no' || v === '0' || v === 'false') return false;
    if (v === 'yes' || v === '1' || v === 'true') return true;
    // número positivo (ex.: capacity:disabled=4) conta como "tem"
    if (/^\d+$/.test(v) && Number.parseInt(v, 10) > 0) return true;
    return null;
}

export function boundsCenter(coords: [number, number][]): [number, number] {
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    return [
        (Math.min(...lngs) + Math.max(...lngs)) / 2,
        (Math.min(...lats) + Math.max(...lats)) / 2,
    ];
}

export interface OverpassImportCounts {
    imported: number;
    skipped: number;
    errors: number;
}

/**
 * Loop comum de importação de elementos OSM:
 * dedup por externalId (source=OVERPASS), filtro isInsidePortugal,
 * dedup cross-source (< 25 m de outra fonte) e criação com status APPROVED.
 */
export async function importOverpassElements(
    repository: IParkingRepository,
    elements: OverpassElement[]
): Promise<OverpassImportCounts> {
    const counts: OverpassImportCounts = { imported: 0, skipped: 0, errors: 0 };

    for (const element of elements) {
        try {
            const externalId = `${element.type}:${element.id}`;
            const exists = await repository.findByExternalId('OVERPASS', externalId);
            if (exists) {
                counts.skipped++;
                continue;
            }

            const parsed = parseOsmElement(element);
            if (!parsed) {
                counts.skipped++;
                continue;
            }

            const [longitude, latitude] = getReferencePoint(parsed.geometry);

            // Rejeitar pontos fora de Portugal (continente + Açores + Madeira)
            if (!isInsidePortugal(latitude, longitude)) {
                counts.skipped++;
                continue;
            }

            // Dedup cross-source (os dados podem repetir-se entre OSM/Geoapify/comunidade)
            const nearby = await repository.findNearby(latitude, longitude, 25);
            if (nearby.some((spot) => spot.source !== 'OVERPASS')) {
                counts.skipped++;
                continue;
            }

            await repository.create({
                ...parsed,
                source: 'OVERPASS',
                externalId,
                status: 'APPROVED',
                trustScore: 6,
            });
            counts.imported++;
        } catch {
            counts.errors++;
        }
    }

    return counts;
}
