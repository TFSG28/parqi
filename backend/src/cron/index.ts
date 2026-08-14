import { prisma } from '../lib/prisma';
import { logger } from '../shared/utils/logger';

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_PENDING_DAYS = 90;

/**
 * Contribuições da comunidade PENDING há mais de 90 dias e sem um único voto
 * nunca vão ser validadas — rejeita-as para não acumularem lixo na base de
 * dados nem na fila de moderação. REJECTED não aparece no mapa e não bloqueia
 * o dedup de novas contribuições no mesmo sítio.
 */
async function rejectStalePending(): Promise<void> {
    try {
        const cutoff = new Date(Date.now() - STALE_PENDING_DAYS * DAY_MS);
        const { count } = await prisma.parkingSpot.updateMany({
            where: {
                source: 'COMMUNITY',
                status: 'PENDING',
                createdAt: { lt: cutoff },
                votes: { none: {} },
            },
            data: { status: 'REJECTED' },
        });
        if (count > 0) {
            logger.info({ count }, 'Contribuições PENDING expiradas rejeitadas');
        }
    } catch (error) {
        logger.error({ error }, 'Limpeza de PENDING antigos falhou');
    }
}

export function initCronJobs() {
    if (process.env.NODE_ENV === 'test') {
        return;
    }
    //   setInterval chega para um job diário; node-cron se um dia for preciso horário exato
    setInterval(rejectStalePending, DAY_MS).unref();
    setTimeout(rejectStalePending, 30_000).unref();
    logger.info('Cron jobs initialized');
}
