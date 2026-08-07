/**
 * CLI: importa estacionamentos do OpenStreetMap (Overpass API).
 *
 * Uso:
 *   npm run import:overpass -- --city "Guimarães"
 *   npm run import:overpass -- --city "Guimarães" --area "Guimarães"
 *   npm run import:overpass -- --all          (todos os concelhos de Portugal)
 */
import 'reflect-metadata';
import 'dotenv/config';
import { container } from 'tsyringe';
import { setupContainer } from '../shared/container/container';
import { PARKING_TOKENS } from '../shared/container/tokens/parking.tokens';
import type { IOverpassImporter } from '../modules/parking/domain/services/IImporter.service';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';

function getArg(args: string[], name: string): string | undefined {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : undefined;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Verifica se o erro do Overpass é retryable (504 timeout / 429 rate-limit). */
function isRetryable(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    return /respondeu 504/.test(msg) || /respondeu 429/.test(msg);
}

const BASE_DELAY_MS = 5_000; // 5s entre concelhos (overpass public tier)
const MAX_RETRIES = 4;

/**
 * Importa um concelho com retry exponencial se der 504/429.
 * Backoff: 5s, 10s, 20s, 40s (+ jitter 0-2s).
 */
async function importWithRetry(
    importer: IOverpassImporter,
    concelho: string,
    areaName?: string
): Promise<{ imported: number; skipped: number; errors: number }> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await importer.importByCity(concelho, areaName);
        } catch (error) {
            if (attempt < MAX_RETRIES && isRetryable(error)) {
                const delay = 5_000 * 2 ** attempt + Math.floor(Math.random() * 2000);
                console.warn(
                    `  ⚠️  ${concelho}: tentativa ${attempt + 1} falhou (${isRetryable(error) ? '504/429' : 'erro'}),` +
                    ` nova tentativa em ${(delay / 1000).toFixed(1)}s...`
                );
                await sleep(delay);
                continue;
            }
            throw error;
        }
    }
    throw new Error('unreachable');
}

/** Lista os concelhos de Portugal (admin_level=7) a partir do próprio OSM. */
async function fetchConcelhos(): Promise<string[]> {
    const query =
        '[out:json][timeout:90];area["ISO3166-1"="PT"]->.pt;' +
        'relation["boundary"="administrative"]["admin_level"="7"](area.pt);out tags;';
    const response = await fetch(`${env.OVERPASS_API_URL}?data=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': 'parqi/1.0 (api.parqi.pt)' },
        signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) {
        throw new Error(`Overpass API respondeu ${response.status}: ${await response.text()}`);
    }
    const data = (await response.json()) as { elements?: { tags?: Record<string, string> }[] };
    const names = (data.elements ?? [])
        .map((element) => element.tags?.name?.trim())
        .filter((name): name is string => Boolean(name));
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'pt'));
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const city = getArg(args, 'city');
    const area = getArg(args, 'area');
    const all = args.includes('--all');

    if (!city && !all) {
        console.error(
            'Uso: npm run import:overpass -- --city "Guimarães" [--area "Guimarães"] | --all'
        );
        process.exit(1);
    }

    setupContainer();
    const importer = container.resolve<IOverpassImporter>(PARKING_TOKENS.IOverpassImporter);

    if (!all) {
        console.log(`Importando estacionamentos de OSM para "${city}"...`);
        const result = await importWithRetry(importer, city!, area);
        console.log('Resultado:', JSON.stringify(result));
        return;
    }

    const concelhos = await fetchConcelhos();
    console.log(`Importando estacionamentos de OSM para ${concelhos.length} concelhos...`);

    const totals = { imported: 0, skipped: 0, errors: 0, failed: 0 };
    for (const [index, concelho] of concelhos.entries()) {
        try {
            const result = await importWithRetry(importer, concelho);
            totals.imported += result.imported;
            totals.skipped += result.skipped;
            totals.errors += result.errors;
            console.log(`[${index + 1}/${concelhos.length}] ${concelho}: ${JSON.stringify(result)}`);
        } catch (error) {
            totals.failed++;
            console.error(`[${index + 1}/${concelhos.length}] ${concelho}: FALHOU -`, error);
        }
        await sleep(BASE_DELAY_MS);
    }
    console.log('Total:', JSON.stringify(totals));
}

main()
    .catch((error) => {
        console.error('Erro no import Overpass:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
