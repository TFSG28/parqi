import { inject, injectable } from 'tsyringe';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { IUserRepository } from '../../../user/domain/repositories/IUser.repository';
import { IParkingRepository } from '../../domain/repositories/IParking.repository';
import { ParkingNotFoundError } from '../../domain/errors/ParkingNotFound.error';
import { InvalidParkingActionError } from '../../domain/errors/InvalidParkingAction.error';
import { ForbiddenError } from '../../../../shared/errors/AppError';
import { assertEmailVerified } from '../../../auth/application/guards/email-verified.guard';

export interface DeleteParkingInput {
    parkingSpotId: string;
    userId: string;
    userRole?: string;
}

@injectable()
export class DeleteParkingUseCase {
    constructor(
        @inject(PARKING_TOKENS.IParkingRepository)
        private readonly parkingRepository: IParkingRepository,
        @inject(USER_TOKENS.IUserRepository)
        private readonly userRepository: IUserRepository
    ) {}

    async execute(input: DeleteParkingInput): Promise<void> {
        await assertEmailVerified(this.userRepository, input.userId, input.userRole, 'apagar estacionamentos');

        const spot = await this.parkingRepository.findById(input.parkingSpotId);
        if (!spot) {
            throw new ParkingNotFoundError();
        }

        const isAdmin = input.userRole === 'ADMIN';
        const isOwner = spot.contributorId === input.userId;
        if (!isOwner && !isAdmin) {
            throw new ForbiddenError('Não tens permissão para apagar este estacionamento');
        }
        if (spot.source !== 'COMMUNITY' && !isAdmin) {
            throw new InvalidParkingActionError(
                'Apenas administradores podem apagar estacionamentos importados'
            );
        }

        await this.parkingRepository.delete(input.parkingSpotId);
    }
}
