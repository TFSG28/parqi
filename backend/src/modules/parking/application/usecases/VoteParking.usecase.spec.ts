import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VoteParkingUseCase } from './VoteParking.usecase';
import { TrustCalculator } from '../../infrastructure/services/TrustCalculator.service';
import { ParkingNotFoundError } from '../../domain/errors/ParkingNotFound.error';
import { InvalidParkingActionError } from '../../domain/errors/InvalidParkingAction.error';
import { ForbiddenError } from '../../../../shared/errors/AppError';
import type { IParkingRepository } from '../../domain/repositories/IParking.repository';
import type { IReputationService } from '../../domain/services/IReputation.service';
import type { IUserRepository } from '../../../user/domain/repositories/IUser.repository';
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

describe('VoteParkingUseCase', () => {
    let useCase: VoteParkingUseCase;
    let mockRepository: IParkingRepository;
    let mockReputation: IReputationService;
    let mockUserRepository: IUserRepository;

    beforeEach(() => {
        mockUserRepository = {
            findById: vi.fn().mockResolvedValue({ id: 'user-1', emailVerified: true }),
            findByEmail: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        } as unknown as IUserRepository;
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
            getVoteSummary: vi.fn(),
            createModerationLog: vi.fn(),
            countUserContributionsSince: vi.fn().mockResolvedValue(0),
            countUserVotesSince: vi.fn().mockResolvedValue(0),
            getContributorStats: vi.fn(),
        } as unknown as IParkingRepository;

        mockReputation = {
            getForUser: vi.fn().mockResolvedValue({
                score: 5,
                isTrusted: true,
                isNew: false,
                voteWeight: 1,
            }),
        };

        useCase = new VoteParkingUseCase(
            mockRepository,
            new TrustCalculator(),
            mockReputation,
            mockUserRepository
        );
    });

    it('upvotes sucessivos levam a contribuição PENDING a APPROVED', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(makeSpot());
        vi.mocked(mockRepository.upsertVote).mockResolvedValue({
            id: 'v1',
            value: 1,
            reason: null,
            weight: 1,
            createdAt: new Date(),
        });
        vi.mocked(mockRepository.getVoteSummary).mockResolvedValue({ upvotes: 2, downvotes: 0 });
        vi.mocked(mockRepository.update).mockResolvedValue(makeSpot({ status: 'APPROVED', trustScore: 5 }));

        const result = await useCase.execute({
            parkingSpotId: 'spot-1',
            userId: 'user-1',
            value: 1,
        });

        expect(mockRepository.upsertVote).toHaveBeenCalledWith('user-1', 'spot-1', 1, null, 1);
        expect(mockRepository.update).toHaveBeenCalledWith(
            'spot-1',
            expect.objectContaining({ status: 'APPROVED', trustScore: 5 })
        );
        expect(result.status).toBe('APPROVED');
    });

    it('voto negativo com motivo faz a confiança descer (aprovado vira flag)', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(makeSpot({ status: 'APPROVED', trustScore: 5 }));
        vi.mocked(mockRepository.upsertVote).mockResolvedValue({
            id: 'v1',
            value: -1,
            reason: 'Local já não existe',
            weight: 1,
            createdAt: new Date(),
        });
        // 2 (base) + 1*1.5 - 1*2 = 1.5 -> FLAGGED
        vi.mocked(mockRepository.getVoteSummary).mockResolvedValue({ upvotes: 1, downvotes: 1 });
        vi.mocked(mockRepository.update).mockResolvedValue(makeSpot({ status: 'FLAGGED', trustScore: 1.5 }));

        const result = await useCase.execute({
            parkingSpotId: 'spot-1',
            userId: 'user-1',
            value: -1,
            reason: 'Local já não existe',
        });

        expect(mockRepository.upsertVote).toHaveBeenCalledWith('user-1', 'spot-1', -1, 'Local já não existe', 1);
        expect(mockRepository.update).toHaveBeenCalledWith(
            'spot-1',
            expect.objectContaining({ status: 'FLAGGED', trustScore: 1.5 })
        );
        expect(result.status).toBe('FLAGGED');
    });

    it('voto de utilizador novo tem peso 0.5 e não auto-aprova spots em revisão manual', async () => {
        vi.mocked(mockReputation.getForUser).mockResolvedValue({
            score: 0,
            isTrusted: false,
            isNew: true,
            voteWeight: 0.5,
        });
        vi.mocked(mockRepository.findById).mockResolvedValue(
            makeSpot({ requiresReview: true, status: 'PENDING' })
        );
        vi.mocked(mockRepository.upsertVote).mockResolvedValue({
            id: 'v1',
            value: 1,
            reason: null,
            weight: 0.5,
            createdAt: new Date(),
        });
        // peso 0.5: base 2 + 2*0.5*1.5 = 3.5 < 5 -> PENDING mantém-se
        vi.mocked(mockRepository.getVoteSummary).mockResolvedValue({ upvotes: 1, downvotes: 0 });
        vi.mocked(mockRepository.update).mockResolvedValue(makeSpot({ status: 'PENDING', trustScore: 2.8 }));

        await useCase.execute({ parkingSpotId: 'spot-1', userId: 'user-novo', value: 1 });

        expect(mockRepository.upsertVote).toHaveBeenCalledWith('user-novo', 'spot-1', 1, null, 0.5);
        expect(mockRepository.update).toHaveBeenCalledWith(
            'spot-1',
            expect.objectContaining({ status: 'PENDING' })
        );
    });

    it('bloqueia votos de contas com email não verificado', async () => {
        vi.mocked(mockUserRepository.findById).mockResolvedValue({
            id: 'user-1',
            emailVerified: false,
        } as never);
        vi.mocked(mockRepository.findById).mockResolvedValue(makeSpot());

        await expect(
            useCase.execute({ parkingSpotId: 'spot-1', userId: 'user-1', value: 1 })
        ).rejects.toThrow(ForbiddenError);
        expect(mockRepository.upsertVote).not.toHaveBeenCalled();
    });

    it('não permite votar na própria contribuição', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(makeSpot({ contributorId: 'user-1' }));

        await expect(
            useCase.execute({ parkingSpotId: 'spot-1', userId: 'user-1', value: 1 })
        ).rejects.toThrow(InvalidParkingActionError);
        expect(mockRepository.upsertVote).not.toHaveBeenCalled();
    });

    it('lança erro ao votar em estacionamento rejeitado', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(makeSpot({ status: 'REJECTED' }));

        await expect(
            useCase.execute({ parkingSpotId: 'spot-1', userId: 'user-1', value: 1 })
        ).rejects.toThrow(InvalidParkingActionError);
    });

    it('bloqueia votos acima do limite diário', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(makeSpot());
        vi.mocked(mockRepository.countUserVotesSince).mockResolvedValue(30);

        await expect(
            useCase.execute({ parkingSpotId: 'spot-1', userId: 'user-1', value: 1 })
        ).rejects.toThrow(/limite diário/);

        expect(mockRepository.upsertVote).not.toHaveBeenCalled();
    });

    it('lança erro se o estacionamento não existe', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(null);

        await expect(
            useCase.execute({ parkingSpotId: 'nope', userId: 'user-1', value: 1 })
        ).rejects.toThrow(ParkingNotFoundError);
    });
});
