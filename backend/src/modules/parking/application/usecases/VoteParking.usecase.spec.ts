import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VoteParkingUseCase } from './VoteParking.usecase';
import { TrustCalculator } from '../../infrastructure/services/TrustCalculator.service';
import { ParkingNotFoundError } from '../../domain/errors/ParkingNotFound.error';
import { InvalidParkingActionError } from '../../domain/errors/InvalidParkingAction.error';
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
        source: 'COMMUNITY',
        externalId: null,
        status: 'PENDING',
        trustScore: 2,
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
        } as unknown as IParkingRepository;

        useCase = new VoteParkingUseCase(mockRepository, new TrustCalculator());
    });

    it('upvotes sucessivos levam a contribuição PENDING a APPROVED', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(makeSpot());
        vi.mocked(mockRepository.upsertVote).mockResolvedValue({
            id: 'v1',
            value: 1,
            reason: null,
            createdAt: new Date(),
        });
        vi.mocked(mockRepository.getVoteSummary).mockResolvedValue({ upvotes: 2, downvotes: 0 });
        vi.mocked(mockRepository.update).mockResolvedValue(makeSpot({ status: 'APPROVED', trustScore: 5 }));

        const result = await useCase.execute({
            parkingSpotId: 'spot-1',
            userId: 'user-1',
            value: 1,
        });

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

        expect(mockRepository.upsertVote).toHaveBeenCalledWith('user-1', 'spot-1', -1, 'Local já não existe');
        expect(mockRepository.update).toHaveBeenCalledWith(
            'spot-1',
            expect.objectContaining({ status: 'FLAGGED', trustScore: 1.5 })
        );
        expect(result.status).toBe('FLAGGED');
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

    it('lança erro se o estacionamento não existe', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(null);

        await expect(
            useCase.execute({ parkingSpotId: 'nope', userId: 'user-1', value: 1 })
        ).rejects.toThrow(ParkingNotFoundError);
    });
});
