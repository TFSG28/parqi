/**
 * CLI: importa estacionamentos de CSV de dados abertos municipais.
 *
 * Uso:
 *   npm run import:csv -- --file parques.csv --dataset cm-braga
 *   npm run import:csv -- --file parques.csv --dataset cm-braga --name-col designacao --lat-col y --lon-col x --id-col id
 *
 * Ficheiros SHP: converter primeiro com GDAL:
 *   ogr2ogr -f CSV parques.csv parques.shp -lco GEOMETRY=AS_XY -t_srs EPSG:4326
 *   (as coordenadas ficam nas colunas X/Y: usar --lat-col y --lon-col x)
 */
import 'reflect-metadata';
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { container } from 'tsyringe';
import { setupContainer } from '../shared/container/container';
import { PARKING_TOKENS } from '../shared/container/tokens/parking.tokens';
import type { ICsvImporter } from '../modules/parking/domain/services/IImporter.service';
import { prisma } from '../lib/prisma';

function getArg(args: string[], name: string): string | undefined {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : undefined;
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const file = getArg(args, 'file');
    const dataset = getArg(args, 'dataset');

    if (!file || !dataset) {
        console.error(
            'Uso: npm run import:csv -- --file <ficheiro.csv> --dataset <slug> [--name-col name] [--lat-col latitude] [--lon-col longitude] [--id-col id]'
        );
        process.exit(1);
    }

    setupContainer();
    const importer = container.resolve<ICsvImporter>(PARKING_TOKENS.ICsvImporter);

    console.log(`Importando estacionamentos de "${file}" (dataset ${dataset})...`);
    const result = await importer.importFromCsv(readFileSync(file, 'utf8'), {
        dataset,
        nameColumn: getArg(args, 'name-col'),
        latColumn: getArg(args, 'lat-col'),
        lonColumn: getArg(args, 'lon-col'),
        idColumn: getArg(args, 'id-col'),
    });
    console.log('Resultado:', JSON.stringify(result));
}

main()
    .catch((error) => {
        console.error('Erro no import CSV:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
