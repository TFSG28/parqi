import { inject, injectable } from 'tsyringe';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { PushService } from '../../../user/infrastructure/services/Push.service';
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
        private readonly parkingRepository: IParkingRepository,
        @inject(USER_TOKENS.PushService)
        private readonly pushService: PushService
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

        // Decisão tomada: sai da fila de revisão manual
        const updated = await this.parkingRepository.update(input.parkingSpotId, {
            status,
            trustScore,
            requiresReview: false,
        });
        if (!updated) {
            throw new ParkingNotFoundError();
        }

        // Reconhecimento do contribuidor: sabe logo que a decisão foi tomada
        if (input.action === 'APPROVE') {
            void this.pushService.notify(
                spot.contributorId,
                'Contribuição aprovada',
                `«${spot.name}» já está verificado no mapa. Obrigado!`,
                { type: 'contribution_approved', spotId: spot.id }
            );
        } else {
            void this.pushService.notify(
                spot.contributorId,
                'Contribuição rejeitada',
                input.reason
                    ? `«${spot.name}» foi rejeitado: ${input.reason}`
                    : `«${spot.name}» foi rejeitado pela moderação.`,
                { type: 'contribution_rejected', spotId: spot.id }
            );
        }

        return updated;
    }
}
