import { inject, injectable } from 'tsyringe';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { IUserRepository } from '../../../user/domain/repositories/IUser.repository';
import { IParkingRepository, UpdateParkingRepositoryData } from '../../domain/repositories/IParking.repository';
import { assertEmailVerified } from '../../../auth/application/guards/email-verified.guard';
import { ISuggestionRepository, ParkingSuggestionEntity } from '../../domain/repositories/ISuggestion.repository';
import { IReputationService } from '../../domain/services/IReputation.service';
import { ITrustCalculator } from '../../domain/services/ITrustCalculator.service';
import { ParkingSpotEntity } from '../../domain/entities/ParkingSpot.entity';
import { ParkingNotFoundError } from '../../domain/errors/ParkingNotFound.error';
import { InvalidParkingActionError } from '../../domain/errors/InvalidParkingAction.error';
import { SuggestParkingDTO } from '../dtos/SuggestParking.dto';

export interface SuggestParkingInput {
    parkingSpotId: string;
    userId: string;
    userRole?: string;
    data: SuggestParkingDTO;
}

export type SuggestParkingResult =
    | { applied: true; spot: ParkingSpotEntity }
    | { applied: false; suggestion: ParkingSuggestionEntity };

/**
 * "Complementar informação de um parque" — modelo híbrido por reputação:
 *  - admin ou membros confiáveis (reputação >= limiar) aplicam a alteração já
 *    (o parque volta a PENDING para a comunidade revalidar);
 *  - os restantes propõem uma sugestão que entra em fila de moderação (admin).
 */
@injectable()
export class SuggestParkingUseCase {
    constructor(
        @inject(PARKING_TOKENS.IParkingRepository)
        private readonly parkingRepository: IParkingRepository,
        @inject(PARKING_TOKENS.ISuggestionRepository)
        private readonly suggestionRepository: ISuggestionRepository,
        @inject(PARKING_TOKENS.IReputationService)
        private readonly reputationService: IReputationService,
        @inject(PARKING_TOKENS.ITrustCalculator)
        private readonly trustCalculator: ITrustCalculator,
        @inject(USER_TOKENS.IUserRepository)
        private readonly userRepository: IUserRepository
    ) {}

    async execute(input: SuggestParkingInput): Promise<SuggestParkingResult> {
        // A conta tem de ter o email validado (anti-spam)
        await assertEmailVerified(this.userRepository, input.userId, input.userRole, 'sugerir alterações');

        const spot = await this.parkingRepository.findById(input.parkingSpotId);
        if (!spot) {
            throw new ParkingNotFoundError();
        }
        if (spot.status === 'REJECTED') {
            throw new InvalidParkingActionError(
                'Não é possível sugerir alterações num estacionamento rejeitado'
            );
        }

        const { reason, ...fields } = input.data;
        const canApplyDirectly =
            input.userRole === 'ADMIN' || (await this.reputationService.getForUser(input.userId)).isTrusted;

        if (canApplyDirectly) {
            const data: UpdateParkingRepositoryData = {
                ...fields,
                // A alteração volta a PENDING: a comunidade revalida a correção
                status: 'PENDING',
                trustScore: this.trustCalculator.baseTrust(spot.source),
            };
            const updated = await this.parkingRepository.update(input.parkingSpotId, data);
            if (!updated) {
                throw new ParkingNotFoundError();
            }
            return { applied: true, spot: updated };
        }

        const suggestion = await this.suggestionRepository.create({
            data: fields as Record<string, unknown>,
            reason: reason ?? null,
            parkingSpotId: input.parkingSpotId,
            suggestedById: input.userId,
        });
        return { applied: false, suggestion };
    }
}
