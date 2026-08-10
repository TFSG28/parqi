import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModerateParkingUseCase } from './ModerateParking.usecase';
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
        status: 'FLAGGED',
        trustScore: 1.5,
        requiresReview: true,
        duplicateOfId: null,
        contributorId: 'user-2',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

describe('ModerateParkingUseCase', () => {
    let useCase: ModerateParkingUseCase;
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
            getVoteSummary: vi.fn(),
            createModerationLog: vi.fn(),
            countUserContributionsSince: vi.fn(),
            countUserVotesSince: vi.fn(),
            getContributorStats: vi.fn(),
        } as unknown as IParkingRepository;

        const mockPush = { notify: vi.fn(), registerToken: vi.fn() } as unknown as import('../../../user/infrastructure/services/Push.service').PushService;
        useCase = new ModerateParkingUseCase(mockRepository, mockPush);
    });

    it('aprova um estacionamento flagado e regista o log', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(makeSpot());
        vi.mocked(mockRepository.update).mockResolvedValue(makeSpot({ status: 'APPROVED', trustScore: 5 }));

        const result = await useCase.execute({
            parkingSpotId: 'spot-1',
            moderatorId: 'admin-1',
            action: 'APPROVE',
            reason: 'Verificado no local',
        });

        expect(mockRepository.update).toHaveBeenCalledWith(
            'spot-1',
            expect.objectContaining({ status: 'APPROVED', trustScore: 5, requiresReview: false })
        );
        expect(mockRepository.createModerationLog).toHaveBeenCalledWith(
            'spot-1',
            'admin-1',
            'APPROVE',
            'Verificado no local'
        );
        expect(result.status).toBe('APPROVED');
    });

    it('rejeita e regista o log', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(makeSpot());
        vi.mocked(mockRepository.update).mockResolvedValue(makeSpot({ status: 'REJECTED' }));

        await useCase.execute({
            parkingSpotId: 'spot-1',
            moderatorId: 'admin-1',
            action: 'REJECT',
            reason: 'Duplicado do parque X',
        });

        expect(mockRepository.update).toHaveBeenCalledWith(
            'spot-1',
            expect.objectContaining({ status: 'REJECTED' })
        );
        expect(mockRepository.createModerationLog).toHaveBeenCalledWith(
            'spot-1',
            'admin-1',
            'REJECT',
            'Duplicado do parque X'
        );
    });

    it('lança erro se o estacionamento não existe', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(null);

        await expect(
            useCase.execute({ parkingSpotId: 'nope', moderatorId: 'admin-1', action: 'APPROVE' })
        ).rejects.toThrow(ParkingNotFoundError);
    });
});
