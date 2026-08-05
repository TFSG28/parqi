import { inject, injectable } from 'tsyringe';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { IParkingRepository } from '../../domain/repositories/IParking.repository';
import type {
    CsvImportOptions,
    CsvImportResult,
    ICsvImporter,
} from '../../domain/services/IImporter.service';

/**
 * Importa estacionamentos de CSV de dados abertos municipais.
 * Dedup por (source=MUNICIPAL, externalId="<dataset>:<id|lat,lon>") e cross-source por proximidade.
 * Ficheiros SHP: converter primeiro com `ogr2ogr -f CSV out.csv in.shp -lco GEOMETRY=AS_XY`.
 */
@injectable()
export class CsvImporter implements ICsvImporter {
    constructor(
        @inject(PARKING_TOKENS.IParkingRepository)
        private readonly parkingRepository: IParkingRepository
    ) {}

    async importFromCsv(csvContent: string, options: CsvImportOptions): Promise<CsvImportResult> {
        const rows = parseCsv(csvContent);
        if (rows.length === 0) {
            return { imported: 0, skipped: 0, errors: 0 };
        }

        const nameColumn = options.nameColumn ?? 'name';
        const latColumn = options.latColumn ?? 'latitude';
        const lonColumn = options.lonColumn ?? 'longitude';

        let imported = 0;
        let skipped = 0;
        let errors = 0;

        for (const row of rows) {
            try {
                const latitude = parseCoordinate(row[latColumn]);
                const longitude = parseCoordinate(row[lonColumn]);
                if (
                    latitude === null ||
                    longitude === null ||
                    Math.abs(latitude) > 90 ||
                    Math.abs(longitude) > 180
                ) {
                    skipped++;
                    continue;
                }

                const rowId =
                    (options.idColumn && row[options.idColumn]?.trim()) ||
                    `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
                const externalId = `${options.dataset}:${rowId}`;

                const exists = await this.parkingRepository.findByExternalId('MUNICIPAL', externalId);
                if (exists) {
                    skipped++;
                    continue;
                }

                // Dedup cross-source (os dados podem repetir-se entre câmaras/OSM/Geoapify/comunidade)
                const nearby = await this.parkingRepository.findNearby(latitude, longitude, 25);
                if (nearby.some((spot) => spot.source !== 'MUNICIPAL')) {
                    skipped++;
                    continue;
                }

                await this.parkingRepository.create({
                    name: row[nameColumn]?.trim() || `Parque de estacionamento (${options.dataset})`,
                    description: null,
                    geometry: { type: 'Point', coordinates: [longitude, latitude] },
                    parkingType: 'OTHER',
                    capacityRange: null,
                    isFree: null,
                    source: 'MUNICIPAL',
                    externalId,
                    status: 'APPROVED',
                    trustScore: 7,
                });
                imported++;
            } catch {
                errors++;
            }
        }

        return { imported, skipped, errors };
    }
}

/** Aceita vírgula decimal ("41,44"), comum em dados abertos PT. */
function parseCoordinate(value: string | undefined): number | null {
    if (!value) return null;
    const parsed = Number.parseFloat(value.trim().replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Parser CSV RFC 4180 (aspas, delimitador dentro de aspas, quebras de linha em campos).
 * Delimitador auto-detetado no cabeçalho: ';' se mais frequente que ',' (padrão PT).
 */
export function parseCsv(content: string): Record<string, string>[] {
    const text = content.replace(/^\uFEFF/, '');
    if (!text.trim()) return [];

    const headerLine = text.slice(0, text.indexOf('\n') === -1 ? text.length : text.indexOf('\n'));
    const delimiter =
        (headerLine.match(/;/g)?.length ?? 0) > (headerLine.match(/,/g)?.length ?? 0) ? ';' : ',';

    const records: string[][] = [];
    let field = '';
    let record: string[] = [];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (inQuotes) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === delimiter) {
            record.push(field);
            field = '';
        } else if (char === '\n' || char === '\r') {
            if (char === '\r' && text[i + 1] === '\n') i++;
            record.push(field);
            field = '';
            records.push(record);
            record = [];
        } else {
            field += char;
        }
    }
    if (field !== '' || record.length > 0) {
        record.push(field);
        records.push(record);
    }

    const [header, ...dataRows] = records.filter((r) => r.some((f) => f.trim() !== ''));
    if (!header) return [];

    const keys = header.map((h) => h.trim().toLowerCase());
    return dataRows.map((row) =>
        Object.fromEntries(keys.map((key, index) => [key, row[index] ?? '']))
    );
}
