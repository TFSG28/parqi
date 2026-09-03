import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ListParkingUseCase } from './ListParking.usecase';
import { ValidationError } from '../../../../shared/errors/AppError';
import type { IParkingRepository } from '../../domain/repositories/IParking.repository';

describe('ListParkingUseCase', () => {
    let useCase: ListParkingUseCase;
    let mockParking: IParkingRepository;

    beforeEach(() => {
        mockParking = {
            list: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 }),
        } as unknown as IParkingRepository;

        useCase = new ListParkingUseCase(mockParking);
    });

    it('lista com bbox e paginação, limitado a APPROVED + PENDING', async () => {
        await useCase.execute({ bbox: '-9.2,38.7,-9.1,38.8', page: 2, limit: 10 });

        expect(mockParking.list).toHaveBeenCalledWith({
            bbox: { minLon: -9.2, minLat: 38.7, maxLon: -9.1, maxLat: 38.8 },
            parkingType: null,
            q: null,
            statuses: ['APPROVED', 'PENDING'],
            page: 2,
            limit: 10,
        });
    });

    it('com pesquisa q, ignora o bbox (pesquisa nacional)', async () => {
        await useCase.execute({ bbox: '-9.2,38.7,-9.1,38.8', q: '  algo  ', page: 1, limit: 10 });

        expect(mockParking.list).toHaveBeenCalledWith(
            expect.objectContaining({ q: 'algo', bbox: null })
        );
    });

    it('q vazio ou só espaços é tratado como sem pesquisa', async () => {
        await useCase.execute({ bbox: '-9.2,38.7,-9.1,38.8', q: '   ', page: 1, limit: 10 });

        expect(mockParking.list).toHaveBeenCalledWith(
            expect.objectContaining({ q: null, bbox: { minLon: -9.2, minLat: 38.7, maxLon: -9.1, maxLat: 38.8 } })
        );
    });

    it('propaga parkingType quando presente', async () => {
        await useCase.execute({ parkingType: 'UNDERGROUND', page: 1, limit: 10 });

        expect(mockParking.list).toHaveBeenCalledWith(
            expect.objectContaining({ parkingType: 'UNDERGROUND' })
        );
    });

    it('bbox com mínimo maior que o máximo recebe ValidationError', async () => {
        await expect(
            useCase.execute({ bbox: '-9.0,38.7,-9.2,38.8', page: 1, limit: 10 })
        ).rejects.toThrow(ValidationError);
    });

    it('bbox com latitude mínima maior que a máxima recebe ValidationError', async () => {
        await expect(
            useCase.execute({ bbox: '-9.2,38.9,-9.1,38.8', page: 1, limit: 10 })
        ).rejects.toThrow(ValidationError);
    });
});
