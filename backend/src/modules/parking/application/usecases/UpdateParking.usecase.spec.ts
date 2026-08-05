import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateParkingUseCase } from './UpdateParking.usecase';
import { ParkingNotFoundError } from '../../domain/errors/ParkingNotFound.error';
import { DuplicateParkingError } from '../../domain/errors/DuplicateParking.error';
import { InvalidCoordinatesError } from '../../domain/errors/InvalidCoordinates.error';
import { ForbiddenError } from '../../../../shared/errors/AppError';
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
        status: 'APPROVED',
        trustScore: 6,
        duplicateOfId: null,
        contributorId: 'user-2',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

describe('UpdateParkingUseCase', () => {
    let useCase: UpdateParkingUseCase;
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

        useCase = new UpdateParkingUseCase(mockRepository);
    });

    it('não permite que terceiros editem', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(makeSpot());

        await expect(
            useCase.execute({
                parkingSpotId: 'spot-1',
                userId: 'intruso',
                data: { name: 'Hack' },
            })
        ).rejects.toThrow(ForbiddenError);
    });

    it('edição do autor de um spot aprovado reverte para PENDING', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(makeSpot());
        vi.mocked(mockRepository.update).mockResolvedValue(makeSpot({ status: 'PENDING', trustScore: 2 }));

        await useCase.execute({
            parkingSpotId: 'spot-1',
            userId: 'user-2',
            data: { name: 'Nome novo' },
        });

        expect(mockRepository.update).toHaveBeenCalledWith(
            'spot-1',
            expect.objectContaining({ name: 'Nome novo', status: 'PENDING', trustScore: 2 })
        );
    });

    it('admin pode editar sem reverter o estado', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(makeSpot());
        vi.mocked(mockRepository.update).mockResolvedValue(makeSpot({ name: 'Renomeado' }));

        await useCase.execute({
            parkingSpotId: 'spot-1',
            userId: 'admin-1',
            userRole: 'ADMIN',
            data: { name: 'Renomeado' },
        });

        expect(mockRepository.update).toHaveBeenCalledWith(
            'spot-1',
            expect.not.objectContaining({ status: 'PENDING' })
        );
    });

    it('revalida coordenadas e duplicados quando a geometria muda', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(makeSpot({ status: 'PENDING' }));
        vi.mocked(mockRepository.findNearby).mockResolvedValue([makeSpot({ id: 'outro' })]);

        await expect(
            useCase.execute({
                parkingSpotId: 'spot-1',
                userId: 'user-2',
                data: {
                    geometry: { type: 'Point', coordinates: [-8.291, 41.442] },
                },
            })
        ).rejects.toThrow(DuplicateParkingError);
    });

    it('rejeita geometria fora de Portugal', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(makeSpot({ status: 'PENDING' }));

        await expect(
            useCase.execute({
                parkingSpotId: 'spot-1',
                userId: 'user-2',
                data: {
                    geometry: { type: 'Point', coordinates: [-73.97, 40.78] },
                },
            })
        ).rejects.toThrow(InvalidCoordinatesError);
    });

    it('lança erro se não existe', async () => {
        vi.mocked(mockRepository.findById).mockResolvedValue(null);

        await expect(
            useCase.execute({ parkingSpotId: 'nope', userId: 'user-2', data: { name: 'X' } })
        ).rejects.toThrow(ParkingNotFoundError);
    });
});
