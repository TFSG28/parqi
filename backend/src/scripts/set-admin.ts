/**
 * Promove um utilizador a ADMIN.
 *
 *   npm run set-admin -- email@exemplo.pt
 */
import 'reflect-metadata';
import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main(): Promise<void> {
    const email = process.argv[2];
    if (!email) {
        console.error('Uso: npm run set-admin -- <email>');
        process.exit(1);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        console.error(`Utilizador com email "${email}" não encontrado.`);
        process.exit(1);
    }

    // Admins nunca ficam bloqueados pela verificação de email
    await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN', emailVerified: true },
    });
    console.log(`✔ ${email} agora é ADMIN (email marcado como verificado).`);
}

main()
    .catch((error) => {
        console.error('Erro:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
