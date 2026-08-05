import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateParkingUseCase } from './CreateParking.usecase';
import { TrustCalculator } from '../../infrastructure/services/TrustCalculator.service';
import { DuplicateParkingError } from '../../domain/errors/DuplicateParking.error';
import { InvalidCoordinatesError } from '../../domain/errors/InvalidCoordinates.error';
import type { IParkingRepository } from '../../domain/repositories/IParking.repository';
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
    source: 'COMMUNITY',
    externalId: null,
    status: 'PENDING',
    trustScore: 2,
    duplicateOfId: null,
    contributorId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe('CreateParkingUseCase', () => {
    let useCase: CreateParkingUseCase;
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

        useCase = new CreateParkingUseCase(mockRepository, new TrustCalculator());
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
        // centroide aproximado do quadrado
        // centroide aproximado: média dos 5 vértices do anel fechado
        const calledLatLng = vi.mocked(mockRepository.findNearby).mock.calls[0];
        expect(calledLatLng[0]).toBeCloseTo(41.4414, 4);
        expect(calledLatLng[1]).toBeCloseTo(-8.2906, 4);
    });
});
