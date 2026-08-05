import { inject, injectable } from 'tsyringe';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { IParkingRepository } from '../../domain/repositories/IParking.repository';
import { ITrustCalculator } from '../../domain/services/ITrustCalculator.service';
import { ParkingSpotEntity } from '../../domain/entities/ParkingSpot.entity';
import { ParkingNotFoundError } from '../../domain/errors/ParkingNotFound.error';
import { InvalidParkingActionError } from '../../domain/errors/InvalidParkingAction.error';

export interface VoteParkingInput {
    parkingSpotId: string;
    userId: string;
    value: 1 | -1;
    reason?: string;
}

/**
 * Voto da comunidade (1 ou -1). Após cada voto, a confiança é recalculada
 * e o TrustCalculator decide a transição de estado (aprovação/flag automática).
 */
@injectable()
export class VoteParkingUseCase {
    constructor(
        @inject(PARKING_TOKENS.IParkingRepository)
        private readonly parkingRepository: IParkingRepository,
        @inject(PARKING_TOKENS.ITrustCalculator)
        private readonly trustCalculator: ITrustCalculator
    ) {}

    async execute(input: VoteParkingInput): Promise<ParkingSpotEntity> {
        const spot = await this.parkingRepository.findById(input.parkingSpotId);
        if (!spot) {
            throw new ParkingNotFoundError();
        }
        if (spot.status === 'REJECTED') {
            throw new InvalidParkingActionError('Não é possível votar num estacionamento rejeitado');
        }
        if (spot.contributorId === input.userId) {
            throw new InvalidParkingActionError('Não podes votar na tua própria contribuição');
        }

        await this.parkingRepository.upsertVote(
            input.userId,
            input.parkingSpotId,
            input.value,
            input.reason ?? null
        );

        const summary = await this.parkingRepository.getVoteSummary(input.parkingSpotId);
        const { trustScore, status } = this.trustCalculator.apply(spot.source, spot.status, summary);

        const updated = await this.parkingRepository.update(input.parkingSpotId, { trustScore, status });
        if (!updated) {
            throw new ParkingNotFoundError();
        }
        return updated;
    }
}
