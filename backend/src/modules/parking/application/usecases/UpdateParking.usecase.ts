import { inject, injectable } from 'tsyringe';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { IParkingRepository, UpdateParkingRepositoryData } from '../../domain/repositories/IParking.repository';
import { ParkingSpotEntity } from '../../domain/entities/ParkingSpot.entity';
import { ParkingNotFoundError } from '../../domain/errors/ParkingNotFound.error';
import { DuplicateParkingError } from '../../domain/errors/DuplicateParking.error';
import { InvalidCoordinatesError } from '../../domain/errors/InvalidCoordinates.error';
import { InvalidParkingActionError } from '../../domain/errors/InvalidParkingAction.error';
import { ForbiddenError } from '../../../../shared/errors/AppError';
import { UpdateParkingDTO } from '../dtos/UpdateParking.dto';
import { DUPLICATE_RADIUS_METERS } from '../../domain/const';
import { getReferencePoint, isInsidePortugal } from '../../domain/geo';

export interface UpdateParkingInput {
    parkingSpotId: string;
    userId: string;
    userRole?: string;
    data: UpdateParkingDTO['body'];
}

@injectable()
export class UpdateParkingUseCase {
    constructor(
        @inject(PARKING_TOKENS.IParkingRepository)
        private readonly parkingRepository: IParkingRepository
    ) {}

    async execute(input: UpdateParkingInput): Promise<ParkingSpotEntity> {
        const spot = await this.parkingRepository.findById(input.parkingSpotId);
        if (!spot) {
            throw new ParkingNotFoundError();
        }

        const isAdmin = input.userRole === 'ADMIN';
        const isOwner = spot.contributorId === input.userId;
        if (!isOwner && !isAdmin) {
            throw new ForbiddenError('Não tens permissão para editar este estacionamento');
        }
        if (spot.status === 'REJECTED' && !isAdmin) {
            throw new InvalidParkingActionError('Não é possível editar um estacionamento rejeitado');
        }

        if (input.data.geometry) {
            const [longitude, latitude] = getReferencePoint(input.data.geometry);
            if (!isInsidePortugal(latitude, longitude)) {
                throw new InvalidCoordinatesError();
            }
            const nearby = await this.parkingRepository.findNearby(
                latitude,
                longitude,
                DUPLICATE_RADIUS_METERS
            );
            const duplicate = nearby.find((item) => item.id !== spot.id);
            if (duplicate) {
                throw new DuplicateParkingError(duplicate.id);
            }
        }

        const data: UpdateParkingRepositoryData = { ...input.data };
        // Edição do autor de um spot já aprovado/flagado volta a PENDING:
        // a comunidade revalida antes de voltar a ficar visível como aprovado.
        if (!isAdmin && spot.source === 'COMMUNITY' && spot.status !== 'PENDING') {
            data.status = 'PENDING';
            data.trustScore = 2;
        }

        const updated = await this.parkingRepository.update(input.parkingSpotId, data);
        if (!updated) {
            throw new ParkingNotFoundError();
        }
        return updated;
    }
}
