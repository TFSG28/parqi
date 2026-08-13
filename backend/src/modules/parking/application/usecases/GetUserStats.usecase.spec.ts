import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetUserStatsUseCase } from './GetUserStats.usecase';
import type { IParkingRepository } from '../../domain/repositories/IParking.repository';
import type { IReputationService } from '../../domain/services/IReputation.service';

describe('GetUserStatsUseCase', () => {
    let useCase: GetUserStatsUseCase;
    let mockParking: IParkingRepository;
    let mockReputation: IReputationService;

    beforeEach(() => {
        mockParking = {
            create: vi.fn(),
            findById: vi.fn(),
            findByExternalId: vi.fn(),
            findNearby: vi.fn(),
            list: vi.fn(),
            getGeometry: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            getVote: vi.fn(),
            upsertVote: vi.fn(),
            getVoteSummary: vi.fn(),
            createModerationLog: vi.fn(),
            countUserContributionsSince: vi.fn(),
            countUserVotesSince: vi.fn(),
            getContributorStats: vi.fn(),
        } as unknown as IParkingRepository;

        mockReputation = {
            getForUser: vi.fn().mockResolvedValue({
                score: 6,
                isTrusted: true,
                isNew: false,
                voteWeight: 1,
            }),
        };

        useCase = new GetUserStatsUseCase(mockParking, mockReputation);
    });

    it('agrega contribuições e reputação, com taxa de aprovação arredondada', async () => {
        vi.mocked(mockParking.getContributorStats).mockResolvedValue({
            total: 7,
            approved: 5,
            pending: 1,
            rejected: 1,
            flagged: 0,
            avgTrustApproved: 4.2,
            votesGiven: 12,
            votesReceivedUp: 9,
            votesReceivedDown: 1,
        });

        const result = await useCase.execute({ userId: 'user-1' });

        expect(result).toMatchObject({
            total: 7,
            approved: 5,
            pending: 1,
            rejected: 1,
            flagged: 0,
            // 5/7 = 71.4% -> 71
            approvedRate: 71,
            avgTrustApproved: 4.2,
            votesGiven: 12,
            votesReceivedUp: 9,
            votesReceivedDown: 1,
            reputation: { score: 6, isTrusted: true },
        });
    });

    it('taxa de aprovação é 0 quando não há contribuições', async () => {
        vi.mocked(mockParking.getContributorStats).mockResolvedValue({
            total: 0,
            approved: 0,
            pending: 0,
            rejected: 0,
            flagged: 0,
            avgTrustApproved: 0,
            votesGiven: 0,
            votesReceivedUp: 0,
            votesReceivedDown: 0,
        });

        const result = await useCase.execute({ userId: 'user-1' });

        expect(result.approvedRate).toBe(0);
        expect(result.total).toBe(0);
    });
});
