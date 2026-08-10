import { inject, injectable } from 'tsyringe';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { PushService } from '../../../user/infrastructure/services/Push.service';
import { IParkingRepository, UpdateParkingRepositoryData } from '../../domain/repositories/IParking.repository';
import { ISuggestionRepository, ParkingSuggestionEntity } from '../../domain/repositories/ISuggestion.repository';
import { ITrustCalculator } from '../../domain/services/ITrustCalculator.service';
import { NotFoundError, ValidationError } from '../../../../shared/errors/AppError';

export interface DecideSuggestionInput {
    suggestionId: string;
    moderatorId: string;
    action: 'APPROVE' | 'REJECT';
    reason?: string;
}

/**
 * Decisão do admin sobre uma sugestão pendente da comunidade:
 *  - APPROVE: aplica o diff ao parque (volta a PENDING para revalidação)
 *  - REJECT: descarta a sugestão
 */
@injectable()
export class DecideSuggestionUseCase {
    constructor(
        @inject(PARKING_TOKENS.ISuggestionRepository)
        private readonly suggestionRepository: ISuggestionRepository,
        @inject(PARKING_TOKENS.IParkingRepository)
        private readonly parkingRepository: IParkingRepository,
        @inject(PARKING_TOKENS.ITrustCalculator)
        private readonly trustCalculator: ITrustCalculator,
        @inject(USER_TOKENS.PushService)
        private readonly pushService: PushService
    ) {}

    async execute(input: DecideSuggestionInput): Promise<ParkingSuggestionEntity> {
        const suggestion = await this.suggestionRepository.findById(input.suggestionId);
        if (!suggestion) {
            throw new NotFoundError('Sugestão não encontrada');
        }
        if (suggestion.status !== 'PENDING') {
            throw new ValidationError('Esta sugestão já foi decidida');
        }

        if (input.action === 'APPROVE') {
            const spot = await this.parkingRepository.findById(suggestion.parkingSpotId);
            if (!spot) {
                throw new NotFoundError('O parque associado já não existe');
            }
            const data: UpdateParkingRepositoryData = {
                ...(suggestion.data as Record<string, unknown>),
                status: 'PENDING',
                trustScore: this.trustCalculator.baseTrust(spot.source),
            };
            await this.parkingRepository.update(suggestion.parkingSpotId, data);
        }

        const decided = await this.suggestionRepository.update(input.suggestionId, {
            status: input.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            reason: input.reason ?? null,
            reviewedById: input.moderatorId,
            reviewedAt: new Date(),
        });
        if (!decided) {
            throw new NotFoundError('Sugestão não encontrada');
        }

        void this.pushService.notify(
            suggestion.suggestedById,
            input.action === 'APPROVE' ? 'Sugestão aplicada' : 'Sugestão rejeitada',
            input.action === 'APPROVE'
                ? 'A tua sugestão foi aplicada ao estacionamento. Obrigado!'
                : input.reason
                    ? `A tua sugestão foi rejeitada: ${input.reason}`
                    : 'A tua sugestão foi rejeitada pela moderação.',
            { type: 'suggestion_decided', spotId: suggestion.parkingSpotId }
        );

        return decided;
    }
}
