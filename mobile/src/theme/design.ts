import { Platform } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';
import type { ContributionStatus, ParkingType } from '../types/parking';

type IoniconName = keyof typeof Ionicons.glyphMap;

/** Fonte mono usada em labels/valores/badges, como o font-mono do design. */
export const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

/** Paleta fixa do design (tons tailwind-400 usados nos badges/chips). */
export const PALETTE = {
    emerald: '#34D399',
    amber: '#FBBF24',
    amberDeep: '#F59E0B',
    red: '#F87171',
    redDeep: '#EF4444',
    sky: '#38BDF8',
    violet: '#A78BFA',
    blue: '#60A5FA',
    orange: '#FB923C',
} as const;

/** Fundo translúcido a 10%, como as classes bg-*-400/10 do design. */
export function alpha10(hex: string): string {
    return hex + '1A';
}

/**
 * Texto legível por tema para as cores da paleta.
 * No claro os tons 400 são demasiado claros para texto (1.6–3.8:1 a 10px);
 * no escuro funcionam bem como texto claro sobre fundo escuro.
 */
const THEME_TEXT: Record<string, { light: string; dark: string }> = {
    [PALETTE.emerald]: { light: '#047857', dark: PALETTE.emerald },
    [PALETTE.amber]: { light: '#B45309', dark: PALETTE.amber },
    [PALETTE.amberDeep]: { light: '#B45309', dark: PALETTE.amberDeep },
    [PALETTE.red]: { light: '#B91C1C', dark: PALETTE.red },
    [PALETTE.redDeep]: { light: '#B91C1C', dark: PALETTE.redDeep },
    [PALETTE.sky]: { light: '#0369A1', dark: PALETTE.sky },
    [PALETTE.violet]: { light: '#6D28D9', dark: PALETTE.violet },
    [PALETTE.blue]: { light: '#1D4ED8', dark: PALETTE.blue },
    [PALETTE.orange]: { light: '#C2410C', dark: PALETTE.orange },
};

/** Devolve a variante legível de uma cor da paleta para o tema ativo. */
export function themedText(color: string, scheme: 'light' | 'dark'): string {
    return THEME_TEXT[color]?.[scheme] ?? color;
}

export const STATUS_DESIGN: Record<
    ContributionStatus,
    { color: string; icon: IoniconName; label: string }
> = {
    APPROVED: { color: PALETTE.emerald, icon: 'checkmark-circle', label: 'Verificado' },
    PENDING: { color: PALETTE.amber, icon: 'time', label: 'Em revisão' },
    FLAGGED: { color: PALETTE.red, icon: 'warning', label: 'Sinalizado' },
    REJECTED: { color: PALETTE.red, icon: 'close-circle', label: 'Rejeitado' },
};

/** Cores por tipo (tons 500) como o TYPE_COLOR do design v2, usadas nos dots/ícones. */
export const TYPE_COLOR: Record<ParkingType, string> = {
    SURFACE: '#0EA5E9',
    UNDERGROUND: '#8B5CF6',
    MULTI_STORY: '#06B6D4',
    STREET: '#F59E0B',
    OTHER: '#64748B',
};

export const TYPE_DESIGN: Record<ParkingType, { color: string; label: string }> = {
    SURFACE: { color: TYPE_COLOR.SURFACE, label: 'Superfície' },
    UNDERGROUND: { color: TYPE_COLOR.UNDERGROUND, label: 'Subterrâneo' },
    MULTI_STORY: { color: TYPE_COLOR.MULTI_STORY, label: 'Parque Elevado' },
    STREET: { color: TYPE_COLOR.STREET, label: 'Via Pública' },
    OTHER: { color: TYPE_COLOR.OTHER, label: 'Outro' },
};

/** Cor da TrustBar do design: ≥8 primária, ≥5 âmbar, resto vermelho. */
export function trustColor(score: number, primary: string): string {
    if (score >= 8) return primary;
    if (score >= 5) return PALETTE.amberDeep;
    return PALETTE.redDeep;
}

export const SOURCE_LABELS: Record<string, string> = {
    COMMUNITY: 'Comunidade',
    MUNICIPAL: 'Câmara municipal',
    OVERPASS: 'OpenStreetMap',
    GEOAPIFY: 'Geoapify',
};

export const AMENITY_DESIGN: {
    key: 'hasEvCharging' | 'hasDisabledSpaces' | 'hasPregnantSpaces' | 'isCovered';
    icon: IoniconName;
    label: string;
}[] = [
        { key: 'hasEvCharging', icon: 'battery-charging', label: 'EV Charging' },
        { key: 'hasDisabledSpaces', icon: 'accessibility', label: 'Acessibilidade' },
        { key: 'hasPregnantSpaces', icon: 'woman', label: 'Grávidas' },
        { key: 'isCovered', icon: 'umbrella', label: 'Coberto' },
    ];
