import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ParkingSpot } from '../types/parking';
import { distanceKm, formatDistance } from './geo';

const CACHE_KEY = 'parqi.parking_cache.v1';
const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export interface ParkingCache {
    items: ParkingSpot[];
    savedAt: string;
}

export async function readParkingCache(): Promise<ParkingCache | null> {
    try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<ParkingCache>;
        if (!Array.isArray(parsed.items) || typeof parsed.savedAt !== 'string') return null;
        return { items: parsed.items, savedAt: parsed.savedAt };
    } catch {
        return null;
    }
}

export async function writeParkingCache(items: ParkingSpot[]): Promise<void> {
    try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ items, savedAt: new Date().toISOString() }));
    } catch {
        // A cache indisponível não deve impedir o uso online.
    }
}

export async function readCachedSpot(id: string): Promise<ParkingSpot | null> {
    const cache = await readParkingCache();
    return cache?.items.find((spot) => spot.id === id) ?? null;
}

export async function writeSpotToCache(spot: ParkingSpot): Promise<void> {
    const cache = await readParkingCache();
    const items = cache?.items ?? [];
    const next = items.some((item) => item.id === spot.id)
        ? items.map((item) => item.id === spot.id ? spot : item)
        : [spot, ...items].slice(0, 500);
    await writeParkingCache(next);
}

export function isStale(iso: string): boolean {
    const timestamp = Date.parse(iso);
    return !Number.isFinite(timestamp) || Date.now() - timestamp > STALE_AFTER_MS;
}

export function freshnessLabel(iso: string): string {
    const timestamp = Date.parse(iso);
    if (!Number.isFinite(timestamp)) return 'Atualização desconhecida';

    const days = Math.max(0, Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000)));
    if (days === 0) return 'Atualizado hoje';
    if (days === 1) return 'Atualizado ontem';
    if (days < 7) return `Atualizado há ${days} dias`;
    if (days < 30) return 'Atualizado há mais de uma semana';
    return 'Atualização antiga';
}

export function trustMessage(spot: ParkingSpot): string {
    if (spot.status === 'PENDING' || spot.requiresReview) return 'Poucos dados. Confirma antes de ir.';
    if (spot.trustScore >= 8) return 'Bem verificado pela comunidade.';
    if (spot.trustScore >= 5) return 'Verificado pela comunidade.';
    return 'Confiança baixa. Confirma antes de ir.';
}

export function distanceLabel(spot: ParkingSpot, location: { latitude: number; longitude: number } | null): string | null {
    if (!location || spot.latitude === null || spot.longitude === null) return null;
    return formatDistance(distanceKm(location.latitude, location.longitude, spot.latitude, spot.longitude));
}

/** Ordena por utilidade: confiança, frescura e proximidade, sem afirmar disponibilidade. */
export function rankParkingSpots(
    spots: ParkingSpot[],
    location: { latitude: number; longitude: number } | null
): ParkingSpot[] {
    return [...spots].sort((a, b) => {
        const score = (spot: ParkingSpot) => {
            const distance = location && spot.latitude !== null && spot.longitude !== null
                ? distanceKm(location.latitude, location.longitude, spot.latitude, spot.longitude)
                : 100;
            const freshness = isStale(spot.updatedAt) ? 0 : 1;
            const verified = spot.status === 'APPROVED' ? 1 : 0;
            const free = spot.isFree === true ? 1 : 0;
            return verified * 40 + spot.trustScore * 5 + freshness * 8 + free * 2 - Math.min(distance, 50);
        };
        return score(b) - score(a);
    });
}