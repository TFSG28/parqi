import { logger } from '../shared/utils/logger';

/**
 * Cache in-memory com TTL (substituto leve do Redis).
 * Usa Map + setTimeout para expiração automática.
 */

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

class MemoryCache {
    private store = new Map<string, CacheEntry<unknown>>();
    private readonly defaultTTL: number;

    constructor(defaultTTLSeconds = 300) {
        this.defaultTTL = defaultTTLSeconds * 1000;
    }

    get<T = string>(key: string): T | null {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.value as T;
    }

    set<T = string>(key: string, value: T, ttlSeconds?: number): void {
        const ttl = (ttlSeconds ?? this.defaultTTL / 1000) * 1000;
        this.store.set(key, {
            value,
            expiresAt: Date.now() + ttl,
        });
    }

    del(key: string): void {
        this.store.delete(key);
    }

    /** Invalida todas as entradas que começam com o prefixo. */
    invalidateByPrefix(prefix: string): number {
        let count = 0;
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
                count++;
            }
        }
        return count;
    }

    /** Remove entradas expiradas (útil para cron). */
    prune(): number {
        const now = Date.now();
        let count = 0;
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.expiresAt) {
                this.store.delete(key);
                count++;
            }
        }
        return count;
    }

    get size(): number {
        return this.store.size;
    }
}

/** Singleton da cache da aplicação. */
export const cache = new MemoryCache(300);

// Cron leve de limpeza (a cada 5 min)
if (typeof setInterval !== 'undefined') {
    setInterval(
        () => {
            const pruned = cache.prune();
            if (pruned > 0) {
                logger.debug({ pruned }, 'Cache: entradas expiradas removidas');
            }
        },
        5 * 60 * 1000,
    );
}

// Helpers compatíveis com a API anterior do Redis
export const initCache = () => {
    logger.info('Cache in-memory inicializado (TTL padrão: 300s)');
    return cache;
};

export const getCacheClient = () => cache;

export const cacheGet = async (key: string): Promise<string | null> => {
    return cache.get(key);
};

export const cacheSet = async (key: string, value: string, ttl = 300): Promise<void> => {
    cache.set(key, value, ttl);
};

export const cacheDel = async (key: string): Promise<void> => {
    cache.del(key);
};
