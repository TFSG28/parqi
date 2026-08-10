import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ParkingSpot } from '../types/parking';

const STORAGE_KEY = 'parqi.favorites';

/**
 * Favoritos guardados no dispositivo (AsyncStorage): funcionam igual com e
 * sem conta, offline incluído. Guardamos um snapshot completo do spot para a
 * lista funcionar mesmo fora do viewport atual; o detalhe atualiza-o ao abrir.
 */
interface FavoritesContextValue {
    favorites: ParkingSpot[];
    isFavorite: (id: string) => boolean;
    toggleFavorite: (spot: ParkingSpot) => void;
    /** Atualiza o snapshot guardado quando há dados frescos do servidor. */
    refreshFavorite: (spot: ParkingSpot) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function persist(next: ParkingSpot[]) {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
    const [favorites, setFavorites] = useState<ParkingSpot[]>([]);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then((raw) => {
                if (raw) setFavorites(JSON.parse(raw));
            })
            .catch(() => {});
    }, []);

    const toggleFavorite = useCallback((spot: ParkingSpot) => {
        setFavorites((prev) => {
            const next = prev.some((f) => f.id === spot.id)
                ? prev.filter((f) => f.id !== spot.id)
                : [...prev, spot];
            persist(next);
            return next;
        });
    }, []);

    const refreshFavorite = useCallback((spot: ParkingSpot) => {
        setFavorites((prev) => {
            if (!prev.some((f) => f.id === spot.id)) return prev;
            const next = prev.map((f) => (f.id === spot.id ? spot : f));
            persist(next);
            return next;
        });
    }, []);

    const value = useMemo(
        () => ({
            favorites,
            isFavorite: (id: string) => favorites.some((f) => f.id === id),
            toggleFavorite,
            refreshFavorite,
        }),
        [favorites, toggleFavorite, refreshFavorite]
    );

    return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
    const ctx = useContext(FavoritesContext);
    if (!ctx) {
        throw new Error('useFavorites deve ser usado dentro de FavoritesProvider');
    }
    return ctx;
}
