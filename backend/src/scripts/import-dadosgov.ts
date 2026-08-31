/**
 * Descobre datasets de estacionamento no dados.gov.pt, saca os recursos e importa-os para a BD.
 *
 * Descoberta:
 *   - API do dados.gov.pt (default): pesquisa por palavras-chave ("estacionamento", "parking", ...)
 *   - Export de catálogo CSV (--catalog data/export-resource-*.csv): filtra as linhas pelo título
 *
 * Recursos CSV/GeoJSON/JSON e shapefiles (shp/zip) são sacados; formatos sem coordenadas (pdf, wms, ...) são ignorados.
 * Shapefiles: unzip em memória + parsing binário nativo (sem GDAL) + reprojeção via .prj (WGS84, ETRS89/TM06, Datum 73).
 * Coordenadas validadas dentro de Portugal; dedup por (MUNICIPAL, externalId) e por proximidade (25 m).
 *
 *   npm run import:dadosgov                                      (pesquisa na API)
 *   npm run import:dadosgov -- --query "parques de estacionamento" --max-datasets 10
 *   npm run import:dadosgov -- --catalog ../data/export-resource-20260809-021208.csv
 *   npm run import:dadosgov -- --dry-run                         (mostra o que importaria, sem escrever)
 */
import 'reflect-metadata';
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { container } from 'tsyringe';
import { setupContainer } from '../shared/container/container';
import { PARKING_TOKENS } from '../shared/container/tokens/parking.tokens';
import type { IParkingRepository } from '../modules/parking/domain/repositories/IParking.repository';
import { isInsidePortugal } from '../modules/parking/domain/geo';
import { datum73ToWgs84, etrs89Tm06ToWgs84 } from '../modules/parking/domain/projection';
import { parseCsv } from '../modules/parking/infrastructure/services/CsvImporter.service';
import { prisma } from '../lib/prisma';

const API_BASE = 'https://dados.gov.pt/api/1';
const USER_AGENT = 'importer/1.0';

/** Palavras que indicam dataset de estacionamento (título/keywords, sem acentos, lowercase). */
const PARKING_TERMS = ['estacionamento', 'parking', 'parques de estacionamento', 'parquimetro'];
/** Palavras que indicam falso positivo (ex.: "parques e jardins", "parques infantis"). */
const EXCLUDE_TERMS = ['jardim', 'jardins', 'infantil', 'infantis', 'campismo', 'merendas', 'canil'];

const IMPORTABLE_FORMATS = new Set(['csv', 'geojson', 'json', 'shp', 'zip', 'shapefile']);
/** Formatos servidos como binário (zip de shapefile). */
const BINARY_FORMATS = new Set(['shp', 'zip', 'shapefile']);

function normalize(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function isParkingTitle(title: string): boolean {
    const t = normalize(title);
    return PARKING_TERMS.some((term) => t.includes(term)) && !EXCLUDE_TERMS.some((term) => t.includes(term));
}

interface DiscoveredResource {
    datasetSlug: string;
    datasetTitle: string;
    resourceId: string;
    url: string;
    format: string;
}

// ─────────────────────── Descoberta via API ───────────────────────

interface ApiResource {
    id: string;
    url: string;
    format?: string | null;
    title?: string | null;
}
interface ApiDataset {
    slug: string;
    title: string;
    resources: ApiResource[];
}

async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status} em ${url}`);
    return (await response.json()) as T;
}

async function discoverViaApi(query: string, maxDatasets: number): Promise<DiscoveredResource[]> {
    const resources: DiscoveredResource[] = [];
    const seenDatasets = new Set<string>();
    let page = 1;

    while (seenDatasets.size < maxDatasets) {
        const url = `${API_BASE}/datasets/?q=${encodeURIComponent(query)}&page=${page}&page_size=20`;
        const body = await fetchJson<{ data: ApiDataset[]; next_page: string | null }>(url);
        if (!body.data?.length) break;

        for (const dataset of body.data) {
            if (seenDatasets.size >= maxDatasets) break;
            if (!isParkingTitle(dataset.title) || seenDatasets.has(dataset.slug)) continue;
            seenDatasets.add(dataset.slug);
            for (const resource of dataset.resources ?? []) {
                const format = (resource.format ?? '').toLowerCase().trim();
                if (!IMPORTABLE_FORMATS.has(format)) continue;
                resources.push({
                    datasetSlug: dataset.slug,
                    datasetTitle: dataset.title,
                    resourceId: resource.id,
                    url: resource.url,
                    format,
                });
            }
        }
        if (!body.next_page) break;
        page++;
    }
    return resources;
}

// ─────────────────── Descoberta via export de catálogo CSV ───────────────────

function discoverViaCatalog(file: string): DiscoveredResource[] {
    const rows = parseCsv(readFileSync(file, 'utf8'));
    const resources: DiscoveredResource[] = [];
    for (const row of rows) {
        const title = row['dataset.title'] ?? '';
        if (!isParkingTitle(title)) continue;
        const format = (row['format'] ?? '').toLowerCase().trim();
        if (!IMPORTABLE_FORMATS.has(format)) continue;
        resources.push({
            datasetSlug: row['dataset.slug'] || row['dataset.id'] || 'catalogo',
            datasetTitle: title,
            resourceId: row['id'] || row['url'],
            url: row['url'],
            format,
        });
    }
    return resources;
}

// ─────────────────────── Extração de pontos ───────────────────────

interface ExtractedSpot {
    name: string;
    description: string | null;
    latitude: number;
    longitude: number;
    /** Id estável dentro do recurso (para o externalId). */
    rowId: string;
}

const NAME_KEYS = ['name', 'nome', 'designacao', 'designação', 'label', 'title', 'titulo', 'parque', 'descricao'];
const LAT_KEYS = ['latitude', 'lat', 'y_wgs84', 'ycoord', 'coord_y', 'y'];
const LON_KEYS = ['longitude', 'lon', 'lng', 'long', 'x_wgs84', 'xcoord', 'coord_x', 'x'];
const GEOPOINT_KEYS = ['geo_point_2d', 'geo_point', 'localizacao geografica', 'localização geográfica', 'geopoint', 'coordenadas'];
const ID_KEYS = ['id', 'objectid', 'fid', 'gid', 'codigo', 'cod'];

function pickKey(keys: string[], candidates: string[]): string | undefined {
    const normalized = new Map(keys.map((k) => [normalize(k), k]));
    for (const candidate of candidates) {
        const found = normalized.get(candidate);
        if (found) return found;
    }
    return undefined;
}

function toNumber(value: unknown): number | null {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number.parseFloat(String(value).replace(',', '.').trim());
    return Number.isFinite(parsed) ? parsed : null;
}

function validCoords(lat: number | null, lon: number | null): lat is number {
    return lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && isInsidePortugal(lat, lon);
}

function extractFromCsvContent(content: string): ExtractedSpot[] {
    const rows = parseCsv(content);
    if (rows.length === 0) return [];
    const keys = Object.keys(rows[0]);

    const nameKey = pickKey(keys, NAME_KEYS);
    const idKey = pickKey(keys, ID_KEYS);
    let latKey = pickKey(keys, LAT_KEYS);
    let lonKey = pickKey(keys, LON_KEYS);
    const geoKey = pickKey(keys, GEOPOINT_KEYS);

    // x/y podem ser coordenadas projetadas (metros) — valida na primeira linha com dados
    if (latKey && lonKey) {
        const probe = rows.find((r) => toNumber(r[latKey!]) !== null);
        if (probe && !validCoords(toNumber(probe[latKey]), toNumber(probe[lonKey]))) {
            latKey = undefined;
            lonKey = undefined;
        }
    }

    const spots: ExtractedSpot[] = [];
    for (const row of rows) {
        let lat: number | null = null;
        let lon: number | null = null;
        if (latKey && lonKey) {
            lat = toNumber(row[latKey]);
            lon = toNumber(row[lonKey]);
        } else if (geoKey && row[geoKey]) {
            const [a, b] = row[geoKey].split(',').map((v) => toNumber(v));
            lat = a ?? null;
            lon = b ?? null;
        }
        if (!validCoords(lat, lon)) continue;
        spots.push({
            name: (nameKey && row[nameKey]?.trim()) || 'Parque de estacionamento',
            description: null,
            latitude: lat,
            longitude: lon!,
            rowId: (idKey && row[idKey]?.trim()) || `${lat.toFixed(6)},${lon!.toFixed(6)}`,
        });
    }
    return spots;
}

interface GeoJsonFeature {
    id?: string | number;
    geometry?: { type: string; coordinates: unknown } | null;
    properties?: Record<string, unknown> | null;
}

function referencePointOf(geometry: { type: string; coordinates: unknown }): [number, number] | null {
    const c = geometry.coordinates;
    try {
        if (geometry.type === 'Point') return c as [number, number];
        if (geometry.type === 'MultiPoint' || geometry.type === 'LineString')
            return (c as [number, number][])[0] ?? null;
        if (geometry.type === 'Polygon' || geometry.type === 'MultiLineString')
            return (c as [number, number][][])[0]?.[0] ?? null;
        if (geometry.type === 'MultiPolygon') return (c as [number, number][][][])[0]?.[0]?.[0] ?? null;
    } catch {
        return null;
    }
    return null;
}

function extractFromGeoJson(content: string): ExtractedSpot[] {
    const parsed = JSON.parse(content) as { type?: string; features?: GeoJsonFeature[] };
    if (parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) return [];

    const spots: ExtractedSpot[] = [];
    for (const element of parsed.features) {
        const feature = element;
        if (!feature.geometry) continue;
        const point = referencePointOf(feature.geometry);
        if (!point) continue;
        const [lon, lat] = point.map((v) => toNumber(v)) as [number | null, number | null];
        if (!validCoords(lat, lon)) continue;

        const props = feature.properties ?? {};
        const propKeys = Object.keys(props);
        const nameKey = pickKey(propKeys, NAME_KEYS);
        const idKey = pickKey(propKeys, ID_KEYS);
        spots.push({
            name: (nameKey && String(props[nameKey]).trim()) || 'Parque de estacionamento',
            description: null,
            latitude: lat,
            longitude: lon!,
            rowId: String(feature.id ?? (idKey ? props[idKey] : '') ?? '').trim() || `${lat.toFixed(6)},${lon!.toFixed(6)}`,
        });
    }
    return spots;
}

/** JSON genérico: array de objetos com colunas tipo CSV, ou GeoJSON disfarçado. */
function extractFromJson(content: string): ExtractedSpot[] {
    const parsed = JSON.parse(content) as unknown;
    if (parsed && typeof parsed === 'object' && (parsed as { type?: string }).type === 'FeatureCollection') {
        return extractFromGeoJson(content);
    }
    const list = Array.isArray(parsed)
        ? parsed
        : ((parsed as { records?: unknown[]; results?: unknown[] })?.records ??
            (parsed as { results?: unknown[] })?.results ??
            []);
    if (!Array.isArray(list) || list.length === 0) return [];

    const spots: ExtractedSpot[] = [];
    for (const item of list) {
        // Formato ODS/opendatasoft: { fields: {...}, geometry: {...} }
        const record = (item as { fields?: Record<string, unknown> })?.fields ?? (item as Record<string, unknown>);
        if (!record || typeof record !== 'object') continue;
        const keys = Object.keys(record);
        const latKey = pickKey(keys, LAT_KEYS);
        const lonKey = pickKey(keys, LON_KEYS);
        const geoKey = pickKey(keys, GEOPOINT_KEYS);
        let lat: number | null = null;
        let lon: number | null = null;
        if (latKey && lonKey) {
            lat = toNumber(record[latKey]);
            lon = toNumber(record[lonKey]);
        } else if (geoKey) {
            const geo = record[geoKey];
            if (Array.isArray(geo)) {
                lat = toNumber(geo[0]);
                lon = toNumber(geo[1]);
            } else if (typeof geo === 'string') {
                const [a, b] = geo.split(',').map((v) => toNumber(v));
                lat = a ?? null;
                lon = b ?? null;
            }
        }
        if (!validCoords(lat, lon)) continue;
        const nameKey = pickKey(keys, NAME_KEYS);
        const idKey = pickKey(keys, ID_KEYS);
        spots.push({
            name: (nameKey && String(record[nameKey]).trim()) || 'Parque de estacionamento',
            description: null,
            latitude: lat,
            longitude: lon!,
            rowId: (idKey && String(record[idKey]).trim()) || `${lat.toFixed(6)},${lon!.toFixed(6)}`,
        });
    }
    return spots;
}

// ─────────────────────── Shapefile (zip) ───────────────────────

interface ZipEntry {
    name: string;
    data: Buffer;
}

/** Lê as entradas de um ZIP (STORE/DEFLATE) sem dependências externas. */
function readZipEntries(zip: Buffer): ZipEntry[] {
    // End of Central Directory (assinatura 0x06054b50), procurada a partir do fim
    let eocd = -1;
    for (let i = zip.length - 22; i >= 0; i--) {
        if (zip.readUInt32LE(i) === 0x06054b50) {
            eocd = i;
            break;
        }
    }
    if (eocd < 0) throw new Error('ZIP inválido (EOCD não encontrado)');
    const entryCount = zip.readUInt16LE(eocd + 10);
    let offset = zip.readUInt32LE(eocd + 16);

    const entries: ZipEntry[] = [];
    for (let i = 0; i < entryCount; i++) {
        if (zip.readUInt32LE(offset) !== 0x02014b50) break;
        const method = zip.readUInt16LE(offset + 10);
        const compressedSize = zip.readUInt32LE(offset + 20);
        const nameLen = zip.readUInt16LE(offset + 28);
        const extraLen = zip.readUInt16LE(offset + 30);
        const commentLen = zip.readUInt16LE(offset + 32);
        const localOffset = zip.readUInt32LE(offset + 42);
        const name = zip.subarray(offset + 46, offset + 46 + nameLen).toString('utf8');

        // Local file header: os tamanhos de nome/extra podem diferir dos do central directory
        const localNameLen = zip.readUInt16LE(localOffset + 26);
        const localExtraLen = zip.readUInt16LE(localOffset + 28);
        const dataStart = localOffset + 30 + localNameLen + localExtraLen;
        const raw = zip.subarray(dataStart, dataStart + compressedSize);
        const data = method === 8 ? inflateRawSync(raw) : Buffer.from(raw);
        entries.push({ name, data });

        offset += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
}

/** Decodifica texto DBF: tenta UTF-8, cai para latin1 (datasets antigos). */
function decodeDbfText(buf: Buffer): string {
    const utf8 = buf.toString('utf8');
    return utf8.includes('\uFFFD') ? buf.toString('latin1') : utf8;
}

/** Lê os registos (atributos) de um DBF a partir de um Buffer. */
function readDbfRecords(buf: Buffer): Record<string, string | number>[] {
    const recordCount = buf.readUInt32LE(4);
    const headerSize = buf.readUInt16LE(8);
    const recordSize = buf.readUInt16LE(10);
    const fields: { name: string; type: string; len: number }[] = [];
    let offset = 32;
    while (offset + 32 <= headerSize - 1) {
        const name = decodeDbfText(buf.subarray(offset, offset + 11)).replaceAll('\0', '').trim();
        const type = String.fromCodePoint(buf[offset + 11]);
        const len = buf.readUInt8(offset + 16);
        fields.push({ name, type, len });
        offset += 32;
    }
    const records: Record<string, string | number>[] = [];
    for (let r = 0; r < recordCount; r++) {
        const rec = buf.subarray(headerSize + r * recordSize, headerSize + (r + 1) * recordSize);
        if (rec.length < recordSize || rec[0] !== 0x20) continue; // registo apagado/truncado
        const obj: Record<string, string | number> = {};
        let dataOffset = 1;
        for (const field of fields) {
            const raw = decodeDbfText(rec.subarray(dataOffset, dataOffset + field.len)).trim();
            dataOffset += field.len;
            if (field.type === 'N' && raw !== '') {
                const n = Number.parseFloat(raw.replace(',', '.'));
                obj[field.name] = Number.isFinite(n) ? n : raw;
            } else {
                obj[field.name] = raw;
            }
        }
        records.push(obj);
    }
    return records;
}

/**
 * Ponto de referência de cada registo do SHP (alinhado 1:1 com os registos do DBF).
 * Point → o próprio; MultiPoint/PolyLine/Polygon → primeiro vértice; outros → null.
 */
function shpReferencePoints(buf: Buffer): ([number, number] | null)[] {
    const points: ([number, number] | null)[] = [];
    let pos = 100;
    while (pos + 12 <= buf.length) {
        const contentLen = buf.readInt32BE(pos + 4) * 2;
        const type = buf.readInt32LE(pos + 8);
        let point: [number, number] | null = null;
        if (type === 1 && contentLen >= 20) {
            // Point: X,Y logo após o tipo
            point = [buf.readDoubleLE(pos + 12), buf.readDoubleLE(pos + 20)];
        } else if (type === 8 && contentLen >= 56) {
            // MultiPoint: bbox(32) + numPoints(4) + pontos
            point = [buf.readDoubleLE(pos + 48), buf.readDoubleLE(pos + 56)];
        } else if ((type === 3 || type === 5) && contentLen >= 52) {
            // PolyLine/Polygon: bbox(32) + numParts(4) + numPoints(4) + parts + pontos
            const numParts = buf.readInt32LE(pos + 44);
            const firstXY = pos + 52 + numParts * 4;
            if (firstXY + 16 <= buf.length) {
                point = [buf.readDoubleLE(firstXY), buf.readDoubleLE(firstXY + 8)];
            }
        }
        points.push(point);
        pos += 8 + contentLen;
    }
    return points;
}

type Projection = (x: number, y: number) => { lat: number; lon: number };

/** Escolhe a projeção com base no .prj (WKT) ou, na falta dele, por heurística sobre um ponto. */
function projectionFor(prj: string | null, sample: [number, number] | undefined): Projection | null {
    const wkt = prj ? normalize(prj) : '';
    if (wkt) {
        if (!wkt.includes('projcs')) return (x, y) => ({ lat: y, lon: x }); // geográfico (WGS84/ETRS89)
        if (wkt.includes('datum_73') || wkt.includes('datum 73') || wkt.includes('d73')) {
            return (x, y) => datum73ToWgs84(x, y);
        }
        if (wkt.includes('etrs') || wkt.includes('tm06') || wkt.includes('3763')) {
            return (x, y) => etrs89Tm06ToWgs84(x, y);
        }
    }
    if (!sample) return null;
    const [x, y] = sample;
    if (validCoords(y, x)) return (px, py) => ({ lat: py, lon: px });
    const tm06 = etrs89Tm06ToWgs84(x, y);
    if (validCoords(tm06.lat, tm06.lon)) return (px, py) => etrs89Tm06ToWgs84(px, py);
    const d73 = datum73ToWgs84(x, y);
    if (validCoords(d73.lat, d73.lon)) return (px, py) => datum73ToWgs84(px, py);
    return null;
}

/** Extrai pontos de um zip de shapefile (.shp + .dbf + .prj) ou de um .shp cru, com reprojeção para WGS84. */
export function extractFromShpZip(zip: Buffer): ExtractedSpot[] {
    // .shp cru (não zipado): magic 9994 big-endian no offset 0
    if (zip.length > 100 && zip.readInt32BE(0) === 9994) {
        return extractFromShpEntries([{ name: 'file.shp', data: zip }]);
    }
    return extractFromShpEntries(readZipEntries(zip));
}

function extractFromShpEntries(entries: ZipEntry[]): ExtractedSpot[] {
    const shpEntry = entries.find((e) => e.name.toLowerCase().endsWith('.shp'));
    if (!shpEntry) return [];
    const base = shpEntry.name.slice(0, -4).toLowerCase();
    const dbfEntry = entries.find((e) => e.name.toLowerCase() === `${base}.dbf`);
    const prjEntry = entries.find((e) => e.name.toLowerCase() === `${base}.prj`);

    const rawPoints = shpReferencePoints(shpEntry.data);
    const records = dbfEntry ? readDbfRecords(dbfEntry.data) : [];
    const project = projectionFor(
        prjEntry ? prjEntry.data.toString('latin1') : null,
        rawPoints.find((p): p is [number, number] => p !== null)
    );
    if (!project) return [];

    const spots: ExtractedSpot[] = [];
    for (let i = 0; i < rawPoints.length; i++) {
        const raw = rawPoints[i];
        if (!raw) continue;
        const { lat, lon } = project(raw[0], raw[1]);
        if (!validCoords(lat, lon)) continue;

        const record = records[i] ?? {};
        const keys = Object.keys(record);
        const nameKey = pickKey(keys, NAME_KEYS);
        const idKey = pickKey(keys, ID_KEYS);
        spots.push({
            name: (nameKey && String(record[nameKey]).trim()) || 'Parque de estacionamento',
            description: null,
            latitude: lat,
            longitude: lon,
            rowId: (idKey && String(record[idKey]).trim()) || `${lat.toFixed(6)},${lon.toFixed(6)}`,
        });
    }
    return spots;
}

// ─────────────────────── Importação ───────────────────────

interface Counts {
    imported: number;
    skipped: number;
    errors: number;
}

async function importSpots(
    repo: IParkingRepository,
    resource: DiscoveredResource,
    spots: ExtractedSpot[],
    counts: Counts,
    dryRun: boolean
): Promise<void> {
    for (const spot of spots) {
        const externalId = `dadosgov:${resource.datasetSlug}:${spot.rowId}`;
        try {
            const exists = await repo.findByExternalId('MUNICIPAL', externalId);
            if (exists) {
                counts.skipped++;
                continue;
            }
            const nearby = await repo.findNearby(spot.latitude, spot.longitude, 25);
            if (nearby.some((s) => s.source === 'MUNICIPAL' && s.externalId !== externalId)) {
                counts.skipped++;
                continue;
            }
            if (dryRun) {
                console.log(`    [dry-run] ${spot.name} (${spot.latitude.toFixed(5)}, ${spot.longitude.toFixed(5)})`);
                counts.imported++;
                continue;
            }
            await repo.create({
                name: spot.name,
                description: spot.description,
                geometry: { type: 'Point', coordinates: [spot.longitude, spot.latitude] },
                parkingType: 'OTHER',
                capacityRange: null,
                isFree: null,
                source: 'MUNICIPAL',
                externalId,
                status: 'APPROVED',
                trustScore: 7,
            });
            counts.imported++;
        } catch (error) {
            counts.errors++;
            console.error(`    [erro] ${externalId}:`, error instanceof Error ? error.message : error);
        }
    }
}

/** Faz o download do URL original; se falhar (ex. 403 Cloudflare), tenta o mirror do dados.gov.pt. */
async function fetchWithMirror(resource: DiscoveredResource): Promise<Response> {
    let originalError: string;
    try {
        const response = await fetch(resource.url, { headers: { 'User-Agent': USER_AGENT }, redirect: 'follow' });
        if (response.ok) return response;
        originalError = `HTTP ${response.status}`;
    } catch (error) {
        originalError = error instanceof Error ? error.message : String(error);
    }
    const mirror = `${API_BASE}/datasets/r/${resource.resourceId}`;
    console.log(`  original falhou (${originalError}), a tentar mirror ${mirror}`);
    const response = await fetch(mirror, { headers: { 'User-Agent': USER_AGENT }, redirect: 'follow' });
    if (!response.ok) throw new Error(`${originalError} (mirror: HTTP ${response.status})`);
    return response;
}

async function downloadResource(resource: DiscoveredResource): Promise<string> {
    return await (await fetchWithMirror(resource)).text();
}

async function downloadBinary(resource: DiscoveredResource): Promise<Buffer> {
    return Buffer.from(await (await fetchWithMirror(resource)).arrayBuffer());
}

function getArg(args: string[], name: string): string | undefined {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : undefined;
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const catalog = getArg(args, 'catalog');
    const query = getArg(args, 'query') ?? 'estacionamento';
    const maxDatasets = Number.parseInt(getArg(args, 'max-datasets') ?? '25', 10);
    // O npm consome "--dry-run" (flag do próprio npm) e passa-a como npm_config_dry_run
    const dryRun = args.includes('--dry-run') || process.env.npm_config_dry_run === 'true';

    console.log(
        catalog
            ? `Descobrindo datasets de estacionamento no catálogo "${catalog}"...`
            : `Pesquisando "${query}" no dados.gov.pt (máx. ${maxDatasets} datasets)...`
    );
    const resources = catalog ? discoverViaCatalog(catalog) : await discoverViaApi(query, maxDatasets);

    if (resources.length === 0) {
        console.log('Nenhum recurso importável (csv/geojson/json) de estacionamento encontrado.');
        return;
    }

    // Um recurso por dataset+formato chega (evita importar o mesmo dataset em csv E geojson E shp)
    const byDataset = new Map<string, DiscoveredResource>();
    const formatPriority = ['geojson', 'csv', 'json', 'shp', 'shapefile', 'zip'];
    for (const resource of resources) {
        const current = byDataset.get(resource.datasetSlug);
        if (!current || formatPriority.indexOf(resource.format) < formatPriority.indexOf(current.format)) {
            byDataset.set(resource.datasetSlug, resource);
        }
    }
    console.log(`${byDataset.size} datasets com recursos importáveis:\n`);

    setupContainer();
    const repo = container.resolve<IParkingRepository>(PARKING_TOKENS.IParkingRepository);
    const totals: Counts = { imported: 0, skipped: 0, errors: 0 };
    const failedDownloads: { resource: DiscoveredResource; message: string }[] = [];

    for (const resource of byDataset.values()) {
        console.log(`[${resource.datasetSlug}] ${resource.datasetTitle}`);
        console.log(`  ${resource.format} ← ${resource.url}`);
        try {
            let spots: ExtractedSpot[];
            if (BINARY_FORMATS.has(resource.format)) {
                spots = extractFromShpZip(await downloadBinary(resource));
            } else {
                const content = await downloadResource(resource);
                if (resource.format === 'geojson') spots = extractFromGeoJson(content);
                else if (resource.format === 'csv') spots = extractFromCsvContent(content);
                else spots = extractFromJson(content);
            }
            console.log(`  ${spots.length} pontos válidos em Portugal`);
            const counts: Counts = { imported: 0, skipped: 0, errors: 0 };
            await importSpots(repo, resource, spots, counts, dryRun);
            console.log(`  → ${JSON.stringify(counts)}`);
            totals.imported += counts.imported;
            totals.skipped += counts.skipped;
            totals.errors += counts.errors;
        } catch (error) {
            totals.errors++;
            const message = error instanceof Error ? error.message : String(error);
            console.error('  [erro no download/parse]:', message);
            failedDownloads.push({ resource, message });
        }
    }

    if (failedDownloads.length > 0) {
        const file = 'dadosgov-falhados.txt';
        const lines = failedDownloads.map(
            ({ resource, message }) =>
                `[${resource.datasetSlug}] ${resource.datasetTitle}\n  formato: ${resource.format}\n  erro: ${message}\n  url: ${resource.url}\n  mirror: ${API_BASE}/datasets/r/${resource.resourceId}\n`
        );
        writeFileSync(file, `Downloads falhados (${new Date().toISOString()}) — sacar manualmente:\n\n${lines.join('\n')}`, 'utf8');
        console.log(`\n${failedDownloads.length} download(s) falhados guardados em ${file}`);
    }

    console.log(`\nTotal${dryRun ? ' (dry-run)' : ''}:`, JSON.stringify(totals));
}

if (require.main === module) {
    main()
        .catch((error) => {
            console.error('Erro no import dados.gov.pt:', error);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
