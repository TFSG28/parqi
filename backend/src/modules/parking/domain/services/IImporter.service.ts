export interface OverpassImportResult {
    city: string;
    imported: number;
    skipped: number;
    errors: number;
}

export interface IOverpassImporter {
    importByCity(city: string, areaName?: string): Promise<OverpassImportResult>;
}

export interface GeoapifyImportOptions {
    /** "lon1,lat1,lon2,lat2" */
    bbox?: string;
    center?: { lon: number; lat: number };
    radius?: number;
    maxItems?: number;
}

export interface GeoapifyImportResult {
    imported: number;
    skipped: number;
    errors: number;
}

export interface IGeoapifyImporter {
    importByArea(options: GeoapifyImportOptions): Promise<GeoapifyImportResult>;
}

export interface CsvImportOptions {
    /** Slug do dataset (ex.: "cm-braga-2026") — prefixo do externalId para dedup. */
    dataset: string;
    nameColumn?: string;
    latColumn?: string;
    lonColumn?: string;
    /** Coluna com id estável do dataset; sem ela usa-se lat,lon arredondado. */
    idColumn?: string;
}

export interface CsvImportResult {
    imported: number;
    skipped: number;
    errors: number;
}

export interface ICsvImporter {
    importFromCsv(csvContent: string, options: CsvImportOptions): Promise<CsvImportResult>;
}

// ───────────────────────── OSM país inteiro (bbox) ─────────────────────────

/** Regiões de Portugal cobertas pelo importador OSM (Continente + ilhas). */
export type OsmRegionKey = 'continente' | 'madeira' | 'acores';

export interface OsmRegion {
    key: OsmRegionKey;
    label: string;
    /** Overpass bbox: [south, west, north, east]. */
    bbox: [number, number, number, number];
}

export const OSM_REGIONS: OsmRegion[] = [
    { key: 'continente', label: 'Continente', bbox: [36.9, -9.7, 42.2, -6.05] },
    { key: 'madeira', label: 'Madeira', bbox: [32.3, -17.5, 33.2, -16.2] },
    { key: 'acores', label: 'Açores', bbox: [36.6, -31.5, 39.9, -24.8] },
];

export interface OsmRegionResult {
    region: OsmRegionKey;
    imported: number;
    skipped: number;
    errors: number;
}

export interface OsmImportResult {
    regions: OsmRegionResult[];
    imported: number;
    skipped: number;
    errors: number;
}

export interface IOsmImporter {
    importRegion(region: OsmRegionKey): Promise<OsmRegionResult>;
    importAll(): Promise<OsmImportResult>;
}

// ───────────────────────── CAOP (gpkg) ─────────────────────────

export interface CaopImportResult {
    /** Concelhos importados/atualizados (de todos os ficheiros gpkg). */
    municipalities: number;
    /** Parque de estacionamento associados ao seu concelho (backfill). */
    backfilled: number;
    files: { file: string; municipalities: number }[];
}

export interface ICaopImporter {
    importMunicipalities(options?: { skipBackfill?: boolean }): Promise<CaopImportResult>;
}
