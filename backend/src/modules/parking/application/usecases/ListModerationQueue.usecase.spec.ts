import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ListModerationQueueUseCase } from './ListModerationQueue.usecase';
import type { IParkingRepository } from '../../domain/repositories/IParking.repository';

describe('ListModerationQueueUseCase', () => {
    let useCase: ListModerationQueueUseCase;
    let mockParking: IParkingRepository;

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

        useCase = new ListModerationQueueUseCase(mockParking);
    });

    it('pede à lista PENDING/FLAGGED com requiresReview e a paginação dada', async () => {
        vi.mocked(mockParking.list).mockResolvedValue({ items: [], total: 0 });

        await useCase.execute({ page: 2, limit: 25 });

        expect(mockParking.list).toHaveBeenCalledWith({
            statuses: ['PENDING', 'FLAGGED'],
            requiresReview: true,
            page: 2,
            limit: 25,
        });
    });

    it('devolve os itens e o total do repositório', async () => {
        const items = [{ id: 'spot-1' }];
        vi.mocked(mockParking.list).mockResolvedValue({ items, total: 1 } as never);

        const result = await useCase.execute({ page: 1, limit: 50 });

        expect(result.total).toBe(1);
        expect(result.items).toEqual(items);
    });
});
