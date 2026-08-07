/**
 * Parser do formato binário GeoPackage (OGC 12-128):
 *  - cabeçalho de 8 bytes (magic "GP", versão, flags, srs_id)
 *  - envelope opcional (tamanho conforme bits 1-3 das flags)
 *  - WKB (sem byte de marker ao nível mais alto; a endianness é detetada)
 *
 * Extrai o MultiPolygon e reprojeta cada vértice (E,N) → (lon,lat) com a função fornecida.
 * Suporta geometrias 2D e 3D (a coordenada Z é ignorada).
 */

export type MultiPolygonCoordinates = number[][][][];

export function isGpkgGeometryBlob(buf: Uint8Array): boolean {
    return buf.length >= 8 && buf[0] === 0x47 && buf[1] === 0x50; // "GP"
}

interface GpkgReader {
    u32(): number;
    f64(): number;
    pos: number;
}

function createReader(buf: Uint8Array, littleEndian: boolean): GpkgReader {
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let pos = 0;
    return {
        get pos() {
            return pos;
        },
        set pos(value: number) {
            pos = value;
        },
        u32() {
            const v = littleEndian ? view.getUint32(pos, true) : view.getUint32(pos, false);
            pos += 4;
            return v;
        },
        f64() {
            const v = littleEndian ? view.getFloat64(pos, true) : view.getFloat64(pos, false);
            pos += 8;
            return v;
        },
    };
}

/** Um tipo WKB com Z (1003/3003/1000006/3000006/…) tem Z nos pontos (milhares ímpares). */
function hasZ(type: number): boolean {
    if (type >= 1_000_000) {
        return Math.floor(type / 1_000_000) % 2 === 1;
    }
    return Math.floor(type / 1_000) % 2 === 1;
}

const KNOWN_WKB_TYPES = new Set([
    1, 2, 3, 4, 5, 6, 7,
    1001, 1002, 1003, 1004, 1005, 1006, 1007,
    2001, 2002, 2003, 3001, 3002, 3003,
    1000001, 1000002, 1000003, 1000004, 1000005, 1000006, 1000007,
    3000001, 3000002, 3000003, 3000006,
]);

/**
 * Extrai as coordenadas do MultiPolygon de um blob de geometria GPKG.
 * `project` converte cada vértice projetado (E, N) → { lat, lon } em WGS84.
 * Devolve null para geometrias vazias ou não suportadas.
 */
export function parseGpkgMultiPolygon(
    blob: Uint8Array,
    project: (easting: number, northing: number) => { lat: number; lon: number }
): MultiPolygonCoordinates | null {
    if (!isGpkgGeometryBlob(blob)) {
        throw new Error('Blob não é uma geometria GPKG (magic "GP" em falta)');
    }

    const flags = blob[3];
    const headerLittleEndian = (flags & 0x01) === 1;
    const envelopeIndicator = (flags >> 1) & 0x07;
    const envelopeSizes = [0, 32, 48, 48, 64];
    const envelopeSize = envelopeSizes[envelopeIndicator] ?? 32;

    const reader = createReader(blob, headerLittleEndian);
    reader.pos = 8 + envelopeSize;

    // Endianness do WKB: marker explícito (0/1) ou auto-deteção pelo tipo.
    let littleEndian: boolean;
    const first = blob[reader.pos];
    if (first === 0 || first === 1) {
        littleEndian = first === 1;
        reader.pos += 1;
    } else {
        const probe = createReader(blob, true);
        probe.pos = reader.pos;
        littleEndian = KNOWN_WKB_TYPES.has(probe.u32());
    }
    const wkb = createReader(blob, littleEndian);
    wkb.pos = reader.pos;

    const type = wkb.u32();
    if (type % 1000 !== 6) {
        return null; // só MultiPolygon (camadas CAOP de municípios)
    }

    const polygonCount = wkb.u32();
    const polygons: number[][][][] = [];

    for (let p = 0; p < polygonCount; p++) {
        // cada Polygon tem o seu próprio byte de ordem
        const polyOrder = blob[wkb.pos];
        if (polyOrder === 0 || polyOrder === 1) {
            wkb.pos += 1;
        }
        const polyType = wkb.u32();
        const polyHasZ = hasZ(polyType);
        const ringCount = wkb.u32();
        const rings: number[][][] = [];

        for (let r = 0; r < ringCount; r++) {
            const pointCount = wkb.u32();
            const points: number[][] = [];
            for (let i = 0; i < pointCount; i++) {
                const easting = wkb.f64();
                const northing = wkb.f64();
                if (polyHasZ) {
                    wkb.f64(); // ignora Z
                }
                const { lat, lon } = project(easting, northing);
                points.push([lon, lat]);
            }
            rings.push(points);
        }
        polygons.push(rings);
    }

    return polygons.length > 0 ? polygons : null;
}
