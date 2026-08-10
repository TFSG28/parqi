import { inject, injectable } from 'tsyringe';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { IUserRepository } from '../../../user/domain/repositories/IUser.repository';
import { IParkingRepository } from '../../domain/repositories/IParking.repository';
import { ITrustCalculator } from '../../domain/services/ITrustCalculator.service';
import { IReputationService } from '../../domain/services/IReputation.service';
import { assertEmailVerified } from '../../../auth/application/guards/email-verified.guard';
import { PushService } from '../../../user/infrastructure/services/Push.service';
import { ParkingSpotEntity } from '../../domain/entities/ParkingSpot.entity';
import { ParkingNotFoundError } from '../../domain/errors/ParkingNotFound.error';
import { InvalidParkingActionError } from '../../domain/errors/InvalidParkingAction.error';
import { TooManyRequestsError } from '../../../../shared/errors/AppError';
import { CONTRIBUTION_LIMITS } from '../../domain/const';

export interface VoteParkingInput {
    parkingSpotId: string;
    userId: string;
    userRole?: string;
    value: 1 | -1;
    reason?: string;
}

/**
 * Voto da comunidade (1 ou -1). Após cada voto, a confiança é recalculada
 * e o TrustCalculator decide a transição de estado (aprovação/flag automática).
 *  - limite diário de votos (anti-spam)
 *  - o peso do voto depende da reputação do votante
 *  - spots em revisão manual (contas novas) nunca auto-aprovam
 */
@injectable()
export class VoteParkingUseCase {
    constructor(
        @inject(PARKING_TOKENS.IParkingRepository)
        private readonly parkingRepository: IParkingRepository,
        @inject(PARKING_TOKENS.ITrustCalculator)
        private readonly trustCalculator: ITrustCalculator,
        @inject(PARKING_TOKENS.IReputationService)
        private readonly reputationService: IReputationService,
        @inject(USER_TOKENS.IUserRepository)
        private readonly userRepository: IUserRepository,
        @inject(USER_TOKENS.PushService)
        private readonly pushService: PushService
    ) {}

    async execute(input: VoteParkingInput): Promise<ParkingSpotEntity> {
        // A conta tem de ter o email validado (anti-spam)
        await assertEmailVerified(this.userRepository, input.userId, input.userRole, 'votar');

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

        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const votesToday = await this.parkingRepository.countUserVotesSince(input.userId, since);
        if (votesToday >= CONTRIBUTION_LIMITS.maxVotesPerDay) {
            throw new TooManyRequestsError(
                `Atingiste o limite diário de ${CONTRIBUTION_LIMITS.maxVotesPerDay} votos. Volta amanhã.`
            );
        }

        const reputation = await this.reputationService.getForUser(input.userId);
        await this.parkingRepository.upsertVote(
            input.userId,
            input.parkingSpotId,
            input.value,
            input.reason ?? null,
            reputation.voteWeight
        );

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

    /** Transições automáticas por votos também avisam o contribuidor. */
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
