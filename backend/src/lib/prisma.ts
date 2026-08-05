import "dotenv/config";
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';
import { encryptionExtension } from "../shared/middleware/encryptation.middleware";

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 5
});

const basePrisma = new PrismaClient({ 
  adapter,
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

// Aplicar extensión de encriptación
export const prisma = basePrisma.$extends(encryptionExtension);

// Graceful shutdown
process.on('beforeExit', async () => {
    await basePrisma.$disconnect();
});

process.on('SIGINT', async () => {
    await basePrisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await basePrisma.$disconnect();
    process.exit(0);
});