import { logger } from '../shared/utils/logger';

/**
 * Cache in-memory com TTL (substituto leve do Redis).
 * Usa Map + setTimeout para expiração automática.
 */

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

/** Teto de entradas em memória; acima disso expulsa as mais antigas (FIFO). */
const MAX_ENTRIES = 5_000;

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
        // Sem teto, o Map crescia sem limite entre prunes de 5 min. Com teto,
        // picos de escrita nunca podem esgotar a memória do processo.
        if (this.store.size > MAX_ENTRIES) {
            const overflow = this.store.size - MAX_ENTRIES;
            let evicted = 0;
            for (const oldest of this.store.keys()) {
                this.store.delete(oldest);
                if (++evicted >= overflow) break;
            }
        }
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

// Cron leve de limpeza (a cada 5 min) — fora de testes para não manter o
// processo vivo nem poluir a execução.
if (typeof setInterval !== 'undefined' && process.env.NODE_ENV !== 'test') {
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
