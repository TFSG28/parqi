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
