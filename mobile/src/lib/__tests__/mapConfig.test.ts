import { MAP_CONFIG, isValidCoordinate, expandBbox } from '../mapConfig';

describe('isValidCoordinate', () => {
    it('aceita coordenadas válidas', () => {
        expect(isValidCoordinate(41.4426, -8.2914)).toBe(true);
        expect(isValidCoordinate(0, 0)).toBe(true);
        expect(isValidCoordinate(90, 180)).toBe(true);
        expect(isValidCoordinate(-90, -180)).toBe(true);
    });

    it('rejeita null e undefined', () => {
        expect(isValidCoordinate(null, 0)).toBe(false);
        expect(isValidCoordinate(0, null)).toBe(false);
        expect(isValidCoordinate(undefined, 0)).toBe(false);
        expect(isValidCoordinate(0, undefined)).toBe(false);
    });

    it('rejeita NaN e infinitos', () => {
        expect(isValidCoordinate(Number.NaN, 0)).toBe(false);
        expect(isValidCoordinate(0, Number.NaN)).toBe(false);
        expect(isValidCoordinate(Number.POSITIVE_INFINITY, 0)).toBe(false);
    });

    it('rejeita valores fora dos limites', () => {
        expect(isValidCoordinate(90.0001, 0)).toBe(false);
        expect(isValidCoordinate(-90.0001, 0)).toBe(false);
        expect(isValidCoordinate(0, 180.0001)).toBe(false);
        expect(isValidCoordinate(0, -180.0001)).toBe(false);
    });
});

describe('expandBbox', () => {
    it('expande o bbox com o padding por omissão (12%)', () => {
        // 1° de longitude com 12% => 0.12° em cada lado
        const result = expandBbox('0,0,1,1');
        expect(result).toBe('-0.12,-0.12,1.12,1.12');
    });

    it('aceita padding customizado', () => {
        const result = expandBbox('0,0,1,1', 0.5);
        expect(result).toBe('-0.5,-0.5,1.5,1.5');
    });

    it('garante um padding mínimo (bbox degenerado)', () => {
        // Ponto único: sem mínimo seria 'x,y,x,y'; com mínimo de 0.001 expande.
        const result = expandBbox('1,1,1,1');
        const [minLon, minLat, maxLon, maxLat] = result.split(',').map(Number);
        expect(maxLon - minLon).toBeCloseTo(0.002);
        expect(maxLat - minLat).toBeCloseTo(0.002);
    });

    it('devolve o bbox original se for inválido', () => {
        expect(expandBbox('nao-e-um-bbox')).toBe('nao-e-um-bbox');
        expect(expandBbox('1,2,3')).toBe('1,2,3');
        expect(expandBbox('a,b,c,d')).toBe('a,b,c,d');
    });
});

describe('MAP_CONFIG', () => {
    it('tem valores de configuração sensatos', () => {
        expect(MAP_CONFIG.clusterRadius).toBeGreaterThan(0);
        expect(MAP_CONFIG.maxMarkers).toBeGreaterThanOrEqual(50);
        expect(MAP_CONFIG.maxCameraZoom).toBeGreaterThanOrEqual(MAP_CONFIG.clusterMaxZoom);
    });
});
