import { inject, injectable } from 'tsyringe';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { IParkingRepository } from '../../domain/repositories/IParking.repository';
import { ParkingSpotEntity } from '../../domain/entities/ParkingSpot.entity';
import { ParkingNotFoundError } from '../../domain/errors/ParkingNotFound.error';

export interface ModerateParkingInput {
    parkingSpotId: string;
    moderatorId: string;
    action: 'APPROVE' | 'REJECT';
    reason?: string;
}

/**
 * Moderação manual (admin) - parte do modelo híbrido: quando a confiança
 * é negativa (FLAGGED) ou para rever pendentes, o admin decide.
 */
@injectable()
export class ModerateParkingUseCase {
    constructor(
        @inject(PARKING_TOKENS.IParkingRepository)
        private readonly parkingRepository: IParkingRepository
    ) {}

    async execute(input: ModerateParkingInput): Promise<ParkingSpotEntity> {
        const spot = await this.parkingRepository.findById(input.parkingSpotId);
        if (!spot) {
            throw new ParkingNotFoundError();
        }

        const status = input.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        const trustScore = input.action === 'APPROVE' ? Math.max(spot.trustScore, 5) : spot.trustScore;

        await this.parkingRepository.createModerationLog(
            input.parkingSpotId,
            input.moderatorId,
            input.action,
            input.reason ?? null
        );

        const updated = await this.parkingRepository.update(input.parkingSpotId, { status, trustScore });
        if (!updated) {
            throw new ParkingNotFoundError();
        }
        return updated;
    }
}
