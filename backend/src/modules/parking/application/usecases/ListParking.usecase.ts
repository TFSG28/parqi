import { inject, injectable } from 'tsyringe';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { IParkingRepository } from '../../domain/repositories/IParking.repository';
import type { ParkingType } from '../../domain/entities/ParkingSpot.entity';
import { ValidationError } from '../../../../shared/errors/AppError';

export interface ListParkingInput {
    bbox?: string;
    parkingType?: string;
    /** Pesquisa por nome; quando presente, o bbox é ignorado (pesquisa nacional). */
    q?: string;
    page: number;
    limit: number;
}

/**
 * Vista pública do mapa: APPROVED + PENDING (os pendentes aparecem com
 * badge "em verificação"). FLAGGED/REJECTED ficam escondidos.
 */
@injectable()
export class ListParkingUseCase {
    constructor(
        @inject(PARKING_TOKENS.IParkingRepository)
        private readonly parkingRepository: IParkingRepository
    ) {}

    async execute(input: ListParkingInput) {
        const q = input.q?.trim() || null;
        return this.parkingRepository.list({
            bbox: !q && input.bbox ? this.parseBbox(input.bbox) : null,
            parkingType: (input.parkingType as ParkingType | undefined) ?? null,
            q,
            statuses: ['APPROVED', 'PENDING'],
            page: input.page,
            limit: input.limit,
        });
    }

    private parseBbox(value: string) {
        const [minLon, minLat, maxLon, maxLat] = value.split(',').map(Number);
        if (minLon > maxLon || minLat > maxLat) {
            throw new ValidationError('bbox inválido: o mínimo deve ser menor que o máximo');
        }
        return { minLon, minLat, maxLon, maxLat };
    }
}
