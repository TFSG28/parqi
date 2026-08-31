/**
 * Migração idempotente dos dados OSM antigos.
 *
 * O projeto usa `prisma db push` em vez de `prisma migrate deploy`, por isso
 * esta rotina corre antes do db push para poder renomear o valor da enum
 * existente sem perder os estacionamentos já importados.
 */
import 'dotenv/config';
import { Pool } from 'pg';

const LEGACY_SOURCE = 'OVERPASS';
const OSM_SOURCE = 'OSM';
const OSM_TECHNICAL_SUFFIX = String.raw`[[:space:]]*\(OSM[[:space:]]+(way|node)/[0-9]+\)[[:space:]]*$`;

async function main(): Promise<void> {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ DATABASE_URL não definida no ambiente');
        process.exit(1);
    }

    const pool = new Pool({ connectionString });

    try {
        await pool.query('BEGIN');

        const { rows: enumRows } = await pool.query<{ label: string }>(
            `
                SELECT e.enumlabel AS label
                FROM pg_type t
                JOIN pg_enum e ON e.enumtypid = t.oid
                WHERE t.typname = 'DataSource'
                  AND e.enumlabel IN ($1, $2)
            `,
            [LEGACY_SOURCE, OSM_SOURCE]
        );
        const labels = new Set(enumRows.map((row) => row.label));

        if (labels.has(LEGACY_SOURCE) && !labels.has(OSM_SOURCE)) {
            await pool.query(`ALTER TYPE "DataSource" RENAME VALUE '${LEGACY_SOURCE}' TO '${OSM_SOURCE}'`);
            labels.delete(LEGACY_SOURCE);
            labels.add(OSM_SOURCE);
        }

        const { rows: tableRows } = await pool.query<{ exists: boolean }>(
            `SELECT to_regclass('public."ParkingSpot"') IS NOT NULL AS exists`
        );

        if (tableRows[0]?.exists && labels.has(OSM_SOURCE)) {
            const result = await pool.query(
                `
                    UPDATE "ParkingSpot"
                    SET "name" = trim(regexp_replace("name", $1, '', 'gi'))
                    WHERE "name" ~* $1
                `,
                [OSM_TECHNICAL_SUFFIX]
            );
            console.log(`✅ Dados OSM normalizados: ${result.rowCount ?? 0} título(s) limpo(s)`);
        } else {
            console.log('ℹ️ Migração OSM sem alterações (base ainda não inicializada ou já atualizada)');
        }

        await pool.query('COMMIT');
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('❌ Falha na migração dos dados OSM:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
