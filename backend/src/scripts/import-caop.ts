/**
 * CLI: importa os concelhos da CAOP (fronteiras oficiais) para a BD.
 * Lê os ficheiros .gpkg da pasta data/ (Continente, Madeira, Açores),
 * converte as geometrias para WGS84 e associa cada parque ao seu concelho.
 *
 * Uso:
 *   npm run import:caop                     (importa concelhos + backfill de parques)
 *   npm run import:caop -- --skip-backfill  (só concelhos)
 *   PARQI_DATA_DIR=/caminho/data npm run import:caop   (pasta data alternativa)
 */
import 'reflect-metadata';
import 'dotenv/config';
import { container } from 'tsyringe';
import { setupContainer } from '../shared/container/container';
import { PARKING_TOKENS } from '../shared/container/tokens/parking.tokens';
import type { ICaopImporter } from '../modules/parking/domain/services/IImporter.service';
import { prisma } from '../lib/prisma';

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const skipBackfill = args.includes('--skip-backfill');

    setupContainer();
    const importer = container.resolve<ICaopImporter>(PARKING_TOKENS.ICaopImporter);

    console.log('Importando concelhos da CAOP (gpkg)...');
    const result = await importer.importMunicipalities({ skipBackfill });

    for (const file of result.files) {
        console.log(`  ${file.file}: ${file.municipalities} concelhos`);
    }
    console.log(`Total de concelhos importados/atualizados: ${result.municipalities}`);
    console.log(`Parques associados ao seu concelho: ${result.backfilled}`);
}

main()
    .catch((error) => {
        console.error('Erro no import CAOP:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
