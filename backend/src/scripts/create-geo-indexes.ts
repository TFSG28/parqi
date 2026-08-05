/**
 * Cria os índices espaciais GiST nas colunas PostGIS do ParkingSpot.
 * Os índices não podem ser declarados no schema Prisma (colunas Unsupported),
 * por isso são criados aqui. Idempotente.
 *
 * Uso: npm run db-indexes (já incluído em `db-update`)
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
        await pool.query(
            'CREATE INDEX IF NOT EXISTS "ParkingSpot_geom_gist" ON "ParkingSpot" USING GIST ("geom");'
        );
        await pool.query(
            'CREATE INDEX IF NOT EXISTS "ParkingSpot_boundary_gist" ON "ParkingSpot" USING GIST ("boundary");'
        );
        console.log('✅ Índices espaciais GiST criados/verificados');
    } catch (error) {
        // As tabelas podem ainda não existir (primeira execução antes do db push)
        console.warn('⚠️ Não foi possível criar índices (tabela ainda não existe?):', error);
    } finally {
        await pool.end();
    }
}

main();
