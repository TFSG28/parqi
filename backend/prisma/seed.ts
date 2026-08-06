import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 A semeear a base de dados...');

    // Verifica se já existem dados
    const userCount = await prisma.user.count();
    if (userCount > 0) {
        console.log(`⚠️  Base já contém ${userCount} utilizadores — seed ignorado.`);
        await prisma.$disconnect();
        return;
    }

    // Admin
    const admin = await prisma.user.create({
        data: {
            name: 'Admin Parqi',
            email: 'admin@parqi.pt',
            password: '$2a$10$placeholder', // substituir com hash real via set-admin.ts
            role: 'ADMIN',
            emailVerified: true,
            isActive: true,
        },
    });
    console.log(`✅ Admin criado: ${admin.email}`);

    // Utilizador de teste
    const tester = await prisma.user.create({
        data: {
            name: 'Condutor Teste',
            email: 'teste@parqi.pt',
            password: '$2a$10$placeholder',
            role: 'USER',
            emailVerified: true,
            isActive: true,
        },
    });
    console.log(`✅ Utilizador de teste criado: ${tester.email}`);

    // Parque de exemplo — Guimarães, Toural
    const spot = await prisma.parkingSpot.create({
        data: {
            name: 'Parque do Toural',
            description: 'Parque subterrâneo no centro histórico de Guimarães.',
            latitude: 41.4426,
            longitude: -8.2914,
            geometryType: 'POINT',
            parkingType: 'UNDERGROUND',
            capacityRange: 'RANGE_51_100',
            isFree: false,
            hasDisabledSpaces: true,
            hasEvCharging: true,
            source: 'COMMUNITY',
            status: 'APPROVED',
            trustScore: 8.5,
            contributorId: admin.id,
        },
    });
    console.log(`✅ Parque de exemplo criado: ${spot.name}`);

    // Geometria PostGIS
    await prisma.$executeRawUnsafe(`
        UPDATE "ParkingSpot"
        SET "geom" = ST_SetSRID(ST_MakePoint(-8.2914, 41.4426), 4326)
        WHERE "id" = '${spot.id}'
    `);
    console.log('✅ Geometria PostGIS aplicada ao parque de exemplo');

    const totalSpots = await prisma.parkingSpot.count();
    console.log(`\n🎉 Seed concluído! ${totalSpots} parques na BD.`);

    await prisma.$disconnect();
}

main().catch(async (error) => {
    console.error('❌ Erro no seed:', error);
    await prisma.$disconnect();
    process.exit(1);
});
