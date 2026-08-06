import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
    console.log('Iniciando seed do banco de dados...');

    const hashedPassword = await bcrypt.hash('!QAZ2wsx', 10);

    const admin = await prisma.user.upsert({
        where: { email: 'devops@wearemateria.com' },
        update: {},
        create: {
            email: 'devops@wearemateria.com',
            name: 'Administrador',
            password: hashedPassword,
            role: 'ADMIN',
            isActive: true,
            emailVerified: true,
        },
    });

    console.log('Usuário admin criado:', admin.id, admin.role);

    const testUser = await prisma.user.upsert({
        where: { email: 'web2@wearemateria.com' },
        update: {},
        create: {
            email: 'web2@wearemateria.com',
            name: 'Utilizador Teste',
            password: hashedPassword,
            role: 'USER',
            isActive: true,
            emailVerified: true,
        },
    });

    console.log('Usuário teste criado:', testUser.id, testUser.role);

    console.log('Seed concluído!');
}

main()
    .catch((e) => {
        console.error('Erro durante seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
