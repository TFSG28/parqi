/** Geometria MultiPolygon em GeoJSON (coordenadas [lon, lat], WGS84). */
export type MultiPolygonGeoJSON = {
    type: 'MultiPolygon';
    coordinates: number[][][][];
};

export interface MunicipalityImportData {
    /** Código DIC do concelho (ex.: 1106 Lisboa). */
    dic: string | null;
    name: string;
    distritoIlha: string | null;
    nuts1: string | null;
    nuts2: string | null;
    nuts3: string | null;
    nuts3Cod: string | null;
    areaHa: number | null;
    perimetroKm: number | null;
    nFreguesias: number | null;
    geojson: MultiPolygonGeoJSON;
}

export interface IMunicipalityRepository {
    /** Insere ou atualiza (por código DIC) um concelho e a sua geometria. */
    upsertMunicipality(data: MunicipalityImportData): Promise<void>;
    /**
     * Associa cada parque ainda sem concelho ao seu município
     * (point-in-polygon via PostGIS). Devolve o número de parques atualizados.
     */
    backfillParkingSpots(): Promise<number>;
    count(): Promise<number>;
}
