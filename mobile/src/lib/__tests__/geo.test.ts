import {
    distanceKm,
    formatDistance,
    formatTrust,
    regionToBbox,
    trustColorKey,
} from '../geo';

describe('distanceKm (haversine)', () => {
    it('Lisboa -> Porto ronda os 274 km', () => {
        const d = distanceKm(38.7223, -9.1393, 41.1579, -8.6291);
        expect(d).toBeGreaterThan(265);
        expect(d).toBeLessThan(285);
    });

    it('mesmo ponto dá 0', () => {
        expect(distanceKm(38.7, -9.1, 38.7, -9.1)).toBe(0);
    });
});

describe('regionToBbox', () => {
    it('converte a viewport em minLon,minLat,maxLon,maxLat', () => {
        const bbox = regionToBbox({
            latitude: 38.7,
            longitude: -9.1,
            latitudeDelta: 0.2,
            longitudeDelta: 0.4,
        });
        const [minLon, minLat, maxLon, maxLat] = bbox.split(',').map(Number);
        expect(minLon).toBeCloseTo(-9.3);
        expect(maxLon).toBeCloseTo(-8.9);
        expect(minLat).toBeCloseTo(38.6);
        expect(maxLat).toBeCloseTo(38.8);
    });
});

describe('trustColorKey (faixas da TrustBar)', () => {
    it('>=5 é verde, >=3 é laranja, <3 é vermelho', () => {
        expect(trustColorKey(5)).toBe('success');
        expect(trustColorKey(10)).toBe('success');
        expect(trustColorKey(3)).toBe('accent');
        expect(trustColorKey(4.9)).toBe('accent');
        expect(trustColorKey(2.9)).toBe('danger');
        expect(trustColorKey(0)).toBe('danger');
    });
});

describe('formatação', () => {
    it('formatTrust arredonda a uma casa', () => {
        expect(formatTrust(4.96)).toBe('5/10');
        expect(formatTrust(3.14)).toBe('3.1/10');
    });

    it('formatDistance usa metros abaixo de 1 km e vírgula decimal PT', () => {
        expect(formatDistance(0.25)).toBe('250 m');
        expect(formatDistance(1.5)).toBe('1,5 km');
        expect(formatDistance(12.34)).toBe('12,3 km');
    });
});
