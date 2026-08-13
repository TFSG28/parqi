import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeleteVoteUseCase } from './DeleteVote.usecase';
import { TrustCalculator } from '../../infrastructure/services/TrustCalculator.service';
import { ParkingNotFoundError } from '../../domain/errors/ParkingNotFound.error';
import type { IParkingRepository } from '../../domain/repositories/IParking.repository';
import type { ParkingSpotEntity } from '../../domain/entities/ParkingSpot.entity';

function makeSpot(overrides: Partial<ParkingSpotEntity> = {}): ParkingSpotEntity {
    return {
        id: 'spot-1',
        name: 'Parque',
        description: null,
        latitude: 41.442,
        longitude: -8.291,
        geometryType: 'POINT',
        parkingType: 'SURFACE',
        capacityRange: null,
        isFree: null,
        hasPregnantSpaces: null,
        hasDisabledSpaces: null,
        hasEvCharging: null,
        isCovered: null,
        source: 'COMMUNITY',
        externalId: null,
        status: 'PENDING',
        trustScore: 2,
        requiresReview: false,
        duplicateOfId: null,
        contributorId: 'user-2',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

describe('DeleteVoteUseCase', () => {
    let useCase: DeleteVoteUseCase;
    let mockRepository: IParkingRepository;

    beforeEach(() => {
        mockRepository = {
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
            deleteVote: vi.fn(),
            getVoteSummary: vi.fn(),
            createModerationLog: vi.fn(),
            countUserContributionsSince: vi.fn(),
            countUserVotesSince: vi.fn(),
            getContributorStats: vi.fn(),
        } as unknown as IParkingRepository;

        const mockPush = { notify: vi.fn(), registerToken: vi.fn() } as unknown as import('../../../user/infrastructure/services/Push.service').PushService;
        useCase = new DeleteVoteUseCase(mockRepository, new TrustCalculator(), mockPush);
    });

    it('remove o voto e recalcula a confiança', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(makeSpot({ status: 'APPROVED', trustScore: 5 }));
        vi.mocked(mockRepository.getVote).mockResolvedValue({
            id: 'v1',
            value: 1,
            reason: null,
            weight: 1,
            createdAt: new Date(),
        });
        // Sem o voto: base 2 + 1 upvote * 1.5 = 3.5 -> continua APPROVED
        vi.mocked(mockRepository.getVoteSummary).mockResolvedValue({ upvotes: 1, downvotes: 0 });
        vi.mocked(mockRepository.update).mockResolvedValue(makeSpot({ status: 'APPROVED', trustScore: 3.5 }));

        const result = await useCase.execute({ parkingSpotId: 'spot-1', userId: 'user-1' });

        expect(mockRepository.deleteVote).toHaveBeenCalledWith('user-1', 'spot-1');
        expect(mockRepository.update).toHaveBeenCalledWith(
            'spot-1',
            expect.objectContaining({ status: 'APPROVED', trustScore: 3.5 })
        );
        expect(result.status).toBe('APPROVED');
    });

    it('anular o último voto pode sinalizar um aprovado (confiança < 3)', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(makeSpot({ status: 'APPROVED', trustScore: 3.5 }));
        vi.mocked(mockRepository.getVote).mockResolvedValue({
            id: 'v1',
            value: 1,
            reason: null,
            weight: 1,
            createdAt: new Date(),
        });
        // Sem o voto: base 2 + 0 upvotes = 2 -> FLAGGED
        vi.mocked(mockRepository.getVoteSummary).mockResolvedValue({ upvotes: 0, downvotes: 0 });
        vi.mocked(mockRepository.update).mockResolvedValue(makeSpot({ status: 'FLAGGED', trustScore: 2 }));

        const result = await useCase.execute({ parkingSpotId: 'spot-1', userId: 'user-1' });

        expect(mockRepository.update).toHaveBeenCalledWith(
            'spot-1',
            expect.objectContaining({ status: 'FLAGGED', trustScore: 2 })
        );
        expect(result.status).toBe('FLAGGED');
    });

    it('devolve o estacionamento inalterado quando o utilizador não votou', async () => {
        const spot = makeSpot({ status: 'APPROVED', trustScore: 5 });
        vi.mocked(mockRepository.findById).mockResolvedValue(spot);
        vi.mocked(mockRepository.getVote).mockResolvedValue(null);

        const result = await useCase.execute({ parkingSpotId: 'spot-1', userId: 'user-1' });

        expect(result).toBe(spot);
        expect(mockRepository.deleteVote).not.toHaveBeenCalled();
        expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('lança erro se o estacionamento não existe', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(null);

        await expect(
            useCase.execute({ parkingSpotId: 'nope', userId: 'user-1' })
        ).rejects.toThrow(ParkingNotFoundError);
        expect(mockRepository.deleteVote).not.toHaveBeenCalled();
    });
});
