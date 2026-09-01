import {
    distanceLabel,
    freshnessLabel,
    isStale,
    rankParkingSpots,
    trustMessage,
} from '../parking';
import type { ParkingSpot } from '../../types/parking';

function spot(overrides: Partial<ParkingSpot> = {}): ParkingSpot {
    return {
        id: 'spot',
        name: 'Parque',
        description: null,
        latitude: 38.72,
        longitude: -9.14,
        geometryType: 'POINT',
        parkingType: 'SURFACE',
        capacityRange: null,
        isFree: true,
        hasPregnantSpaces: null,
        hasDisabledSpaces: null,
        hasEvCharging: null,
        isCovered: null,
        source: 'OSM',
        status: 'APPROVED',
        trustScore: 8,
        requiresReview: false,
        contributorId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        geometry: null,
        ...overrides,
    };
}

describe('parking presentation rules', () => {
    it('identifica e comunica informação antiga', () => {
        const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
        expect(isStale(old)).toBe(true);
        expect(freshnessLabel(old)).toBe('Atualizado há mais de uma semana');
    });

    it('explica a confiança sem prometer disponibilidade', () => {
        expect(trustMessage(spot({ trustScore: 9 }))).toContain('Bem verificado');
        expect(trustMessage(spot({ status: 'PENDING', trustScore: 9 }))).toContain('Confirma');
        expect(trustMessage(spot({ trustScore: 2 }))).toContain('Confiança baixa');
    });

    it('ordena a melhor opção combinando confiança, frescura e proximidade', () => {
        const best = spot({ id: 'best', trustScore: 8, latitude: 38.72, longitude: -9.14 });
        const distant = spot({ id: 'distant', trustScore: 8, latitude: 41.15, longitude: -8.61 });
        const weak = spot({ id: 'weak', trustScore: 2, latitude: 38.72, longitude: -9.14 });
        expect(rankParkingSpots([distant, weak, best], { latitude: 38.72, longitude: -9.14 }).map((s) => s.id))
            .toEqual(['best', 'weak', 'distant']);
    });

    it('formata a distância apenas quando existe localização', () => {
        expect(distanceLabel(spot(), { latitude: 38.72, longitude: -9.14 })).toBe('0 m');
        expect(distanceLabel(spot(), null)).toBeNull();
    });
});
