import { inject, injectable } from 'tsyringe';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { IParkingRepository } from '../../domain/repositories/IParking.repository';
import { ITrustCalculator } from '../../domain/services/ITrustCalculator.service';
import { PushService } from '../../../user/infrastructure/services/Push.service';
import { ParkingSpotEntity } from '../../domain/entities/ParkingSpot.entity';
import { ParkingNotFoundError } from '../../domain/errors/ParkingNotFound.error';

export interface DeleteVoteInput {
    parkingSpotId: string;
    userId: string;
    userRole?: string;
}

/**
 * Anula um voto (idempotente). Após a remoção, a confiança é recalculada e o
 * TrustCalculator pode reverter transições que dependiam desse voto
 * (ex.: APPROVED -> FLAGGED quando a confiança cai abaixo de 3).
 *  - sem voto existente -> devolve o estacionamento inalterado
 *  - sem guard de email: anular um voto não é um vetor de spam
 */
@injectable()
export class DeleteVoteUseCase {
    constructor(
        @inject(PARKING_TOKENS.IParkingRepository)
        private readonly parkingRepository: IParkingRepository,
        @inject(PARKING_TOKENS.ITrustCalculator)
        private readonly trustCalculator: ITrustCalculator,
        @inject(USER_TOKENS.PushService)
        private readonly pushService: PushService
    ) {}

    async execute(input: DeleteVoteInput): Promise<ParkingSpotEntity> {
        const spot = await this.parkingRepository.findById(input.parkingSpotId);
        if (!spot) {
            throw new ParkingNotFoundError();
        }

        const existing = await this.parkingRepository.getVote(input.userId, input.parkingSpotId);
        if (!existing) {
            return spot;
        }

        await this.parkingRepository.deleteVote(input.userId, input.parkingSpotId);

        const summary = await this.parkingRepository.getVoteSummary(input.parkingSpotId);
        const { trustScore, status: computedStatus } = this.trustCalculator.apply(
            spot.source,
            spot.status,
            summary
        );

        // Em fila de revisão manual: só o admin decide a aprovação
        const status = spot.requiresReview && computedStatus === 'APPROVED' ? 'PENDING' : computedStatus;

        const updated = await this.parkingRepository.update(input.parkingSpotId, { trustScore, status });
        if (!updated) {
            throw new ParkingNotFoundError();
        }

        this.notifyOnTransition(spot, status);

        return updated;
    }

    /** Transições automáticas por remoção de voto também avisam o contribuidor. */
    private notifyOnTransition(spot: ParkingSpotEntity, newStatus: string): void {
        if (newStatus === spot.status || !spot.contributorId) {
            return;
        }
        if (newStatus === 'APPROVED') {
            void this.pushService.notify(
                spot.contributorId,
                'Contribuição verificada',
                `A comunidade confirmou «${spot.name}». Já está verificado no mapa!`,
                { type: 'contribution_approved', spotId: spot.id }
            );
        } else if (newStatus === 'REJECTED') {
            void this.pushService.notify(
                spot.contributorId,
                'Contribuição rejeitada',
                `A comunidade rejeitou «${spot.name}».`,
                { type: 'contribution_rejected', spotId: spot.id }
            );
        } else if (newStatus === 'FLAGGED') {
            void this.pushService.notify(
                spot.contributorId,
                'Contribuição sinalizada',
                `«${spot.name}» foi sinalizado pela comunidade e vai ser revisto.`,
                { type: 'spot_flagged', spotId: spot.id }
            );
        }
    }
}
