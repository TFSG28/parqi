import { Prisma } from '../../generated/prisma/client';

/**
 * Prisma client extension for field-level encryption at rest.
 *
 * No-op by default. To protect sensitive fields, add a `query` extension here
 * that encrypts on create/update and decrypts on read for the target models,
 * using EncryptionService (see shared/services/encryption.service.ts).
 *
 *   intentionally a pass-through until specific fields need protection.
 * Applied to the client in lib/prisma.ts via `$extends`.
 */
export const encryptionExtension = Prisma.defineExtension({
    name: 'encryption',
});
