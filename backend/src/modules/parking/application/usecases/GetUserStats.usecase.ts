import { inject, injectable } from 'tsyringe';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { IParkingRepository } from '../../domain/repositories/IParking.repository';
import { IReputationService } from '../../domain/services/IReputation.service';

export interface GetUserStatsInput {
    userId: string;
}

@injectable()
export class GetUserStatsUseCase {
    constructor(
        @inject(PARKING_TOKENS.IParkingRepository)
        private readonly parkingRepository: IParkingRepository,
        @inject(PARKING_TOKENS.IReputationService)
        private readonly reputationService: IReputationService
    ) {}

    async execute(input: GetUserStatsInput) {
        const [stats, reputation] = await Promise.all([
            this.parkingRepository.getContributorStats(input.userId),
            this.reputationService.getForUser(input.userId),
        ]);

        return {
            total: stats.total,
            approved: stats.approved,
            pending: stats.pending,
            rejected: stats.rejected,
            flagged: stats.flagged,
            approvedRate: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0,
            avgTrustApproved: stats.avgTrustApproved,
            votesGiven: stats.votesGiven,
            votesReceivedUp: stats.votesReceivedUp,
            votesReceivedDown: stats.votesReceivedDown,
            reputation,
        };
    }
}
