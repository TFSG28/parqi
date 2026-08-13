import { inject, injectable } from 'tsyringe';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { IParkingRepository } from '../../domain/repositories/IParking.repository';
import { ParkingNotFoundError } from '../../domain/errors/ParkingNotFound.error';

export interface GetParkingInput {
    parkingSpotId: string;
    userId?: string;
    userRole?: string;
}

@injectable()
export class GetParkingUseCase {
    constructor(
        @inject(PARKING_TOKENS.IParkingRepository)
        private readonly parkingRepository: IParkingRepository
    ) {}

    async execute(input: GetParkingInput) {
        const spot = await this.parkingRepository.findById(input.parkingSpotId);
        if (!spot) {
            throw new ParkingNotFoundError();
        }

        if (spot.status === 'REJECTED') {
            const isOwner = spot.contributorId === input.userId;
            const isAdmin = input.userRole === 'ADMIN';
            if (!isOwner && !isAdmin) {
                throw new ParkingNotFoundError();
            }
        }

        const [geometry, vote] = await Promise.all([
            this.parkingRepository.getGeometry(input.parkingSpotId),
            input.userId
                ? this.parkingRepository.getVote(input.userId, input.parkingSpotId)
                : Promise.resolve(null),
        ]);

        const myVote = vote?.value === 1 ? 'up' : vote?.value === -1 ? 'down' : null;
        return { ...spot, geometry, myVote };
    }
}
