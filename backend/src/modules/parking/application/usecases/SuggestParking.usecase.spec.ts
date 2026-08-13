import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SuggestParkingUseCase } from './SuggestParking.usecase';
import { ParkingNotFoundError } from '../../domain/errors/ParkingNotFound.error';
import { InvalidParkingActionError } from '../../domain/errors/InvalidParkingAction.error';
import { ForbiddenError } from '../../../../shared/errors/AppError';
import type { IParkingRepository } from '../../domain/repositories/IParking.repository';
import type { ISuggestionRepository } from '../../domain/repositories/ISuggestion.repository';
import type { IReputationService } from '../../domain/services/IReputation.service';
import type { ITrustCalculator } from '../../domain/services/ITrustCalculator.service';
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

describe('SuggestParkingUseCase (modelo híbrido por reputação)', () => {
    let useCase: SuggestParkingUseCase;
    let mockParking: IParkingRepository;
    let mockSuggestions: ISuggestionRepository;
    let mockReputation: IReputationService;
    let mockTrust: ITrustCalculator;
    let mockUsers: IUserRepository;

    const trusted = { score: 7, isTrusted: true, isNew: false, voteWeight: 1 };
    const untrusted = { score: 2, isTrusted: false, isNew: false, voteWeight: 1 };

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

        mockSuggestions = {
            create: vi.fn(),
            findById: vi.fn(),
            listByStatus: vi.fn(),
            update: vi.fn(),
        } as unknown as ISuggestionRepository;

        mockReputation = { getForUser: vi.fn().mockResolvedValue(trusted) };
        mockTrust = { baseTrust: vi.fn().mockReturnValue(2), apply: vi.fn() };

        mockUsers = {
            findById: vi.fn().mockResolvedValue({ id: 'user-1', emailVerified: true, isActive: true }),
            findByEmail: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        } as unknown as IUserRepository;

        useCase = new SuggestParkingUseCase(
            mockParking,
            mockSuggestions,
            mockReputation,
            mockTrust,
            mockUsers
        );
    });

    it('admin aplica a alteração já: parque volta a PENDING com confiança base', async () => {
        vi.mocked(mockParking.findById).mockResolvedValue(makeSpot());
        vi.mocked(mockParking.update).mockResolvedValue(
            makeSpot({ status: 'PENDING', trustScore: 2 })
        );

        const result = await useCase.execute({
            parkingSpotId: 'spot-1',
            userId: 'admin-1',
            userRole: 'ADMIN',
            data: { name: 'Novo nome' },
        });

        expect(result).toEqual({ applied: true, spot: expect.objectContaining({ status: 'PENDING' }) });
        expect(mockParking.update).toHaveBeenCalledWith(
            'spot-1',
            expect.objectContaining({ status: 'PENDING', trustScore: 2, name: 'Novo nome' })
        );
        expect(mockSuggestions.create).not.toHaveBeenCalled();
    });

    it('membro confiável aplica diretamente sem passar pela fila', async () => {
        vi.mocked(mockParking.findById).mockResolvedValue(makeSpot());
        vi.mocked(mockParking.update).mockResolvedValue(makeSpot({ status: 'PENDING' }));

        const result = await useCase.execute({
            parkingSpotId: 'spot-1',
            userId: 'user-1',
            data: { isFree: true },
        });

        expect(result.applied).toBe(true);
        expect(mockSuggestions.create).not.toHaveBeenCalled();
    });

    it('membro sem reputação propõe uma sugestão que entra na fila', async () => {
        vi.mocked(mockReputation.getForUser).mockResolvedValue(untrusted);
        vi.mocked(mockParking.findById).mockResolvedValue(makeSpot());
        vi.mocked(mockSuggestions.create).mockResolvedValue({
            id: 'sug-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            data: { isFree: true },
            status: 'PENDING',
            reason: 'Fica ao lado do mercado',
            reviewedAt: null,
            parkingSpotId: 'spot-1',
            suggestedById: 'user-1',
            reviewedById: null,
        });

        const result = await useCase.execute({
            parkingSpotId: 'spot-1',
            userId: 'user-1',
            data: { isFree: true, reason: 'Fica ao lado do mercado' },
        });

        expect(result.applied).toBe(false);
        expect(mockSuggestions.create).toHaveBeenCalledWith({
            data: { isFree: true },
            reason: 'Fica ao lado do mercado',
            parkingSpotId: 'spot-1',
            suggestedById: 'user-1',
        });
        expect(mockParking.update).not.toHaveBeenCalled();
    });

    it('lança erro se o estacionamento não existe', async () => {
        vi.mocked(mockParking.findById).mockResolvedValue(null);

        await expect(
            useCase.execute({ parkingSpotId: 'nope', userId: 'user-1', data: {} })
        ).rejects.toThrow(ParkingNotFoundError);
    });

    it('bloqueia sugestões em estacionamentos rejeitados', async () => {
        vi.mocked(mockParking.findById).mockResolvedValue(makeSpot({ status: 'REJECTED' }));

        await expect(
            useCase.execute({ parkingSpotId: 'spot-1', userId: 'user-1', data: {} })
        ).rejects.toThrow(InvalidParkingActionError);
    });

    it('bloqueia contas com email não verificado', async () => {
        vi.mocked(mockUsers.findById).mockResolvedValue({
            id: 'user-1',
            emailVerified: false,
        } as never);

        await expect(
            useCase.execute({ parkingSpotId: 'spot-1', userId: 'user-1', data: {} })
        ).rejects.toThrow(ForbiddenError);
        expect(mockParking.update).not.toHaveBeenCalled();
        expect(mockSuggestions.create).not.toHaveBeenCalled();
    });
});
