import { PrismaTransaction } from '../../../types/prisma.types';

export interface ITransactionService {
    /**
     * Runs the callback inside a single database transaction.
     * If the callback throws, the transaction is rolled back.
     */
    execute<T>(callback: (tx: PrismaTransaction) => Promise<T>): Promise<T>;
}
