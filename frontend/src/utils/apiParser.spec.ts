import { describe, it, expect } from 'vitest';
import { parseApiError, parseApiResponse } from './apiParser';

describe('parseApiError', () => {
    it('extrai a message de um Error', () => {
        expect(parseApiError(new Error('sessão expirada'))).toBe('sessão expirada');
    });

    it('extrai subtipos de Error (TypeError, etc.)', () => {
        expect(parseApiError(new TypeError('x is not a function'))).toBe('x is not a function');
    });

    it('devolve strings diretamente', () => {
        expect(parseApiError('credenciais inválidas')).toBe('credenciais inválidas');
    });

    it('devolve fallback para valores desconhecidos', () => {
        expect(parseApiError(undefined)).toBe('Erro desconhecido');
        expect(parseApiError(null)).toBe('Erro desconhecido');
        expect(parseApiError(42)).toBe('Erro desconhecido');
        expect(parseApiError({ message: 'objeto' })).toBe('Erro desconhecido');
    });
});

describe('parseApiResponse', () => {
    it('devolve a resposta tipada tal como vem', () => {
        const payload = { id: '1', name: 'Parque' };
        expect(parseApiResponse<{ id: string; name: string }>(payload)).toEqual(payload);
    });

    it('preserva arrays', () => {
        const list = [1, 2, 3];
        expect(parseApiResponse<number[]>(list)).toEqual(list);
    });
});
