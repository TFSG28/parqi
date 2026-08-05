import { PrismaClient } from '../src/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
            isActive: true,
        },
    });

    console.log('Usuário admin criado:', admin);

    const testUser = await prisma.user.upsert({
        where: { email: 'web2@wearemateria.com' },
        update: {},
        create: {
            email: 'web2@wearemateria.com',
            name: 'Utilizador Teste',
            password: hashedPassword,
            isActive: true,
        },
    });

    console.log('Usuário teste criado:', testUser);

    console.log('Seed concluído!');
}

main()
    .catch((e) => {
        console.error('Erro durante seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
