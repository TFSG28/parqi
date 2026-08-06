import { inject, injectable } from 'tsyringe';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { IParkingRepository } from '../../domain/repositories/IParking.repository';

export interface ListModerationQueueInput {
    page: number;
    limit: number;
}

/**
 * Fila de moderação do admin: contribuições de contas novas (requiresReview)
 * ainda pendentes ou sinalizadas, que precisam de decisão manual.
 */
@injectable()
export class ListModerationQueueUseCase {
    constructor(
        @inject(PARKING_TOKENS.IParkingRepository)
        private readonly parkingRepository: IParkingRepository
    ) {}

    async execute(input: ListModerationQueueInput) {
        return this.parkingRepository.list({
            statuses: ['PENDING', 'FLAGGED'],
            requiresReview: true,
            page: input.page,
            limit: input.limit,
        });
    }
}
