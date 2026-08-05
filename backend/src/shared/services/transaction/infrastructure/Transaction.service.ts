import { injectable } from 'tsyringe';
import { prisma } from '../../../../lib/prisma';
import { PrismaTransaction } from '../../../types/prisma.types';
import { ITransactionService } from '../domain/ITransaction.service';

@injectable()
export class TransactionService implements ITransactionService {
    async execute<T>(callback: (tx: PrismaTransaction) => Promise<T>): Promise<T> {
        return prisma.$transaction(callback);
    }
}
