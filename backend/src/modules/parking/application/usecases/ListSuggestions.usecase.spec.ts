import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ListSuggestionsUseCase } from './ListSuggestions.usecase';
import { ValidationError } from '../../../../shared/errors/AppError';
import type { ISuggestionRepository } from '../../domain/repositories/ISuggestion.repository';

describe('ListSuggestionsUseCase', () => {
    let useCase: ListSuggestionsUseCase;
    let mockSuggestions: ISuggestionRepository;

    beforeEach(() => {
        mockSuggestions = {
            listByStatus: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 }),
        } as unknown as ISuggestionRepository;

        useCase = new ListSuggestionsUseCase(mockSuggestions);
    });

    it.each(['PENDING', 'APPROVED', 'REJECTED'])(
        'lista sugestões com estado %s',
        async (status) => {
            await useCase.execute({ status, page: 1, limit: 10 });

            expect(mockSuggestions.listByStatus).toHaveBeenCalledWith(status, 1, 10);
        }
    );

    it('normaliza o estado para maiúsculas', async () => {
        await useCase.execute({ status: 'pending', page: 1, limit: 10 });

        expect(mockSuggestions.listByStatus).toHaveBeenCalledWith('PENDING', 1, 10);
    });

    it('estado inválido recebe ValidationError sem tocar no repositório', async () => {
        await expect(
            useCase.execute({ status: 'DELETED', page: 1, limit: 10 })
        ).rejects.toThrow(ValidationError);
        expect(mockSuggestions.listByStatus).not.toHaveBeenCalled();
    });
});
