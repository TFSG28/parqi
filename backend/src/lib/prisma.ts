import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from '../generated/prisma/client';
import { encryptionExtension } from "../shared/middleware/encryptation.middleware";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
});

const adapter = new PrismaPg(pool);

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