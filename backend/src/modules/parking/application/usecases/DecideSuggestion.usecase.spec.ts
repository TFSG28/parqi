import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DecideSuggestionUseCase } from './DecideSuggestion.usecase';
import { NotFoundError, ValidationError } from '../../../../shared/errors/AppError';
import type { IParkingRepository } from '../../domain/repositories/IParking.repository';
import type { ISuggestionRepository, ParkingSuggestionEntity } from '../../domain/repositories/ISuggestion.repository';
import type { ITrustCalculator } from '../../domain/services/ITrustCalculator.service';
import type { ParkingSpotEntity } from '../../domain/entities/ParkingSpot.entity';

function makeSuggestion(overrides: Partial<ParkingSuggestionEntity> = {}): ParkingSuggestionEntity {
    return {
        id: 'sug-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        data: { name: 'Parque Central' },
        status: 'PENDING',
        reason: null,
        reviewedAt: null,
        parkingSpotId: 'spot-1',
        suggestedById: 'user-2',
        reviewedById: null,
        ...overrides,
    };
}

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
        trustScore: 5,
        requiresReview: false,
        duplicateOfId: null,
        contributorId: 'user-2',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

describe('DecideSuggestionUseCase', () => {
    let useCase: DecideSuggestionUseCase;
    let mockSuggestions: ISuggestionRepository;
    let mockParking: IParkingRepository;
    let mockTrust: ITrustCalculator;
    let mockPush: { notify: ReturnType<typeof vi.fn>; registerToken: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        mockSuggestions = {
            create: vi.fn(),
            findById: vi.fn(),
            listByStatus: vi.fn(),
            update: vi.fn(),
        } as unknown as ISuggestionRepository;

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

        mockTrust = { baseTrust: vi.fn().mockReturnValue(2), apply: vi.fn() };
        mockPush = { notify: vi.fn().mockResolvedValue(undefined), registerToken: vi.fn() };

        useCase = new DecideSuggestionUseCase(
            mockSuggestions,
            mockParking,
            mockTrust,
            mockPush as never
        );
    });

    it('aprova: aplica o diff ao parque (volta a PENDING) e avisa o autor', async () => {
        vi.mocked(mockSuggestions.findById).mockResolvedValue(makeSuggestion());
        vi.mocked(mockParking.findById).mockResolvedValue(makeSpot());
        vi.mocked(mockParking.update).mockResolvedValue(makeSpot({ status: 'PENDING', trustScore: 2 }));
        vi.mocked(mockSuggestions.update).mockResolvedValue(
            makeSuggestion({ status: 'APPROVED', reviewedById: 'admin-1' })
        );

        const result = await useCase.execute({
            suggestionId: 'sug-1',
            moderatorId: 'admin-1',
            action: 'APPROVE',
        });

        expect(mockParking.update).toHaveBeenCalledWith(
            'spot-1',
            expect.objectContaining({ name: 'Parque Central', status: 'PENDING', trustScore: 2 })
        );
        expect(mockSuggestions.update).toHaveBeenCalledWith(
            'sug-1',
            expect.objectContaining({ status: 'APPROVED', reviewedById: 'admin-1' })
        );
        expect(mockPush.notify).toHaveBeenCalledWith(
            'user-2',
            'Sugestão aplicada',
            expect.stringContaining('aplicada'),
            { type: 'suggestion_decided', spotId: 'spot-1' }
        );
        expect(result.status).toBe('APPROVED');
    });

    it('rejeita: não toca no parque e avisa o autor com o motivo', async () => {
        vi.mocked(mockSuggestions.findById).mockResolvedValue(makeSuggestion());
        vi.mocked(mockSuggestions.update).mockResolvedValue(
            makeSuggestion({ status: 'REJECTED', reason: 'Nome já em uso', reviewedById: 'admin-1' })
        );

        await useCase.execute({
            suggestionId: 'sug-1',
            moderatorId: 'admin-1',
            action: 'REJECT',
            reason: 'Nome já em uso',
        });

        expect(mockParking.update).not.toHaveBeenCalled();
        expect(mockPush.notify).toHaveBeenCalledWith(
            'user-2',
            'Sugestão rejeitada',
            expect.stringContaining('Nome já em uso'),
            { type: 'suggestion_decided', spotId: 'spot-1' }
        );
    });

    it('bloqueia decisões duplicadas', async () => {
        vi.mocked(mockSuggestions.findById).mockResolvedValue(
            makeSuggestion({ status: 'APPROVED' })
        );

        await expect(
            useCase.execute({ suggestionId: 'sug-1', moderatorId: 'admin-1', action: 'APPROVE' })
        ).rejects.toThrow(ValidationError);
    });

    it('lança erro se a sugestão não existe', async () => {
        vi.mocked(mockSuggestions.findById).mockResolvedValue(null);

        await expect(
            useCase.execute({ suggestionId: 'nope', moderatorId: 'admin-1', action: 'APPROVE' })
        ).rejects.toThrow(NotFoundError);
    });

    it('lança erro ao aprovar sugestão cujo parque já não existe', async () => {
        vi.mocked(mockSuggestions.findById).mockResolvedValue(makeSuggestion());
        vi.mocked(mockParking.findById).mockResolvedValue(null);

        await expect(
            useCase.execute({ suggestionId: 'sug-1', moderatorId: 'admin-1', action: 'APPROVE' })
        ).rejects.toThrow(NotFoundError);
        expect(mockSuggestions.update).not.toHaveBeenCalled();
    });
});
