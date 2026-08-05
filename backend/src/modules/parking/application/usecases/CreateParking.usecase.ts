import { inject, injectable } from 'tsyringe';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { IParkingRepository } from '../../domain/repositories/IParking.repository';
import { ITrustCalculator } from '../../domain/services/ITrustCalculator.service';
import { ParkingSpotEntity } from '../../domain/entities/ParkingSpot.entity';
import { DuplicateParkingError } from '../../domain/errors/DuplicateParking.error';
import { InvalidCoordinatesError } from '../../domain/errors/InvalidCoordinates.error';
import { CreateParkingDTO } from '../dtos/CreateParking.dto';
import { DUPLICATE_RADIUS_METERS } from '../../domain/const';
import { getReferencePoint, isInsidePortugal } from '../../domain/geo';

export interface CreateParkingInput extends CreateParkingDTO {
    userId: string;
}

/**
 * Auto-validação de uma contribuição da comunidade:
 *  - coordenadas dentro de Portugal
 *  - sem duplicados a menos de 30 metros
 * A contribuição entra como PENDING com confiança base da fonte COMMUNITY;
 * a comunidade vota e o TrustCalculator decide a transição de estado.
 */
@injectable()
export class CreateParkingUseCase {
    constructor(
        @inject(PARKING_TOKENS.IParkingRepository)
        private readonly parkingRepository: IParkingRepository,
        @inject(PARKING_TOKENS.ITrustCalculator)
        private readonly trustCalculator: ITrustCalculator
    ) {}

    async execute(data: CreateParkingInput): Promise<ParkingSpotEntity> {
        const [longitude, latitude] = getReferencePoint(data.geometry);

        if (!isInsidePortugal(latitude, longitude)) {
            throw new InvalidCoordinatesError();
        }

        const nearby = await this.parkingRepository.findNearby(
            latitude,
            longitude,
            DUPLICATE_RADIUS_METERS
        );
        if (nearby.length > 0) {
            throw new DuplicateParkingError(nearby[0].id);
        }

        return this.parkingRepository.create({
            name: data.name,
            description: data.description ?? null,
            geometry: data.geometry,
            parkingType: data.parkingType,
            capacityRange: data.capacityRange ?? null,
            isFree: data.isFree ?? null,
            source: 'COMMUNITY',
            status: 'PENDING',
            trustScore: this.trustCalculator.baseTrust('COMMUNITY'),
            contributorId: data.userId,
        });
    }
}
