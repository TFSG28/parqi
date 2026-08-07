/**
 * Remove ParkingSpots que estão fora de Portugal (continente + Açores + Madeira).
 *
 * Usa a função isInsidePortugal do módulo geo para validar cada ponto.
 * Suporta --dry-run para pré-visualizar sem apagar.
 *
 * Uso:
 *   npm run clean:outside-portugal -- --dry-run    (só lista, não apaga)
 *   npm run clean:outside-portugal                  (apaga de facto)
 */
import 'reflect-metadata';
import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { isInsidePortugal } from '../modules/parking/domain/geo';

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');

    console.log(dryRun ? 'DRY RUN — nada será apagado\n' : 'MODO REAL — spots serão eliminados\n');

    // Buscar todos os spots que têm coordenadas (latitude + longitude)
    const spots = await prisma.parkingSpot.findMany({
        where: {
            latitude: { not: null },
            longitude: { not: null },
        },
        select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            source: true,
            externalId: true,
            status: true,
        },
    });

    console.log(`Total de spots com coordenadas: ${spots.length}\n`);

    const outside: typeof spots = [];
    const inside: typeof spots = [];

    for (const spot of spots) {
        const insideFlag = isInsidePortugal(spot.latitude!, spot.longitude!);
        if (insideFlag) {
            inside.push(spot);
        } else {
            outside.push(spot);
        }
    }

    console.log(`✅ Dentro de Portugal: ${inside.length}`);
    console.log(`❌ Fora de Portugal:   ${outside.length}\n`);

    if (outside.length === 0) {
        console.log('Nada a limpar — todos os spots estão dentro de Portugal.');
        await prisma.$disconnect();
        return;
    }

    // Listar os spots fora
    console.log('─── Spots FORA de Portugal ───');
    for (const spot of outside) {
        console.log(
            `  • ${spot.name}  (${spot.latitude}, ${spot.longitude})  [${spot.source}]  ${spot.externalId ?? ''}  status=${spot.status}`
        );
    }
    console.log('');

    if (dryRun) {
        console.log(`🔍 DRY RUN: ${outside.length} spots seriam apagados. Corre sem --dry-run para apagar.`);
        await prisma.$disconnect();
        return;
    }

    // Apagar os spots fora
    const idsToDelete = outside.map((s) => s.id);
    const result = await prisma.parkingSpot.deleteMany({
        where: { id: { in: idsToDelete } },
    });

    console.log(`🗑️  Apagados: ${result.count} spots fora de Portugal.`);

    await prisma.$disconnect();
}

main().catch((error) => {
    console.error('Erro:', error);
    process.exit(1);
});
