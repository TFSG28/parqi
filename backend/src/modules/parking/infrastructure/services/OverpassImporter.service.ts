import { inject, injectable } from 'tsyringe';
import { env } from '../../../../config/env';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { IParkingRepository } from '../../domain/repositories/IParking.repository';
import type { OverpassImportResult, IOverpassImporter } from '../../domain/services/IImporter.service';
import {
    importOverpassElements,
    type OverpassElement,
} from './osmParser';

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
        const result = await importOverpassElements(this.parkingRepository, data.elements ?? []);

        return { city, ...result };
    }
}
