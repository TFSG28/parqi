import { inject, injectable } from 'tsyringe';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { ISuggestionRepository, SuggestionStatus } from '../../domain/repositories/ISuggestion.repository';
import { ValidationError } from '../../../../shared/errors/AppError';

export interface ListSuggestionsInput {
    status: string;
    page: number;
    limit: number;
}

@injectable()
export class ListSuggestionsUseCase {
    constructor(
        @inject(PARKING_TOKENS.ISuggestionRepository)
        private readonly suggestionRepository: ISuggestionRepository
    ) {}

    async execute(input: ListSuggestionsInput) {
        const status = input.status.toUpperCase() as SuggestionStatus;
        if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
            throw new ValidationError('Estado inválido (PENDING, APPROVED ou REJECTED)');
        }
        return this.suggestionRepository.listByStatus(status, input.page, input.limit);
    }
}
