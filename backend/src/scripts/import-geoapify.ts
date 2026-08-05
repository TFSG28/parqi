/**
 * CLI: importa estacionamentos da Geoapify Places API.
 *
 * Uso (bbox ou centro + raio):
 *   npm run import:geoapify -- --bbox "-8.35,41.40,-8.25,41.50"
 *   npm run import:geoapify -- --center "-8.29,41.44" --radius 5000 --limit 1000
 */
import 'reflect-metadata';
import 'dotenv/config';
import { container } from 'tsyringe';
import { setupContainer } from '../shared/container/container';
import { PARKING_TOKENS } from '../shared/container/tokens/parking.tokens';
import type { IGeoapifyImporter } from '../modules/parking/domain/services/IImporter.service';
import { prisma } from '../lib/prisma';

function getArg(args: string[], name: string): string | undefined {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : undefined;
}

function parseCenter(raw: string): { lon: number; lat: number } {
    const [lon, lat] = raw.split(',').map(Number);
    if (Number.isNaN(lon) || Number.isNaN(lat)) {
        throw new Error('--center deve ter o formato "lon,lat"');
    }
    return { lon, lat };
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const bbox = getArg(args, 'bbox');
    const centerRaw = getArg(args, 'center');
    const radius = Number(getArg(args, 'radius') ?? 5000);
    const maxItems = Number(getArg(args, 'limit') ?? 1000);

    if (!bbox && !centerRaw) {
        console.error('Uso: npm run import:geoapify -- --bbox "lon1,lat1,lon2,lat2"');
        console.error('  ou: npm run import:geoapify -- --center "lon,lat" --radius 5000');
        process.exit(1);
    }

    setupContainer();
    const importer = container.resolve<IGeoapifyImporter>(PARKING_TOKENS.IGeoapifyImporter);

    console.log('Importando estacionamentos da Geoapify...');
    const result = await importer.importByArea({
        bbox,
        center: centerRaw ? parseCenter(centerRaw) : undefined,
        radius,
        maxItems,
    });
    console.log('Resultado:', JSON.stringify(result));
}

main()
    .catch((error) => {
        console.error('Erro no import Geoapify:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
