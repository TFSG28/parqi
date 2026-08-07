/**
 * Importa os dados da pasta data/ do parqi para a BD (fonte MUNICIPAL):
 *
 *   npm run import:data -- --all
 *   npm run import:data -- --csv-porto            # pontos-de-interesse-parques-de-estacionamento.csv (CitySDK, Porto, WGS84)
 *   npm run import:data -- --shp-lisboa           # Parques.shp (Câmara Municipal de Lisboa, Datum 73 -> WGS84)
 *   npm run import:data -- --shp-guimaraes        # transportes_comunicacoes.shp (Guimarães; usa colunas x_wgs84/y_wgs84)
 *
 * Dedup por (source=MUNICIPAL, externalId) e cross-source por proximidade (25 m).
 * Sem GDAL/ogr2ogr: parsing binário nativo do SHP/DBF + transformação Datum73->WGS84 em Node.
 */
import 'reflect-metadata';
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { container } from 'tsyringe';
import { setupContainer } from '../shared/container/container';
import { PARKING_TOKENS } from '../shared/container/tokens/parking.tokens';
import type { IParkingRepository } from '../modules/parking/domain/repositories/IParking.repository';
import type { CapacityRange, ParkingGeometryInput } from '../modules/parking/domain/entities/ParkingSpot.entity';
import { getReferencePoint } from '../modules/parking/domain/geo';
import { datum73ToWgs84 } from '../modules/parking/domain/projection';
import { prisma } from '../lib/prisma';

const DATA_DIR = process.env.PARQI_DATA_DIR ?? path.resolve(__dirname, '../../../data');

// ─────────────────────── Utilitários ───────────────────────

/** Decodifica texto DBF: tenta UTF-8, cai para latin1 (datasets antigos). */
function decodeText(buf: Buffer): string {
    const utf8 = buf.toString('utf8');
    if (!utf8.includes('\uFFFD')) return utf8;
    return buf.toString('latin1');
}

function toNumber(value: string | number | undefined | null): number | null {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number.parseFloat(String(value).replace(',', '.').trim());
    return Number.isFinite(parsed) ? parsed : null;
}

function capacityFromCount(count: number | null): CapacityRange | null {
    if (!count || count <= 0) return null;
    if (count <= 5) return 'RANGE_1_5';
    if (count <= 20) return 'RANGE_6_20';
    if (count <= 50) return 'RANGE_21_50';
    if (count <= 100) return 'RANGE_51_100';
    return 'RANGE_100_PLUS';
}

// ─────────────────────── CSV CitySDK (Porto) ───────────────────────

/** Parse de linha CitySDK: campos separados por ',' e delimitados por ' ('' = escape). */
function parseCitySdkLine(line: string): string[] {
    const fields: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQ) {
            if (ch === "'") {
                if (line[i + 1] === "'") { cur += "'"; i++; }
                else inQ = false;
            } else cur += ch;
        } else if (ch === "'") inQ = true;
        else if (ch === ',') { fields.push(cur); cur = ''; }
        else cur += ch;
    }
    fields.push(cur);
    return fields;
}

function extractCitySdkField(raw: string | undefined): string | null {
    if (!raw) return null;
    const match = raw.match(/\{\s*'lang':\s*'pt-PT'[^}]*?'value':\s*'([^']*)'\s*\}/);
    return match ? match[1].trim() : null;
}

function extractOthersValue(raw: string | undefined, type: string): string | null {
    if (!raw) return null;
    const regex = new RegExp(`\\{\\s*'type':\\s*'${type}'[^}]*?'value':\\s*'([^']*)'`);
    const match = raw.match(regex);
    return match ? match[1] : null;
}

interface PortoRow {
    id: string;
    name: string;
    description: string;
    latitude: number;
    longitude: number;
    capacity: number | null;
    zone: string | null;
    price: string | null;
}

export function parsePortoCitySdkCsv(content: string): PortoRow[] {
    const lines = content.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const rows: PortoRow[] = [];
    for (const line of lines.slice(1)) {
        const f = parseCitySdkLine(line);
        const latitude = toNumber(f[10]);
        const longitude = toNumber(f[11]);
        if (latitude === null || longitude === null) continue;
        const description = extractCitySdkField(f[4]);
        const capacity = toNumber(extractOthersValue(f[5], 'x-citysdk/capacity'));
        const zone = extractOthersValue(f[5], 'x-citysdk/geographical-zone');
        const price = extractOthersValue(f[5], 'x-citysdk/price');
        const name = extractCitySdkField(f[7]) ?? `Parque de estacionamento (${f[6]})`;
        rows.push({
            id: f[6],
            name,
            description:
                description ??
                [zone ? `Zona ${zone}` : null, capacity ? `${capacity} lugares` : null]
                    .filter(Boolean)
                    .join('. '),
            latitude,
            longitude,
            capacity,
            zone,
            price,
        });
    }
    return rows;
}

// ─────────────────────── SHP/DBF ───────────────────────

interface DbfField {
    name: string;
    type: string;
    len: number;
}

export function readDbf(file: string): { fields: DbfField[]; records: Record<string, string | number>[] } {
    const buf = readFileSync(file);
    const recordCount = buf.readUInt32LE(4);
    const headerSize = buf.readUInt16LE(8);
    const recordSize = buf.readUInt16LE(10);
    const fields: DbfField[] = [];
    let offset = 32;
    while (offset + 32 <= headerSize - 1) {
        const name = decodeText(buf.subarray(offset, offset + 11)).replace(/\0+$/, '').trim();
        const type = String.fromCharCode(buf[offset + 11]);
        const len = buf.readUInt8(offset + 16);
        fields.push({ name, type, len });
        offset += 32;
    }
    const records: Record<string, string | number>[] = [];
    for (let r = 0; r < recordCount; r++) {
        const rec = buf.subarray(headerSize + r * recordSize, headerSize + (r + 1) * recordSize);
        if (rec[0] !== 0x20) continue; // registo apagado
        const obj: Record<string, string | number> = {};
        let dataOffset = 1;
        for (const field of fields) {
            const raw = decodeText(rec.subarray(dataOffset, dataOffset + field.len)).trim();
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
    return { fields, records };
}

/** Extrai pontos de um shapefile (tipos Point e MultiPoint; polígonos/lines ignorados). */
export function readShpPoints(file: string): [number, number][] {
    const buf = readFileSync(file);
    const pts: [number, number][] = [];
    let pos = 100;
    while (pos + 8 <= buf.length) {
        const contentLen = buf.readInt32BE(pos + 4) * 2;
        const type = buf.readInt32LE(pos + 8);
        if (type === 1 && contentLen >= 20) {
            pts.push([buf.readDoubleLE(pos + 12), buf.readDoubleLE(pos + 20)]);
        } else if (type === 8 && contentLen >= 40) {
            const numPoints = buf.readInt32LE(pos + 12 + 32);
            for (let i = 0; i < numPoints; i++) {
                pts.push([buf.readDoubleLE(pos + 12 + 40 + i * 16), buf.readDoubleLE(pos + 12 + 48 + i * 16)]);
            }
        }
        pos += 8 + contentLen;
    }
    return pts;
}

// ─────── Datum 73 / Modified Portuguese Grid → WGS84 ───────
// (implementação em modules/parking/domain/projection.ts)

// ─────────────────────── Importação ───────────────────────

interface ImportCounts {
    imported: number;
    skipped: number;
    errors: number;
}

async function importSpot(
    repo: IParkingRepository,
    data: {
        name: string;
        description: string | null;
        geometry: ParkingGeometryInput;
        capacityRange?: CapacityRange | null;
        isFree?: boolean | null;
        hasDisabledSpaces?: boolean | null;
        hasPregnantSpaces?: boolean | null;
        hasEvCharging?: boolean | null;
        isCovered?: boolean | null;
        externalId: string;
    },
    counts: ImportCounts
): Promise<void> {
    try {
        const exists = await repo.findByExternalId('MUNICIPAL', data.externalId);
        if (exists) {
            counts.skipped++;
            return;
        }
        const [lon, lat] = getReferencePoint(data.geometry);
        const nearby = await repo.findNearby(lat, lon, 25);
        // Dedup entre datasets municipais; dados OSM/Geoapify podem coexistir
        // (a fonte municipal é mais fiável e o mapa mostra a origem de cada um).
        if (nearby.some((spot) => spot.source === 'MUNICIPAL' && spot.externalId !== data.externalId)) {
            counts.skipped++;
            return;
        }
        await repo.create({
            name: data.name,
            description: data.description,
            geometry: data.geometry,
            parkingType: 'OTHER',
            capacityRange: data.capacityRange ?? null,
            isFree: data.isFree ?? null,
            hasDisabledSpaces: data.hasDisabledSpaces ?? null,
            hasPregnantSpaces: data.hasPregnantSpaces ?? null,
            hasEvCharging: data.hasEvCharging ?? null,
            isCovered: data.isCovered ?? null,
            source: 'MUNICIPAL',
            externalId: data.externalId,
            status: 'APPROVED',
            trustScore: 7,
        });
        counts.imported++;
    } catch (error) {
        counts.errors++;
        console.error(`  [erro] ${data.externalId}:`, error instanceof Error ? error.message : error);
    }
}

async function importPortoCsv(repo: IParkingRepository): Promise<ImportCounts> {
    const counts: ImportCounts = { imported: 0, skipped: 0, errors: 0 };
    const file = path.join(DATA_DIR, 'pontos-de-interesse-parques-de-estacionamento.csv');
    console.log(`\n[Porto · CitySDK] ${file}`);
    const rows = parsePortoCitySdkCsv(readFileSync(file, 'utf8'));
    console.log(`  ${rows.length} parques no CSV`);
    for (const row of rows) {
        const parts: string[] = [];
        if (row.zone) parts.push(`Zona ${row.zone}`);
        if (row.capacity) parts.push(`${row.capacity} lugares`);
        if (row.price && row.price !== '0') parts.push('Pago');
        await importSpot(
            repo,
            {
                name: row.name,
                description: row.description || (parts.length ? parts.join('. ') : null),
                geometry: { type: 'Point', coordinates: [row.longitude, row.latitude] },
                capacityRange: capacityFromCount(row.capacity),
                isFree: row.price === '0' ? true : null,
                externalId: `porto-citysdk:${row.id}`,
            },
            counts
        );
    }
    return counts;
}

async function importLisboaShp(repo: IParkingRepository): Promise<ImportCounts> {
    const counts: ImportCounts = { imported: 0, skipped: 0, errors: 0 };
    const shp = path.join(DATA_DIR, 'Parques.shp');
    const dbf = path.join(DATA_DIR, 'Parques.dbf');
    console.log(`\n[Lisboa · CML Parques] ${shp}`);
    const points = readShpPoints(shp);
    const { records } = readDbf(dbf);
    console.log(`  ${records.length} registos, ${points.length} pontos`);
    for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const point = points[i];
        if (!point) continue;
        const wgs = datum73ToWgs84(point[0], point[1]);
        const name = String(row['Parque'] ?? '').trim() || `Parque de estacionamento (CML ${row['OBJECTID'] ?? i})`;
        const address = String(row['MoradaPrq'] ?? '').trim();
        const hours = String(row['Hrotacao'] ?? '').trim();
        const services = ['SrvCarris', 'SrvMetro', 'SrvCP', 'SrvViaVerd', 'SrvCVE']
            .map((f) => String(row[f] ?? '').trim())
            .filter((v) => v && v !== 'Não' && v.length > 1);
        const description = [address, services.join(', '), hours ? `Horário: ${hours}` : null]
            .filter(Boolean)
            .join('. ') || null;
        const total = toNumber(row['LugarTotal']);
        const disabled = toNumber(row['LgDef']);
        const prices = ['TTmin', 'TT1h', 'TT2h', 'TT3h', 'TT4h', 'TTmax', 'TNmin', 'TN1h', 'TN2h', 'TN3h', 'TN4h', 'TNmax']
            .map((f) => toNumber(row[f]))
            .filter((v): v is number => v !== null);
        await importSpot(
            repo,
            {
                name,
                description,
                geometry: { type: 'Point', coordinates: [wgs.lon, wgs.lat] },
                capacityRange: capacityFromCount(total),
                isFree: prices.length > 0 && prices.every((p) => p === 0) ? true : null,
                hasDisabledSpaces: disabled !== null && disabled > 0 ? true : null,
                externalId: `cm-lisboa-parques:${row['idPQ_Posic'] ?? row['OBJECTID'] ?? i}`,
            },
            counts
        );
    }
    return counts;
}

async function importGuimaraesShp(repo: IParkingRepository): Promise<ImportCounts> {
    const counts: ImportCounts = { imported: 0, skipped: 0, errors: 0 };
    const shp = path.join(DATA_DIR, 'transportes_comunicacoes.shp');
    const dbf = path.join(DATA_DIR, 'transportes_comunicacoes.dbf');
    console.log(`\n[Guimarães · transportes] ${shp}`);
    const { records } = readDbf(dbf);
    console.log(`  ${records.length} registos`);
    for (const row of records) {
        const lat = toNumber(row['y_wgs84']);
        const lon = toNumber(row['x_wgs84']);
        if (lat === null || lon === null) {
            counts.skipped++;
            continue;
        }
        const freguesia = String(row['FREGUESIA'] ?? '').trim();
        const rua = String(row['RUA'] ?? '').trim();
        const base = String(row['DESIGNACAO'] ?? 'Parque de Estacionamento').trim();
        const name = rua ? `${base} — ${rua}` : freguesia ? `${base} — ${freguesia}` : base;
        const fonte = String(row['FONTE'] ?? '').trim();
        const notas = String(row['NOTAS'] ?? '').trim();
        const description = [freguesia, fonte ? `Fonte: ${fonte}` : null, notas || null]
            .filter(Boolean)
            .join('. ') || null;
        await importSpot(
            repo,
            {
                name,
                description,
                geometry: { type: 'Point', coordinates: [lon, lat] },
                externalId: `cm-guimaraes-transportes:${row['OBJECTID']}`,
            },
            counts
        );
    }
    return counts;
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const all = args.includes('--all');
    const targets = {
        csvPorto: all || args.includes('--csv-porto'),
        shpLisboa: all || args.includes('--shp-lisboa'),
        shpGuimaraes: all || args.includes('--shp-guimaraes'),
    };
    if (!Object.values(targets).some(Boolean)) {
        console.error(
            'Uso: npm run import:data -- --all | --csv-porto | --shp-lisboa | --shp-guimaraes'
        );
        process.exit(1);
    }

    setupContainer();
    const repo = container.resolve<IParkingRepository>(PARKING_TOKENS.IParkingRepository);

    const totals: ImportCounts = { imported: 0, skipped: 0, errors: 0 };
    if (targets.csvPorto) {
        const r = await importPortoCsv(repo);
        console.log('  →', JSON.stringify(r));
        totals.imported += r.imported; totals.skipped += r.skipped; totals.errors += r.errors;
    }
    if (targets.shpLisboa) {
        const r = await importLisboaShp(repo);
        console.log('  →', JSON.stringify(r));
        totals.imported += r.imported; totals.skipped += r.skipped; totals.errors += r.errors;
    }
    if (targets.shpGuimaraes) {
        const r = await importGuimaraesShp(repo);
        console.log('  →', JSON.stringify(r));
        totals.imported += r.imported; totals.skipped += r.skipped; totals.errors += r.errors;
    }
    console.log('\nTotal:', JSON.stringify(totals));
}

main()
    .catch((error) => {
        console.error('Erro no import:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
