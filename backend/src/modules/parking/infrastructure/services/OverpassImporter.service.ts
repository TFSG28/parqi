import { inject, injectable } from 'tsyringe';
import { env } from '../../../../config/env';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { IParkingRepository } from '../../domain/repositories/IParking.repository';
import type {
    CapacityRange,
    ParkingGeometryInput,
    ParkingType,
} from '../../domain/entities/ParkingSpot.entity';
import type { OverpassImportResult, IOverpassImporter } from '../../domain/services/IImporter.service';
import { getReferencePoint } from '../../domain/geo';

interface OverpassElement {
    type: 'node' | 'way';
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    geometry?: { lat: number; lon: number }[];
    tags?: Record<string, string>;
}

/**
 * Importa estacionamentos do OpenStreetMap via Overpass API.
 * Query: area["name"="<cidade>"]->.a; (node/way["amenity"="parking"](area.a)); out geom;
 * Dedup por (source=OVERPASS, externalId="<type>:<id>"). Polígonos (ways) são guardados como tal.
 */
@injectable()
export class OverpassImporter implements IOverpassImporter {
    constructor(
        @inject(PARKING_TOKENS.IParkingRepository)
        private readonly parkingRepository: IParkingRepository
    ) {}

    async importByCity(city: string, areaName?: string): Promise<OverpassImportResult> {
        const query = [
            // 180s: concelhos grandes (Cascais, Barreiro) excedem 90s com "out geom"
            '[out:json][timeout:180];',
            `area["name"="${areaName ?? city}"]->.searchArea;`,
            '(node["amenity"="parking"](area.searchArea);',
            ' way["amenity"="parking"](area.searchArea););',
            'out geom;',
        ].join('');

        const url = `${env.OVERPASS_API_URL}?data=${encodeURIComponent(query)}`;

        const response = await fetch(url, {
            headers: { 'User-Agent': 'parqi/1.0 (api.parqi.pt)' },
            signal: AbortSignal.timeout(200_000),
        });

        if (!response.ok) {
            throw new Error(`Overpass API respondeu ${response.status}: ${await response.text()}`);
        }

        const data = (await response.json()) as { elements?: OverpassElement[] };
        const elements = data.elements ?? [];

        let imported = 0;
        let skipped = 0;
        let errors = 0;

        for (const element of elements) {
            try {
                const externalId = `${element.type}:${element.id}`;
                const exists = await this.parkingRepository.findByExternalId('OVERPASS', externalId);
                if (exists) {
                    skipped++;
                    continue;
                }

                const parsed = this.parseElement(element);
                if (!parsed) {
                    skipped++;
                    continue;
                }

                // Dedup cross-source (os dados podem repetir-se entre OSM/Geoapify/comunidade)
                const [longitude, latitude] = getReferencePoint(parsed.geometry);
                const nearby = await this.parkingRepository.findNearby(latitude, longitude, 25);
                if (nearby.some((spot) => spot.source !== 'OVERPASS')) {
                    skipped++;
                    continue;
                }

                await this.parkingRepository.create({
                    ...parsed,
                    source: 'OVERPASS',
                    externalId,
                    status: 'APPROVED',
                    trustScore: 6,
                });
                imported++;
            } catch {
                errors++;
            }
        }

        return { city, imported, skipped, errors };
    }

    private parseElement(
        element: OverpassElement
    ): Omit<Parameters<IParkingRepository['create']>[0], 'source' | 'externalId' | 'status' | 'trustScore'> | null {
        const tags = element.tags ?? {};
        if (tags.access === 'private') {
            return null;
        }

        const geometry = this.extractGeometry(element);
        if (!geometry) {
            return null;
        }

        const osmId = `${element.type}/${element.id}`;
        return {
            name: tags.name?.trim() || `Parque de estacionamento (OSM ${osmId})`,
            description: null,
            geometry,
            parkingType: this.mapParkingType(tags.parking),
            capacityRange: this.mapCapacity(tags.capacity),
            isFree: this.mapIsFree(tags.fee),
            hasPregnantSpaces: this.mapBooleanTag(tags['capacity:pregnant']),
            hasDisabledSpaces: this.mapBooleanTag(tags['capacity:disabled']),
            hasEvCharging: tags.charging_station === 'yes' ? true : null,
            isCovered: this.mapBooleanTag(tags.covered),
        };
    }

    private extractGeometry(element: OverpassElement): ParkingGeometryInput | null {
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
            return { type: 'Point', coordinates: this.boundsCenter(coords) };
        }

        if (element.center) {
            return { type: 'Point', coordinates: [element.center.lon, element.center.lat] };
        }

        return null;
    }

    private mapParkingType(value?: string): ParkingType {
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

    private mapCapacity(value?: string): CapacityRange | null {
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

    private mapIsFree(fee?: string): boolean | null {
        if (fee === 'no') return true;
        if (fee === 'yes') return false;
        return null;
    }

    /** Mapeia tags como "covered=yes/no" ou "capacity:disabled=2" para booleano. */
    private mapBooleanTag(value?: string): boolean | null {
        if (!value) return null;
        const v = value.trim().toLowerCase();
        if (v === 'no' || v === '0' || v === 'false') return false;
        if (v === 'yes' || v === '1' || v === 'true') return true;
        // número positivo (ex.: capacity:disabled=4) conta como "tem"
        if (/^\d+$/.test(v) && Number.parseInt(v, 10) > 0) return true;
        return null;
    }

    private boundsCenter(coords: [number, number][]): [number, number] {
        const lngs = coords.map((c) => c[0]);
        const lats = coords.map((c) => c[1]);
        return [
            (Math.min(...lngs) + Math.max(...lngs)) / 2,
            (Math.min(...lats) + Math.max(...lats)) / 2,
        ];
    }
}
