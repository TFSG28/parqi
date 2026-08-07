/**
 * Importa os concelhos da Carta Administrativa Oficial de Portugal (CAOP)
 * a partir dos ficheiros .gpkg (Continente, Madeira, Açores Central/Oriental,
 * Açores Ocidental) para a tabela Municipality (PostGIS, WGS84).
 *
 * - Lê os .gpkg com o SQLite nativo do Node (node:sqlite) — sem dependências novas.
 * - Converte as geometrias (ETRS89/TM06 e PTRA08/UTM) para WGS84 em Node.
 * - Associa ainda cada parque existente ao seu concelho (point-in-polygon, PostGIS).
 */
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { inject, injectable } from 'tsyringe';
// Type-only: não carrega node:sqlite no arranque (exige Node ≥ 22.5).
import type { DatabaseSync } from 'node:sqlite';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { etrs89Tm06ToWgs84, ptra08UtmToWgs84 } from '../../domain/projection';
import type {
    IMunicipalityRepository,
    MultiPolygonGeoJSON,
} from '../../domain/repositories/IMunicipality.repository';
import type { CaopImportResult, ICaopImporter } from '../../domain/services/IImporter.service';
import { parseGpkgMultiPolygon } from './gpkgParser';

interface GpkgLayer {
    table: string;
    srsId: number;
    file: string;
}

/** Projeção por srs_id dos ficheiros CAOP 2025. */
function projectionFor(srsId: number): ((e: number, n: number) => { lat: number; lon: number }) | null {
    switch (srsId) {
        case 3763: // ETRS89 / Portugal TM06 (Continente)
            return etrs89Tm06ToWgs84;
        case 5014: // PTRA08 / UTM 25N (Açores Ocidental)
            return (e, n) => ptra08UtmToWgs84(e, n, 25);
        case 5015: // PTRA08 / UTM 26N (Açores Central + Oriental)
            return (e, n) => ptra08UtmToWgs84(e, n, 26);
        case 5016: // PTRA08 / UTM 28N (Madeira)
            return (e, n) => ptra08UtmToWgs84(e, n, 28);
        default:
            return null;
    }
}

@injectable()
export class CaopImporter implements ICaopImporter {
    constructor(
        @inject(PARKING_TOKENS.IMunicipalityRepository)
        private readonly municipalityRepository: IMunicipalityRepository
    ) {}

    async importMunicipalities(options?: { skipBackfill?: boolean }): Promise<CaopImportResult> {
        const dataDir = process.env.PARQI_DATA_DIR ?? path.resolve(__dirname, '../../../../../../data');
        const layers = this.discoverMunicipioLayers(dataDir);
        if (layers.length === 0) {
            throw new Error(`Nenhum ficheiro .gpkg com camada *_municipios em ${dataDir}`);
        }

        const files: CaopImportResult['files'] = [];
        let municipalities = 0;
        let errors = 0;

        for (const layer of layers) {
            const project = projectionFor(layer.srsId);
            if (!project) {
                console.warn(`  ⚠️  ${layer.file}:${layer.table}: srs_id ${layer.srsId} não suportado — a ignorar`);
                continue;
            }

            const { DatabaseSync: DatabaseSyncCtor } = loadSqlite();
            const db = new DatabaseSyncCtor(path.join(dataDir, layer.file), { readOnly: true });
            try {
                const rows = db
                    .prepare(
                        `SELECT "dtmn", "municipio", "distrito_ilha", "nuts1", "nuts2", "nuts3", "nuts3_cod",
                                "area_ha", "perimetro_km", "n_freguesias", "geom"
                         FROM "${layer.table}"`
                    )
                    .all() as Record<string, unknown>[];

                let imported = 0;
                for (const row of rows) {
                    try {
                        const blob = row['geom'];
                        if (!(blob instanceof Uint8Array)) {
                            continue;
                        }
                        const coordinates = parseGpkgMultiPolygon(blob, project);
                        if (!coordinates) {
                            continue;
                        }
                        const geojson: MultiPolygonGeoJSON = { type: 'MultiPolygon', coordinates };
                        await this.municipalityRepository.upsertMunicipality({
                            dic: toNullableString(row['dtmn']),
                            name: toNullableString(row['municipio']) ?? 'Concelho sem nome',
                            distritoIlha: toNullableString(row['distrito_ilha']),
                            nuts1: toNullableString(row['nuts1']),
                            nuts2: toNullableString(row['nuts2']),
                            nuts3: toNullableString(row['nuts3']),
                            nuts3Cod: toNullableString(row['nuts3_cod']),
                            areaHa: toNullableNumber(row['area_ha']),
                            perimetroKm: toNullableNumber(row['perimetro_km']),
                            nFreguesias: toNullableNumber(row['n_freguesias']),
                            geojson,
                        });
                        imported++;
                    } catch (error) {
                        errors++;
                        console.error(
                            `  [erro] ${layer.file}:${layer.table}: ${String(row['municipio'] ?? row['dtmn'] ?? '?')} —`,
                            error instanceof Error ? error.message : error
                        );
                    }
                }
                municipalities += imported;
                files.push({ file: layer.file, municipalities: imported });
                console.log(`  ${layer.file}:${layer.table} → ${imported} concelhos (srs ${layer.srsId})`);
            } finally {
                db.close();
            }
        }

        if (errors > 0) {
            console.warn(`  ⚠️  ${errors} concelho(s) com erros — ver mensagens acima`);
        }

        let backfilled = 0;
        if (!options?.skipBackfill) {
            backfilled = await this.municipalityRepository.backfillParkingSpots();
        }

        return { municipalities, backfilled, files };
    }

    /** Descobre as camadas *_municipios dos .gpkg na pasta data/. */
    private discoverMunicipioLayers(dataDir: string): GpkgLayer[] {
        const { DatabaseSync: DatabaseSyncCtor } = loadSqlite();
        const layers: GpkgLayer[] = [];
        for (const file of readdirSync(dataDir).filter((f) => f.toLowerCase().endsWith('.gpkg'))) {
            let db: DatabaseSync | null = null;
            try {
                db = new DatabaseSyncCtor(path.join(dataDir, file), { readOnly: true });
                const tables = db
                    .prepare(
                        "SELECT table_name, srs_id FROM gpkg_contents WHERE data_type = 'features'"
                    )
                    .all() as { table_name: string; srs_id: number }[];
                for (const table of tables) {
                    if (table.table_name.endsWith('_municipios')) {
                        layers.push({ table: table.table_name, srsId: table.srs_id, file });
                    }
                }
            } catch (error) {
                console.warn(`  ⚠️  Não foi possível ler ${file}:`, error);
            } finally {
                db?.close();
            }
        }
        return layers;
    }
}

/**
 * Carrega node:sqlite de forma lazy (Node ≥ 22.5): a API não depende disto no arranque.
 */
function loadSqlite(): { DatabaseSync: typeof import('node:sqlite').DatabaseSync } {
    return createRequire(__filename)('node:sqlite') as typeof import('node:sqlite');
}

function toNullableString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text === '' ? null : text;
}

function toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
