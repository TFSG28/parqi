import { inject, injectable } from 'tsyringe';
import { env } from '../../../../config/env';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { IParkingRepository } from '../../domain/repositories/IParking.repository';
import type { ParkingType } from '../../domain/entities/ParkingSpot.entity';
import type {
    GeoapifyImportOptions,
    GeoapifyImportResult,
    IGeoapifyImporter,
} from '../../domain/services/IImporter.service';

interface GeoapifyFeature {
    type: string;
    properties: {
        place_id: string;
        name?: string;
        address_line1?: string;
        categories?: string[];
    };
    geometry: { type: 'Point'; coordinates: [number, number] };
}

const GEOAPIFY_PLACES_URL = 'https://api.geoapify.com/v2/places';
const PAGE_SIZE = 100;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Importa estacionamentos da Geoapify Places API (dados derivados de OSM).
 * Dedup por (source=GEOAPIFY, externalId="geoapify:<place_id>") e também
 * cross-source: se um estacionamento de outra fonte já estiver a < 25m, salta.
 */
@injectable()
export class GeoapifyImporter implements IGeoapifyImporter {
    constructor(
        @inject(PARKING_TOKENS.IParkingRepository)
        private readonly parkingRepository: IParkingRepository
    ) {}

    async importByArea(options: GeoapifyImportOptions): Promise<GeoapifyImportResult> {
        if (!env.GEOAPIFY_API_KEY) {
            throw new Error('GEOAPIFY_API_KEY não está definida no ambiente');
        }
        if (!options.bbox && !options.center) {
            throw new Error('Indica --bbox ou --center/--radius');
        }

        const maxItems = options.maxItems ?? 1000;
        let offset = 0;
        let imported = 0;
        let skipped = 0;
        let errors = 0;

        for (;;) {
            const url = this.buildUrl(options, offset);
            const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });

            if (!response.ok) {
                throw new Error(`Geoapify respondeu ${response.status}: ${await response.text()}`);
            }

            const data = (await response.json()) as { features?: GeoapifyFeature[] };
            const features = data.features ?? [];
            if (features.length === 0) {
                break;
            }

            for (const feature of features) {
                try {
                    const externalId = `geoapify:${feature.properties.place_id}`;
                    if (await this.parkingRepository.findByExternalId('GEOAPIFY', externalId)) {
                        skipped++;
                        continue;
                    }

                    const [longitude, latitude] = feature.geometry.coordinates;
                    // Dedup cross-source (dados repetidos entre fontes)
                    const nearby = await this.parkingRepository.findNearby(latitude, longitude, 25);
                    if (nearby.some((spot) => spot.source !== 'GEOAPIFY')) {
                        skipped++;
                        continue;
                    }

                    await this.parkingRepository.create({
                        name:
                            feature.properties.name?.trim() ||
                            feature.properties.address_line1?.trim() ||
                            'Parque de estacionamento',
                        description: null,
                        geometry: { type: 'Point', coordinates: [longitude, latitude] },
                        parkingType: this.mapParkingType(feature.properties.categories),
                        capacityRange: null,
                        isFree: null,
                        source: 'GEOAPIFY',
                        externalId,
                        status: 'APPROVED',
                        trustScore: 6,
                    });
                    imported++;
                } catch {
                    errors++;
                }
            }

            if (features.length < PAGE_SIZE || offset + PAGE_SIZE >= maxItems) {
                break;
            }
            offset += PAGE_SIZE;
            await sleep(350); // rate limit do free tier (~5 rps)
        }

        return { imported, skipped, errors };
    }

    private buildUrl(options: GeoapifyImportOptions, offset: number): string {
        const url = new URL(GEOAPIFY_PLACES_URL);
        url.searchParams.set('apiKey', env.GEOAPIFY_API_KEY);
        url.searchParams.set('categories', 'parking');
        url.searchParams.set('lang', 'pt');
        url.searchParams.set('limit', String(PAGE_SIZE));
        url.searchParams.set('offset', String(offset));
        url.searchParams.set(
            'filter',
            options.bbox
                ? `rect:${options.bbox}`
                : `circle:${options.center!.lon},${options.center!.lat},${options.radius ?? 5000}`
        );
        return url.toString();
    }

    private mapParkingType(categories?: string[]): ParkingType {
        const category = (categories ?? []).find((c) => c.startsWith('parking.'));
        switch (category) {
            case 'parking.surface':
                return 'SURFACE';
            case 'parking.underground':
                return 'UNDERGROUND';
            case 'parking.multistorey':
                return 'MULTI_STORY';
            default:
                return 'OTHER';
        }
    }
}
