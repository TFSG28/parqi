import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateParkingUseCase } from './CreateParking.usecase';
import { TrustCalculator } from '../../infrastructure/services/TrustCalculator.service';
import { DuplicateParkingError } from '../../domain/errors/DuplicateParking.error';
import { InvalidCoordinatesError } from '../../domain/errors/InvalidCoordinates.error';
import { ForbiddenError, ValidationError } from '../../../../shared/errors/AppError';
import type { IParkingRepository } from '../../domain/repositories/IParking.repository';
import type { IReputationService } from '../../domain/services/IReputation.service';
import type { IRoadValidator } from '../../domain/services/IRoadValidator.service';
import type { IUserRepository } from '../../../user/domain/repositories/IUser.repository';
import type { ParkingSpotEntity } from '../../domain/entities/ParkingSpot.entity';

const guimaraesPoint: { type: 'Point'; coordinates: [number, number] } = {
    type: 'Point',
    coordinates: [-8.291, 41.442],
};

const baseSpot: ParkingSpotEntity = {
    id: 'spot-1',
    name: 'Parque Guimarães',
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
    contributorId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
};

const contributorStats = {
    total: 5,
    approved: 5,
    pending: 0,
    rejected: 0,
    flagged: 0,
    votesReceivedUp: 0,
    votesReceivedDown: 0,
    votesGiven: 0,
    avgTrustApproved: 6,
};

describe('CreateParkingUseCase', () => {
    let useCase: CreateParkingUseCase;
    let mockRepository: IParkingRepository;
    let mockRoadValidator: IRoadValidator;
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
            getContributorStats: vi.fn().mockResolvedValue(contributorStats),
        } as unknown as IParkingRepository;

        mockRoadValidator = {
            validate: vi.fn().mockResolvedValue({ ok: true }),
        };
        mockReputation = {
            getForUser: vi.fn().mockResolvedValue({
                score: 0,
                isTrusted: false,
                isNew: false,
                voteWeight: 0.5,
            }),
        };

        useCase = new CreateParkingUseCase(
            mockRepository,
            new TrustCalculator(),
            mockRoadValidator,
            mockReputation,
            mockUserRepository
        );
    });

    it('cria uma contribuição PENDING com confiança base da comunidade', async () => {
        vi.mocked(mockRepository.findNearby).mockResolvedValue([]);
        vi.mocked(mockRepository.create).mockResolvedValue(baseSpot);

        const result = await useCase.execute({
            name: 'Parque Guimarães',
            geometry: guimaraesPoint,
            parkingType: 'SURFACE',
            userId: 'user-1',
        });

        expect(result.status).toBe('PENDING');
        expect(result.trustScore).toBe(2);
        expect(mockRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                source: 'COMMUNITY',
                status: 'PENDING',
                trustScore: 2,
                contributorId: 'user-1',
                requiresReview: false,
            })
        );
        // dedup foi verificado
        expect(mockRepository.findNearby).toHaveBeenCalled();
    });

    it('rejeita coordenadas fora de Portugal', async () => {
        await expect(
            useCase.execute({
                name: 'Central Park',
                geometry: { type: 'Point', coordinates: [-73.97, 40.78] },
                parkingType: 'SURFACE',
                userId: 'user-1',
            })
        ).rejects.toThrow(InvalidCoordinatesError);

        expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('rejeita contribuições duplicadas perto de um existente', async () => {
        vi.mocked(mockRepository.findNearby).mockResolvedValue([baseSpot]);

        await expect(
            useCase.execute({
                name: 'Parque Quase Igual',
                geometry: { type: 'Point', coordinates: [-8.2911, 41.4421] },
                parkingType: 'SURFACE',
                userId: 'user-1',
            })
        ).rejects.toThrow(DuplicateParkingError);

        expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('rejeita locais inválidos segundo a rede viária (autoestrada/berma)', async () => {
        vi.mocked(mockRepository.findNearby).mockResolvedValue([]);
        vi.mocked(mockRoadValidator.validate).mockResolvedValue({
            ok: false,
            reason: 'Este local está numa autoestrada ou via rápida, onde estacionar é proibido.',
        });

        await expect(
            useCase.execute({
                name: 'Berma da A1',
                geometry: { type: 'Point', coordinates: [-8.291, 41.442] },
                parkingType: 'STREET',
                userId: 'user-1',
            })
        ).rejects.toThrow(ValidationError);

        expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('bloqueia contribuições de contas suspensas', async () => {
        vi.mocked(mockUserRepository.findById).mockResolvedValue({
            id: 'user-1',
            isActive: false,
        } as never);

        await expect(
            useCase.execute({
                name: 'Parque Conta Suspensa',
                geometry: guimaraesPoint,
                parkingType: 'SURFACE',
                userId: 'user-1',
            })
        ).rejects.toThrow(ForbiddenError);

        expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('bloqueia contribuições acima do limite diário', async () => {
        vi.mocked(mockRepository.countUserContributionsSince).mockResolvedValue(10);

        await expect(
            useCase.execute({
                name: 'Parque Demais',
                geometry: guimaraesPoint,
                parkingType: 'SURFACE',
                userId: 'user-1',
            })
        ).rejects.toThrow(/limite diário/);

        expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('aceita polígonos e usa o centroide para o dedup', async () => {
        vi.mocked(mockRepository.findNearby).mockResolvedValue([]);
        vi.mocked(mockRepository.create).mockResolvedValue({ ...baseSpot, geometryType: 'POLYGON' });

        const ring: [number, number][] = [
            [-8.291, 41.441],
            [-8.290, 41.441],
            [-8.290, 41.442],
            [-8.291, 41.442],
            [-8.291, 41.441],
        ];

        await useCase.execute({
            name: 'Parque Polígono',
            geometry: { type: 'Polygon', coordinates: [ring] },
            parkingType: 'UNDERGROUND',
            userId: 'user-1',
        });

        const createCall = vi.mocked(mockRepository.create).mock.calls[0][0];
        expect(createCall.geometry.type).toBe('Polygon');
        // centroide aproximado: média dos 5 vértices do anel fechado
        const calledLatLng = vi.mocked(mockRepository.findNearby).mock.calls[0];
        expect(calledLatLng[0]).toBeCloseTo(41.4414, 4);
        expect(calledLatLng[1]).toBeCloseTo(-8.2906, 4);
    });
});
