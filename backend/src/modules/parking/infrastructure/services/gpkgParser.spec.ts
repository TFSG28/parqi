import { describe, it, expect } from 'vitest';
import { parseGpkgMultiPolygon } from './gpkgParser';
import { etrs89Tm06ToWgs84 } from '../../domain/projection';

const u32le = (v: number) => {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(v);
    return b;
};
const f64le = (v: number) => {
    const b = Buffer.alloc(8);
    b.writeDoubleLE(v);
    return b;
};

interface RingInput {
    points: [number, number][];
    /** true → ptype=1003 (PolygonZ) com um double Z extra por ponto. */
    withZ?: boolean;
}

function buildGpkgBlob(polygons: RingInput[][]): Buffer {
    const header = Buffer.alloc(8);
    header[0] = 0x47; // 'G'
    header[1] = 0x50; // 'P'
    header[2] = 0x00; // versão
    header[3] = 0x03; // flags: little-endian header + envelope XY (32 bytes)
    header.writeUInt32LE(3763, 4); // srs_id

    const envelope = Buffer.alloc(32);
    const xs = polygons.flat(2).flatMap((p) => p.points.map(([e]) => e));
    const ys = polygons.flat(2).flatMap((p) => p.points.map(([, n]) => n));
    envelope.writeDoubleLE(Math.min(...xs), 0);
    envelope.writeDoubleLE(Math.max(...xs), 8);
    envelope.writeDoubleLE(Math.min(...ys), 16);
    envelope.writeDoubleLE(Math.max(...ys), 24);

    const parts: Buffer[] = [u32le(6), u32le(polygons.length)]; // MultiPolygon
    for (const polygon of polygons) {
        const withZ = polygon.some((r) => r.withZ);
        parts.push(Buffer.from([1])); // marker little-endian
        parts.push(u32le(withZ ? 1003 : 3)); // Polygon / PolygonZ
        parts.push(u32le(polygon.length));
        for (const ring of polygon) {
            parts.push(u32le(ring.points.length));
            for (const [e, n] of ring.points) {
                parts.push(f64le(e));
                parts.push(f64le(n));
                if (ring.withZ) {
                    parts.push(f64le(1234.5)); // Z deve ser ignorado
                }
            }
        }
    }
    return Buffer.concat([header, envelope, ...parts]);
}

const LISBOA_TRIANGLE: RingInput[][] = [
    [
        {
            points: [
                [-96135, -109141],
                [-82811, -96313],
                [-89473, -102727],
                [-96135, -109141], // fecha o anel
            ],
        },
    ],
];

describe('parseGpkgMultiPolygon', () => {
    it('extrai o MultiPolygon e reprojeta os vértices para WGS84', () => {
        const polygons = parseGpkgMultiPolygon(buildGpkgBlob(LISBOA_TRIANGLE), etrs89Tm06ToWgs84);

        expect(polygons).not.toBeNull();
        expect(polygons).toHaveLength(1);
        expect(polygons![0]).toHaveLength(1);
        expect(polygons![0][0]).toHaveLength(4);

        const [swLon, swLat] = polygons![0][0][0];
        expect(swLat).toBeCloseTo(38.6799547, 6);
        expect(swLon).toBeCloseTo(-9.2378989, 6);
    });

    it('suporta polígonos com coordenada Z (ignorada)', () => {
        const withZ = LISBOA_TRIANGLE.map((poly) => poly.map((ring) => ({ ...ring, withZ: true })));
        const polygons = parseGpkgMultiPolygon(buildGpkgBlob(withZ), etrs89Tm06ToWgs84);

        expect(polygons).toHaveLength(1);
        const [swLon, swLat] = polygons![0][0][0];
        expect(swLat).toBeCloseTo(38.6799547, 6);
        expect(swLon).toBeCloseTo(-9.2378989, 6);
    });

    it('devolve null para geometrias não-MultiPolygon', () => {
        const blob = buildGpkgBlob(LISBOA_TRIANGLE);
        blob.writeUInt32LE(1, 8 + 32); // tipo Point
        expect(parseGpkgMultiPolygon(blob, etrs89Tm06ToWgs84)).toBeNull();
    });

    it('lança erro para blobs que não são GPKG', () => {
        expect(() => parseGpkgMultiPolygon(Buffer.from('nope'), etrs89Tm06ToWgs84)).toThrow(
            /GPKG/
        );
    });
});
