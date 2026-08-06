import { describe, expect, it } from 'vitest';
import { isGeometryInsidePortugal, isInsidePortugal } from './geo';

describe('isInsidePortugal (fronteira real, não só bbox)', () => {
    it('aceita cidades portuguesas (continente + ilhas)', () => {
        expect(isInsidePortugal(38.7223, -9.1393)).toBe(true); // Lisboa
        expect(isInsidePortugal(41.1579, -8.6291)).toBe(true); // Porto
        expect(isInsidePortugal(37.0194, -7.9304)).toBe(true); // Faro
        expect(isInsidePortugal(38.8815, -7.1626)).toBe(true); // Elvas (fronteira)
        expect(isInsidePortugal(32.6669, -16.9241)).toBe(true); // Funchal (Madeira)
        expect(isInsidePortugal(37.7394, -25.6687)).toBe(true); // Ponta Delgada (Açores)
        expect(isInsidePortugal(38.5371, -28.6295)).toBe(true); // Horta (Faial)
    });

    it('rejeita Espanha — incluindo cidades dentro do antigo bbox', () => {
        expect(isInsidePortugal(40.4168, -3.7038)).toBe(false); // Madrid
        expect(isInsidePortugal(37.2614, -6.9447)).toBe(false); // Huelva (estava no bbox)
        expect(isInsidePortugal(38.8791, -6.9704)).toBe(false); // Badajoz (estava no bbox)
        expect(isInsidePortugal(39.4755, -6.3724)).toBe(false); // Cáceres (estava no bbox)
        expect(isInsidePortugal(40.9701, -5.6635)).toBe(false); // Salamanca (estava no bbox)
    });

    it('rejeita outros países vizinhos', () => {
        expect(isInsidePortugal(35.7595, -5.834)).toBe(false); // Tânger (Marrocos)
    });
});

describe('isGeometryInsidePortugal (todos os vértices)', () => {
    it('aceita geometrias inteiramente dentro de Portugal', () => {
        expect(
            isGeometryInsidePortugal({
                type: 'LineString',
                coordinates: [
                    [-8.6291, 41.1579],
                    [-8.62, 41.15],
                ],
            })
        ).toBe(true);
    });

    it('rejeita uma linha que cruza a fronteira (Elvas -> Badajoz)', () => {
        expect(
            isGeometryInsidePortugal({
                type: 'LineString',
                coordinates: [
                    [-7.1626, 38.8815], // Elvas (PT)
                    [-6.9704, 38.8791], // Badajoz (ES)
                ],
            })
        ).toBe(false);
    });

    it('rejeita um polígono com um vértice fora de Portugal', () => {
        expect(
            isGeometryInsidePortugal({
                type: 'Polygon',
                coordinates: [
                    [
                        [-8.6291, 41.1579],
                        [-8.62, 41.15],
                        [-6.3, 41.0], // em Espanha (Salamanca)
                        [-8.63, 41.16],
                        [-8.6291, 41.1579],
                    ],
                ],
            })
        ).toBe(false);
    });
});
