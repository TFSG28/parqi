/**
 * Ativa a extensão PostGIS na base de dados (idempotente).
 * Correr ANTES de `prisma db push` / migrations, porque as colunas
 * geometry do schema dependem da extensão.
 *
 * Uso: npm run db-extensions
 */
import 'dotenv/config';
import { Pool } from 'pg';

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ DATABASE_URL não definida no ambiente');
        process.exit(1);
    }

    const pool = new Pool({ connectionString });

    try {
        await pool.query('CREATE EXTENSION IF NOT EXISTS postgis;');
        const { rows } = await pool.query<{ version: string }>(
            'SELECT PostGIS_Version() AS version;'
        );
        console.log('✅ PostGIS pronto:', rows[0]?.version ?? 'n/a');
    } catch (error) {
        console.error('❌ Falha ao ativar PostGIS:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
