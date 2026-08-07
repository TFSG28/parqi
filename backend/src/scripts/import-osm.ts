/**
 * CLI: importa estacionamentos do OpenStreetMap (Overpass) para TODO o país.
 * Continente, Madeira e Açores numa passagem — 3 queries por bounding box.
 *
 * Uso:
 *   npm run import:osm                          (tudo: Continente + Madeira + Açores)
 *   npm run import:osm -- --region continente   (só uma região)
 *   npm run import:osm -- --region madeira
 *   npm run import:osm -- --region acores
 */
import 'reflect-metadata';
import 'dotenv/config';
import { container } from 'tsyringe';
import { setupContainer } from '../shared/container/container';
import { PARKING_TOKENS } from '../shared/container/tokens/parking.tokens';
import type { IOsmImporter, OsmRegionKey } from '../modules/parking/domain/services/IImporter.service';
import { OSM_REGIONS } from '../modules/parking/domain/services/IImporter.service';
import { prisma } from '../lib/prisma';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 504 (timeout) / 429 (rate-limit) são retryable no Overpass público. */
function isRetryable(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    return /respondeu 504/.test(msg) || /respondeu 429/.test(msg);
}

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 10_000;

async function importWithRetry(importer: IOsmImporter, region: OsmRegionKey) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await importer.importRegion(region);
        } catch (error) {
            if (attempt < MAX_RETRIES && isRetryable(error)) {
                const delay = BASE_DELAY_MS * 2 ** attempt + Math.floor(Math.random() * 3000);
                console.warn(
                    `  ⚠️  ${region}: tentativa ${attempt + 1} falhou (504/429), nova tentativa em ${(delay / 1000).toFixed(1)}s...`
                );
                await sleep(delay);
                continue;
            }
            throw error;
        }
    }
    throw new Error('unreachable');
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const regionArg = args[args.indexOf('--region') + 1];

    let regions: OsmRegionKey[];
    if (regionArg) {
        if (!OSM_REGIONS.some((r) => r.key === regionArg)) {
            console.error(
                `Região inválida: ${regionArg}. Valores: ${OSM_REGIONS.map((r) => r.key).join(', ')}`
            );
            process.exit(1);
        }
        regions = [regionArg as OsmRegionKey];
    } else {
        regions = OSM_REGIONS.map((r) => r.key);
    }

    setupContainer();
    const importer = container.resolve<IOsmImporter>(PARKING_TOKENS.IOsmImporter);

    const totals = { imported: 0, skipped: 0, errors: 0, failed: 0 };
    for (const [index, region] of regions.entries()) {
        try {
            const result = await importWithRetry(importer, region);
            totals.imported += result.imported;
            totals.skipped += result.skipped;
            totals.errors += result.errors;
            console.log(`[${region}] ${JSON.stringify(result)}`);
        } catch (error) {
            totals.failed++;
            console.error(`[${region}] FALHOU -`, error);
        }
        // pausa entre regiões (não depois da última)
        if (regions.length > 1 && index < regions.length - 1) {
            await sleep(BASE_DELAY_MS);
        }
    }
    console.log('Total:', JSON.stringify(totals));
}

main()
    .catch((error) => {
        console.error('Erro no import OSM:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
