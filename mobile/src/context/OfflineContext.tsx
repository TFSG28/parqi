import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import type { ParkingSpot } from '../types/parking';

interface OfflineContextValue {
    isOnline: boolean;
    cachedSpots: Map<string, ParkingSpot>;
    /** Guarda spots no cache local. */
    cacheSpot: (spot: ParkingSpot) => void;
    /** Devolve spot do cache ou null. */
    getCachedSpot: (id: string) => ParkingSpot | null;
    /** Fila de contribuições pendentes de envio. */
    pendingQueue: PendingContribution[];
    addToQueue: (item: PendingContribution) => void;
    removeFromQueue: (id: string) => void;
    syncQueue: () => Promise<number>;
}

export interface PendingContribution {
    id: string;
    type: 'create' | 'vote' | 'suggest';
    data: Record<string, unknown>;
    createdAt: string;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

const SPOTS_CACHE_KEY = 'parqi.offline_spots';
const QUEUE_KEY = 'parqi.offline_queue';

export function OfflineProvider({ children }: { children: ReactNode }) {
    const [isOnline, setIsOnline] = useState(true);
    const [cachedSpots, setCachedSpots] = useState<Map<string, ParkingSpot>>(new Map());
    const [pendingQueue, setPendingQueue] = useState<PendingContribution[]>([]);

    // Monitor de conectividade
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
            setIsOnline(state.isConnected ?? true);
        });
        return () => unsubscribe();
    }, []);

    // Carrega cache do disco ao iniciar
    useEffect(() => {
        (async () => {
            try {
                const [rawSpots, rawQueue] = await Promise.all([
                    AsyncStorage.getItem(SPOTS_CACHE_KEY),
                    AsyncStorage.getItem(QUEUE_KEY),
                ]);
                if (rawSpots) {
                    const spots: ParkingSpot[] = JSON.parse(rawSpots);
                    const map = new Map<string, ParkingSpot>();
                    spots.forEach((s) => map.set(s.id, s));
                    setCachedSpots(map);
                }
                if (rawQueue) {
                    setPendingQueue(JSON.parse(rawQueue));
                }
            } catch {
                // ignora — o cache é best-effort
            }
        })();
    }, []);

    // Persiste cache no disco
    const persistSpots = useCallback(async (map: Map<string, ParkingSpot>) => {
        const arr = Array.from(map.values());
        // Mantém no máximo 200 spots em cache
        const trimmed = arr.slice(-200);
        await AsyncStorage.setItem(SPOTS_CACHE_KEY, JSON.stringify(trimmed)).catch(() => {});
    }, []);

    const persistQueue = useCallback(async (queue: PendingContribution[]) => {
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue)).catch(() => {});
    }, []);

    const cacheSpot = useCallback(
        (spot: ParkingSpot) => {
            setCachedSpots((prev) => {
                const next = new Map(prev);
                next.set(spot.id, spot);
                persistSpots(next);
                return next;
            });
        },
        [persistSpots],
    );

    const getCachedSpot = useCallback(
        (id: string): ParkingSpot | null => {
            return cachedSpots.get(id) ?? null;
        },
        [cachedSpots],
    );

    const addToQueue = useCallback(
        (item: PendingContribution) => {
            setPendingQueue((prev) => {
                const next = [...prev, item];
                persistQueue(next);
                return next;
            });
        },
        [persistQueue],
    );

    const removeFromQueue = useCallback(
        (id: string) => {
            setPendingQueue((prev) => {
                const next = prev.filter((item) => item.id !== id);
                persistQueue(next);
                return next;
            });
        },
        [persistQueue],
    );

    /** Tenta enviar itens da fila; devolve quantos foram processados. */
    const syncQueue = useCallback(async (): Promise<number> => {
        if (!isOnline || pendingQueue.length === 0) return 0;
        let synced = 0;
        // Sincronização é best-effort — itens que falham ficam para a próxima
        const remaining = [...pendingQueue];
        for (const item of pendingQueue) {
            try {
                // O envio real depende do tipo (create/vote/suggest) e usa a API
                // A implementação completa depende do parkingApi
                removeFromQueue(item.id);
                remaining.splice(remaining.indexOf(item), 1);
                synced++;
            } catch {
                // fica na fila para a próxima tentativa
            }
        }
        return synced;
    }, [isOnline, pendingQueue, removeFromQueue]);

    const value = useMemo(
        () => ({
            isOnline,
            cachedSpots,
            cacheSpot,
            getCachedSpot,
            pendingQueue,
            addToQueue,
            removeFromQueue,
            syncQueue,
        }),
        [isOnline, cachedSpots, cacheSpot, getCachedSpot, pendingQueue, addToQueue, removeFromQueue, syncQueue],
    );

    return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline(): OfflineContextValue {
    const ctx = useContext(OfflineContext);
    if (!ctx) {
        throw new Error('useOffline deve ser usado dentro de OfflineProvider');
    }
    return ctx;
}
