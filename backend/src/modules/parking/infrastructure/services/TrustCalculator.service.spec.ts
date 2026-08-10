import { describe, it, expect } from 'vitest';
import { TrustCalculator } from './TrustCalculator.service';

describe('TrustCalculator', () => {
    const calculator = new TrustCalculator();

    describe('baseTrust por fonte', () => {
        it('comunidade começa com confiança baixa', () => {
            expect(calculator.baseTrust('COMMUNITY')).toBe(2);
        });

        it('fontes importadas têm confiança base maior', () => {
            expect(calculator.baseTrust('OVERPASS')).toBe(6);
            expect(calculator.baseTrust('GEOAPIFY')).toBe(6);
        });
    });

    describe('transições de estado (validação híbrida)', () => {
        it('PENDING passa a APPROVED quando a confiança atinge 5', () => {
            // 2 (base) + 2 upvotes * 1.5 = 5
            const result = calculator.apply('COMMUNITY', 'PENDING', { upvotes: 2, downvotes: 0 });
            expect(result.status).toBe('APPROVED');
            expect(result.trustScore).toBe(5);
        });

        it('PENDING mantém-se abaixo de 5', () => {
            const result = calculator.apply('COMMUNITY', 'PENDING', { upvotes: 1, downvotes: 0 });
            expect(result.status).toBe('PENDING');
            expect(result.trustScore).toBe(3.5);
        });

        it('APPROVED passa a FLAGGED quando a confiança desce abaixo de 3', () => {
            // 2 (base) - 1 downvote * 2 = 0
            const result = calculator.apply('COMMUNITY', 'APPROVED', { upvotes: 0, downvotes: 1 });
            expect(result.status).toBe('FLAGGED');
            expect(result.trustScore).toBe(0);
        });

        it('FLAGGED recupera para APPROVED com votos positivos', () => {
            // 2 (base) + 3 upvotes * 1.5 = 6.5
            const result = calculator.apply('COMMUNITY', 'FLAGGED', { upvotes: 3, downvotes: 0 });
            expect(result.status).toBe('APPROVED');
            expect(result.trustScore).toBe(6.5);
        });

        it('REJECTED nunca muda automaticamente', () => {
            const result = calculator.apply('COMMUNITY', 'REJECTED', { upvotes: 10, downvotes: 0 });
            expect(result.status).toBe('REJECTED');
        });

        it('rejeição automática com 2 downvotes líquidos (raw <= -2)', () => {
            // 2 (base) - 2 downvotes * 2 = -2
            const result = calculator.apply('COMMUNITY', 'PENDING', { upvotes: 0, downvotes: 2 });
            expect(result.status).toBe('REJECTED');
        });

        it('um único downvote não rejeita automaticamente', () => {
            // 2 (base) - 1 downvote * 2 = 0 > -2
            const result = calculator.apply('COMMUNITY', 'PENDING', { upvotes: 0, downvotes: 1 });
            expect(result.status).toBe('PENDING');
        });

        it('dados importados só são flagados com votos negativos suficientes', () => {
            // 6 (base) - 2 downvotes * 2 = 2 < 3
            const result = calculator.apply('OVERPASS', 'APPROVED', { upvotes: 0, downvotes: 2 });
            expect(result.status).toBe('FLAGGED');
        });
    });

    describe('clamping 0..10', () => {
        it('não ultrapassa 10', () => {
            const result = calculator.apply('GEOAPIFY', 'APPROVED', { upvotes: 10, downvotes: 0 });
            expect(result.trustScore).toBe(10);
        });

        it('não desce abaixo de 0', () => {
            const result = calculator.apply('COMMUNITY', 'PENDING', { upvotes: 0, downvotes: 5 });
            expect(result.trustScore).toBe(0);
        });
    });
});
