import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import type { CapacityRange, ContributionStatus, DataSource, ParkingType } from '../types/parking';
import type { ThemeColors } from '../theme/colors';

type IoniconName = keyof typeof Ionicons.glyphMap;

/**
 * Google Maps em Android (funciona em Expo Go com watermark) e em builds iOS
 * com a key configurada; Apple Maps como fallback no iOS/Expo Go, onde o SDK
 * nativo da Google não está disponível e um mapa Google resultaria em ecrã vazio.
 */
export const MAP_PROVIDER =
    Platform.OS === 'android' || Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY)
        ? PROVIDER_GOOGLE
        : PROVIDER_DEFAULT;

export interface Region {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
}

/** Converte a viewport atual do mapa no parâmetro bbox da API. */
export function regionToBbox(region: Region): string {
    const minLon = region.longitude - region.longitudeDelta / 2;
    const maxLon = region.longitude + region.longitudeDelta / 2;
    const minLat = region.latitude - region.latitudeDelta / 2;
    const maxLat = region.latitude + region.latitudeDelta / 2;
    return `${minLon},${minLat},${maxLon},${maxLat}`;
}

/** Botão "Rota" -> abre o Google Maps com direções para o destino. */
export function directionsUrl(latitude: number, longitude: number): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
}

export const TYPE_META: Record<ParkingType, { label: string; icon: IoniconName; color: string }> = {
    SURFACE: { label: 'Ao ar livre', icon: 'sunny', color: '#0EA5E9' },
    UNDERGROUND: { label: 'Subterrâneo', icon: 'water', color: '#8B5CF6' },
    MULTI_STORY: { label: 'Edifício / andares', icon: 'business', color: '#0647AC' },
    STREET: { label: 'Na via', icon: 'car', color: '#FF6900' },
    OTHER: { label: 'Outro', icon: 'help', color: '#94A3B8' },
};

export const SOURCE_META: Record<DataSource, { label: string; icon: IoniconName; color: string }> = {
    COMMUNITY: { label: 'Comunidade', icon: 'people', color: '#0647AC' },
    MUNICIPAL: { label: 'Câmara municipal', icon: 'business', color: '#16A34A' },
    OSM: { label: 'OpenStreetMap', icon: 'map', color: '#0EA5E9' },
    GEOAPIFY: { label: 'Geoapify', icon: 'globe', color: '#7C3AED' },
};

export const CAPACITY_LABELS: Record<CapacityRange, string> = {
    RANGE_1_5: '1–5 lugares',
    RANGE_6_20: '6–20 lugares',
    RANGE_21_50: '21–50 lugares',
    RANGE_51_100: '51–100 lugares',
    RANGE_100_PLUS: '100+ lugares',
};

// colorKey é resolvido pelo tema ativo (claro/escuro) nos componentes
export const STATUS_META: Record<ContributionStatus, { label: string; colorKey: keyof ThemeColors }> = {
    APPROVED: { label: 'Verificado', colorKey: 'success' },
    PENDING: { label: 'Em verificação', colorKey: 'accent' },
    FLAGGED: { label: 'Sinalizado', colorKey: 'danger' },
    REJECTED: { label: 'Rejeitado', colorKey: 'textMuted' },
};

export function trustColorKey(trustScore: number): keyof ThemeColors {
    if (trustScore >= 5) return 'success';
    if (trustScore >= 3) return 'accent';
    return 'danger';
}

export function formatTrust(trustScore: number): string {
    return `${Math.round(trustScore * 10) / 10}/10`;
}

/** Distância em km entre dois pontos (haversine). */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1).replace('.', ',')} km`;
}

/** Data ISO (yyyy-mm-dd) -> dd/mm/aaaa, formato pt-PT. Robusto a entradas parciais. */
export function formatDate(iso: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
    if (!match) return iso;
    return `${match[3]}/${match[2]}/${match[1]}`;
}

/** Score 0–10 com vírgula decimal (pt-PT), ex.: "9,2". */
export function formatScore(score: number): string {
    return score.toFixed(1).replace('.', ',');
}
