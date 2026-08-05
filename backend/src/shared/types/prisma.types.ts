import { prisma } from '../../lib/prisma';

// Transaction client type derived from the (extended) Prisma client.
export type PrismaTransaction = Parameters<Parameters<typeof prisma['$transaction']>[0]>[0];

// A repository can accept either the base client or a transaction client.
export type PrismaClientOrTransaction = typeof prisma | PrismaTransaction;
