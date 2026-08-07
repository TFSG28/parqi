/**
 * Projeções geográficas (inversas): converter coordenadas projetadas para WGS84 (lat/lon).
 *
 * Implementa a inversa de Transverse Mercator (fórmulas de Snyder) com elipsóide
 * configurável — suficiente para:
 *   - ETRS89 / Portugal TM06 (EPSG:3763) — Continente (CAOP)
 *   - PTRA08 / UTM 25N/26N/28N (EPSG:5014/5015/5016) — Açores/Madeira (CAOP)
 *   - Datum 73 / Modified Portuguese Grid — SHP antigos (CML, etc.)
 *
 * Precisão: ETRS89/PTRA08 ≈ WGS84 (diferenças sub-métricas, ignoradas — irrelevante
 * para dados à escala 1:10 000+); o Datum 73 aplica ainda o shift de 7 parâmetros.
 */

export interface TransverseMercatorParams {
    /** Semieixo maior do elipsóide (metros). */
    a: number;
    /** Inverso do achatamento (1/f). */
    invF: number;
    /** Latitude da origem (graus). */
    lat0Deg: number;
    /** Meridiano central (graus). */
    lon0Deg: number;
    /** Fator de escala. */
    k0: number;
    /** Falso este. */
    fe: number;
    /** Falso norte. */
    fn: number;
}

const GRS80 = { a: 6_378_137.0, invF: 298.257222101 } as const;

function meridianArc(phi: number, a: number, e2: number): number {
    return (
        a *
        ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * phi -
            ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * phi) +
            ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * phi) -
            ((35 * e2 ** 3) / 3072) * Math.sin(6 * phi))
    );
}

/** Inversa da Transverse Mercator (Snyder, p. 61-63). Devolve { lat, lon } em graus. */
export function transverseMercatorInverse(
    easting: number,
    northing: number,
    params: TransverseMercatorParams
): { lat: number; lon: number } {
    const { a, invF, lat0Deg, lon0Deg, k0, fe, fn } = params;
    const e2 = 2 * (1 / invF) - (1 / invF) ** 2;
    const ep2 = e2 / (1 - e2);
    const lat0 = (lat0Deg * Math.PI) / 180;
    const lon0 = (lon0Deg * Math.PI) / 180;

    const x = easting - fe;
    const y = northing - fn;
    const M = meridianArc(lat0, a, e2) + y / k0;
    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
    const mu = M / (a * (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256));
    const phi1 =
        mu +
        ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
        ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
        ((151 * e1 ** 3) / 96) * Math.sin(6 * mu);

    const sinP = Math.sin(phi1);
    const cosP = Math.cos(phi1);
    const N_ = a / Math.sqrt(1 - e2 * sinP * sinP);
    const R = (a * (1 - e2)) / (1 - e2 * sinP * sinP) ** 1.5;
    const T = Math.tan(phi1) ** 2;
    const C = ep2 * cosP ** 2;
    const D = x / k0 / N_;

    const phi =
        phi1 -
        ((N_ * Math.tan(phi1)) / R) *
            (D ** 2 / 2 -
                ((5 + 3 * T + 10 * C - 4 * C ** 2 - 9 * ep2) * D ** 4) / 24 +
                ((61 + 90 * T + 298 * C + 45 * T ** 2 - 252 * ep2 - 3 * C ** 2) * D ** 6) / 720);
    const lam =
        lon0 +
        (D -
            ((1 + 2 * T + C) * D ** 3) / 6 +
            ((5 - 2 * C + 28 * T - 3 * C ** 2 + 8 * ep2 + 24 * T ** 2) * D ** 5) / 120) /
            cosP;

    return { lat: (phi * 180) / Math.PI, lon: (lam * 180) / Math.PI };
}

/** ETRS89 / Portugal TM06 (EPSG:3763) → WGS84. ETRS89 ≈ WGS84 (diferença sub-métrica). */
export function etrs89Tm06ToWgs84(
    easting: number,
    northing: number
): { lat: number; lon: number } {
    return transverseMercatorInverse(easting, northing, {
        ...GRS80,
        lat0Deg: 39.6682583333333,
        lon0Deg: -8.13310833333333,
        k0: 1,
        fe: 0,
        fn: 0,
    });
}

/** PTRA08 / UTM (EPSG:5014=25N, 5015=26N, 5016=28N) → WGS84. PTRA08 ≈ WGS84. */
export function ptra08UtmToWgs84(
    easting: number,
    northing: number,
    zone: 25 | 26 | 28
): { lat: number; lon: number } {
    const centralMeridian = zone === 25 ? -33 : zone === 26 ? -27 : -15;
    return transverseMercatorInverse(easting, northing, {
        ...GRS80,
        lat0Deg: 0,
        lon0Deg: centralMeridian,
        k0: 0.9996,
        fe: 500_000,
        fn: 0,
    });
}

// ───────────────────────── Datum 73 (Hayford + shift 7 parâmetros) ─────────────────────────

const A_73 = 6378388.0;
const F_73 = 1 / 297.0;
const DATUM73_TM: TransverseMercatorParams = {
    a: A_73,
    invF: 297,
    lat0Deg: 39.66666666666666,
    lon0Deg: -8.131906111111112,
    k0: 1.0,
    fe: 180.598,
    fn: -86.99,
};
const DX = 223.289;
const DY = 49.853;
const DZ = 223.89;
const A_WGS = 6378137.0;
const F_WGS = 1 / 298.257223563;
const E2_WGS = 2 * F_WGS - F_WGS * F_WGS;
const EP2_WGS = E2_WGS / (1 - E2_WGS);
const E2_73 = 2 * F_73 - F_73 * F_73;

/** Datum 73 / Modified Portuguese Grid (Hayford) → WGS84 (TM inverso + shift de 7 parâmetros). */
export function datum73ToWgs84(
    easting: number,
    northing: number
): { lat: number; lon: number } {
    const { lat, lon } = transverseMercatorInverse(easting, northing, DATUM73_TM);
    const phi = (lat * Math.PI) / 180;
    const lam = (lon * Math.PI) / 180;
    const N73 = A_73 / Math.sqrt(1 - E2_73 * Math.sin(phi) ** 2);
    const X = N73 * Math.cos(phi) * Math.cos(lam);
    const Y = N73 * Math.cos(phi) * Math.sin(lam);
    const Z = N73 * (1 - E2_73) * Math.sin(phi);
    const p = Math.sqrt((X + DX) ** 2 + (Y + DY) ** 2);
    const b = A_WGS * Math.sqrt(1 - E2_WGS);
    const theta = Math.atan2((Z + DZ) * A_WGS, p * b);
    const phiW = Math.atan2(
        Z + DZ + EP2_WGS * b * Math.sin(theta) ** 3,
        p - E2_WGS * A_WGS * Math.cos(theta) ** 3
    );
    const lamW = Math.atan2(Y + DY, X + DX);
    return { lat: (phiW * 180) / Math.PI, lon: (lamW * 180) / Math.PI };
}
