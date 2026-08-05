import { container } from 'tsyringe';
import { SHARED_TOKENS } from '../tokens/shared.tokens';

// Services
import { TransactionService } from '../../services/transaction/infrastructure/Transaction.service';

export function setupSharedContainer() {
    // Services (Singleton)
    container.registerSingleton(SHARED_TOKENS.ITransactionService, TransactionService);
}
