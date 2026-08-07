import { describe, it, expect } from 'vitest';
import { datum73ToWgs84, etrs89Tm06ToWgs84, ptra08UtmToWgs84 } from './projection';

const R = (o: { lat: number; lon: number }) => [o.lat, o.lon];

describe('etrs89Tm06ToWgs84 (EPSG:3763 → WGS84)', () => {
    it('devolve a origem do sistema (lat0, lon0) em (0, 0)', () => {
        const [lat, lon] = R(etrs89Tm06ToWgs84(0, 0));
        expect(lat).toBeCloseTo(39.66825833, 7);
        expect(lon).toBeCloseTo(-8.13310833, 7);
    });

    it('converte os cantos do envelope de Lisboa (validado contra os vértices da CAOP)', () => {
        const [swLat, swLon] = R(etrs89Tm06ToWgs84(-96135, -109141));
        expect(swLat).toBeCloseTo(38.6799547, 5);
        expect(swLon).toBeCloseTo(-9.2378989, 5);

        const [neLat, neLon] = R(etrs89Tm06ToWgs84(-82811, -96313));
        expect(neLat).toBeCloseTo(38.7968415, 5);
        expect(neLon).toBeCloseTo(-9.0863345, 5);
    });

    it('centro do concelho de Lisboa', () => {
        const [lat, lon] = R(etrs89Tm06ToWgs84(-89473, -102727));
        expect(lat).toBeCloseTo(38.7384221, 5);
        expect(lon).toBeCloseTo(-9.1621785, 5);
    });
});

describe('ptra08UtmToWgs84 (Açores/Madeira)', () => {
    it('UTM 28N (Madeira): Funchal', () => {
        const [lat, lon] = R(ptra08UtmToWgs84(322000, 3615000, 28));
        expect(lat).toBeCloseTo(32.6583142, 5);
        expect(lon).toBeCloseTo(-16.8980298, 5);
    });

    it('UTM 26N (Açores Central/Oriental): Ponta Delgada', () => {
        const [lat, lon] = R(ptra08UtmToWgs84(600000, 4180000, 26));
        expect(lat).toBeCloseTo(37.7618583, 5);
        expect(lon).toBeCloseTo(-25.8646935, 5);
    });

    it('UTM 25N (Açores Ocidental): Flores', () => {
        const [lat, lon] = R(ptra08UtmToWgs84(640000, 4370000, 25));
        expect(lat).toBeCloseTo(39.468205, 5);
        expect(lon).toBeCloseTo(-31.3724795, 5);
    });

    it('origem de cada zona: (500000, 0) → (0, meridiano central)', () => {
        expect(R(ptra08UtmToWgs84(500000, 0, 25))[1]).toBeCloseTo(-33, 7);
        expect(R(ptra08UtmToWgs84(500000, 0, 26))[1]).toBeCloseTo(-27, 7);
        expect(R(ptra08UtmToWgs84(500000, 0, 28))[1]).toBeCloseTo(-15, 7);
    });
});

describe('datum73ToWgs84 (regressão — valores capturados antes da refatorização)', () => {
    it.each([
        [-118296.43, 115168.43, 40.69557786, -9.53255825],
        [151000, 467000, 43.85580734, -6.25520626],
        [200000, 300000, 42.34246117, -5.70634497],
    ] as const)('Datum73(%s, %s) → %s, %s', (e, n, lat, lon) => {
        const result = datum73ToWgs84(e, n);
        expect(result.lat).toBeCloseTo(lat, 6);
        expect(result.lon).toBeCloseTo(lon, 6);
    });
});
