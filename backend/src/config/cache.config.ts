import Redis from 'ioredis';
import { logger } from '../shared/utils/logger';

let redisClient: Redis | null = null;

export const initRedis = () => {
    if (!process.env.REDIS_URL) {
        logger.warn('REDIS_URL não configurado, cache desabilitado');
        return null;
    }

    try {
        redisClient = new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });

        redisClient.on('connect', () => {
            logger.info('Redis conectado');
        });

        redisClient.on('error', (err) => {
            logger.error({ err }, 'Erro no Redis');
        });

        return redisClient;
    } catch (error) {
        logger.error({ error }, 'Falha ao inicializar Redis');
        return null;
    }
};

export const getRedisClient = () => redisClient;

export const cacheGet = async (key: string): Promise<string | null> => {
    if (!redisClient) return null;
    try {
        return await redisClient.get(key);
    } catch (error) {
        logger.error({ error, key }, 'Erro ao buscar cache');
        return null;
    }
};

export const cacheSet = async (key: string, value: string, ttl = 300): Promise<void> => {
    if (!redisClient) return;
    try {
        await redisClient.setex(key, ttl, value);
    } catch (error) {
        logger.error({ error, key }, 'Erro ao salvar cache');
    }
};

export const cacheDel = async (key: string): Promise<void> => {
    if (!redisClient) return;
    try {
        await redisClient.del(key);
    } catch (error) {
        logger.error({ error, key }, 'Erro ao deletar cache');
    }
};
