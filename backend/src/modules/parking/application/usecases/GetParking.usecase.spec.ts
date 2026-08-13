import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetParkingUseCase } from './GetParking.usecase';
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
        status: 'APPROVED',
        trustScore: 6,
        requiresReview: false,
        duplicateOfId: null,
        contributorId: 'user-2',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

describe('GetParkingUseCase', () => {
    let useCase: GetParkingUseCase;
    let mockRepository: IParkingRepository;

    beforeEach(() => {
        mockRepository = {
            create: vi.fn(),
            findById: vi.fn(),
            findByExternalId: vi.fn(),
            findNearby: vi.fn(),
            list: vi.fn(),
            getGeometry: vi.fn().mockResolvedValue(null),
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

        useCase = new GetParkingUseCase(mockRepository);
    });

    it('inclui myVote do utilizador quando está autenticado', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(makeSpot());
        vi.mocked(mockRepository.getVote).mockResolvedValue({
            id: 'v1',
            value: 1,
            reason: null,
            weight: 1,
            createdAt: new Date(),
        });

        const result = await useCase.execute({ parkingSpotId: 'spot-1', userId: 'user-1' });

        expect(result.myVote).toBe('up');
        expect(mockRepository.getVote).toHaveBeenCalledWith('user-1', 'spot-1');
    });

    it('myVote é null para visitantes (sem userId)', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(makeSpot());

        const result = await useCase.execute({ parkingSpotId: 'spot-1' });

        expect(result.myVote).toBeNull();
        expect(mockRepository.getVote).not.toHaveBeenCalled();
    });

    it('myVote é null quando o utilizador não votou', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(makeSpot());
        vi.mocked(mockRepository.getVote).mockResolvedValue(null);

        const result = await useCase.execute({ parkingSpotId: 'spot-1', userId: 'user-1' });

        expect(result.myVote).toBeNull();
    });

    it('oculta estacionamentos rejeitados a não-proprietários', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(makeSpot({ status: 'REJECTED' }));

        await expect(
            useCase.execute({ parkingSpotId: 'spot-1', userId: 'user-1' })
        ).rejects.toThrow(ParkingNotFoundError);
    });

    it('lança erro se o estacionamento não existe', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(null);

        await expect(
            useCase.execute({ parkingSpotId: 'nope' })
        ).rejects.toThrow(ParkingNotFoundError);
    });
});
