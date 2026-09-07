import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeleteParkingUseCase } from './DeleteParking.usecase';
import { ParkingNotFoundError } from '../../domain/errors/ParkingNotFound.error';
import { InvalidParkingActionError } from '../../domain/errors/InvalidParkingAction.error';
import { ForbiddenError } from '../../../../shared/errors/AppError';
import type { IParkingRepository } from '../../domain/repositories/IParking.repository';
import type { IUserRepository } from '../../../user/domain/repositories/IUser.repository';

function makeSpot(overrides: Record<string, unknown> = {}) {
    return {
        id: 'spot-1',
        name: 'Parque Teste',
        status: 'PENDING',
        source: 'COMMUNITY',
        contributorId: 'owner-1',
        latitude: 41.4426,
        longitude: -8.2914,
        ...overrides,
    };
}

describe('DeleteParkingUseCase', () => {
    let useCase: DeleteParkingUseCase;
    let mockParking: IParkingRepository;
    let mockUsers: IUserRepository;

    beforeEach(() => {
        mockParking = {
            findById: vi.fn(),
            delete: vi.fn().mockResolvedValue(undefined),
        } as unknown as IParkingRepository;

        mockUsers = {
            findById: vi.fn().mockResolvedValue({ emailVerified: true, isActive: true }),
            findByEmail: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        } as unknown as IUserRepository;

        useCase = new DeleteParkingUseCase(mockParking, mockUsers);
    });

    it('dono com email verificado apaga o seu spot COMMUNITY', async () => {
        vi.mocked(mockParking.findById).mockResolvedValue(makeSpot() as never);

        await useCase.execute({ parkingSpotId: 'spot-1', userId: 'owner-1' });

        expect(mockParking.delete).toHaveBeenCalledWith('spot-1');
    });

    it('admin pode apagar spot de outro utilizador', async () => {
        vi.mocked(mockParking.findById).mockResolvedValue(makeSpot() as never);

        await useCase.execute({ parkingSpotId: 'spot-1', userId: 'admin-1', userRole: 'ADMIN' });

        expect(mockParking.delete).toHaveBeenCalledWith('spot-1');
    });

    it('utilizador sem relação com o spot recebe ForbiddenError', async () => {
        vi.mocked(mockParking.findById).mockResolvedValue(makeSpot() as never);

        await expect(
            useCase.execute({ parkingSpotId: 'spot-1', userId: 'other-1' })
        ).rejects.toThrow(ForbiddenError);
        expect(mockParking.delete).not.toHaveBeenCalled();
    });

    it('não-admin não pode apagar spot importado (OSM/MUNICIPAL)', async () => {
        vi.mocked(mockParking.findById).mockResolvedValue(makeSpot({ source: 'OSM' }) as never);

        await expect(
            useCase.execute({ parkingSpotId: 'spot-1', userId: 'owner-1' })
        ).rejects.toThrow(InvalidParkingActionError);
        expect(mockParking.delete).not.toHaveBeenCalled();
    });

    it('admin pode apagar spot importado', async () => {
        vi.mocked(mockParking.findById).mockResolvedValue(makeSpot({ source: 'OSM' }) as never);

        await useCase.execute({ parkingSpotId: 'spot-1', userId: 'admin-1', userRole: 'ADMIN' });

        expect(mockParking.delete).toHaveBeenCalledWith('spot-1');
    });

    it('spot inexistente recebe ParkingNotFoundError', async () => {
        vi.mocked(mockParking.findById).mockResolvedValue(null as never);

        await expect(
            useCase.execute({ parkingSpotId: 'ghost', userId: 'owner-1' })
        ).rejects.toThrow(ParkingNotFoundError);
    });

    it('utilizador inexistente é bloqueado antes de consultar o spot', async () => {
        vi.mocked(mockUsers.findById).mockResolvedValue(null);

        await expect(
            useCase.execute({ parkingSpotId: 'spot-1', userId: 'owner-1' })
        ).rejects.toThrow(ForbiddenError);
        expect(mockParking.findById).not.toHaveBeenCalled();
    });

    it('conta suspensa é bloqueada', async () => {
        vi.mocked(mockUsers.findById).mockResolvedValue({
            isActive: false,
        } as never);

        await expect(
            useCase.execute({ parkingSpotId: 'spot-1', userId: 'owner-1' })
        ).rejects.toThrow(ForbiddenError);
        expect(mockParking.delete).not.toHaveBeenCalled();
    });
});
