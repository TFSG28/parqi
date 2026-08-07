import { inject, injectable } from 'tsyringe';
import { env } from '../../../../config/env';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { IParkingRepository } from '../../domain/repositories/IParking.repository';
import type {
    IOsmImporter,
    OsmImportResult,
    OsmRegionKey,
    OsmRegionResult,
} from '../../domain/services/IImporter.service';
import { OSM_REGIONS } from '../../domain/services/IImporter.service';
import { importOverpassElements, type OverpassElement } from './osmParser';

/**
 * Importa estacionamentos do OpenStreetMap (Overpass API) para TODO o território
 * português: Continente, Madeira e Açores, com 3 queries por bounding box.
 *
 * A bbox é mais ampla do que a fronteira real; o filtro `isInsidePortugal`
 * (fronteira Natural Earth + ilhas) rejeita pontos espanhóis ou no mar.
 * Dedup por (source=OVERPASS, externalId="<type>:<id>") — compatível com o
 * OverpassImporter (por concelho), pelo que os dois podem coexistir.
 */
@injectable()
export class OsmImporter implements IOsmImporter {
    constructor(
        @inject(PARKING_TOKENS.IParkingRepository)
        private readonly parkingRepository: IParkingRepository
    ) {}

    async importRegion(region: OsmRegionKey): Promise<OsmRegionResult> {
        const config = OSM_REGIONS.find((r) => r.key === region);
        if (!config) {
            throw new Error(`Região desconhecida: ${region}`);
        }
        const [south, west, north, east] = config.bbox;

        const query = [
            // timeout generoso: o Continente tem ~milhares de elementos
            '[out:json][timeout:300];',
            `(node["amenity"="parking"](${south},${west},${north},${east});`,
            ` way["amenity"="parking"](${south},${west},${north},${east}););`,
            'out geom;',
        ].join('');

        const url = `${env.OVERPASS_API_URL}?data=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'parqi/1.0 (api.parqi.pt)' },
            signal: AbortSignal.timeout(320_000),
        });

        if (!response.ok) {
            throw new Error(`Overpass API respondeu ${response.status}: ${await response.text()}`);
        }

        const data = (await response.json()) as { elements?: OverpassElement[] };
        const result = await importOverpassElements(this.parkingRepository, data.elements ?? []);

        return { region, ...result };
    }

    async importAll(): Promise<OsmImportResult> {
        const regions: OsmRegionResult[] = [];
        let imported = 0;
        let skipped = 0;
        let errors = 0;

        for (const region of OSM_REGIONS) {
            const result = await this.importRegion(region.key);
            regions.push(result);
            imported += result.imported;
            skipped += result.skipped;
            errors += result.errors;
        }

        return { regions, imported, skipped, errors };
    }
}
