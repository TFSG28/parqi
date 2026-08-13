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
    PENDING: { color: PALETTE.amber, icon: 'time', label: 'Em verificação' },
    FLAGGED: { color: PALETTE.red, icon: 'warning', label: 'Sinalizado' },
    REJECTED: { color: PALETTE.red, icon: 'close-circle', label: 'Rejeitado' },
};

export const TYPE_DESIGN: Record<ParkingType, { color: string; label: string }> = {
    SURFACE: { color: PALETTE.sky, label: 'Ao ar livre' },
    UNDERGROUND: { color: PALETTE.violet, label: 'Subterrâneo' },
    MULTI_STORY: { color: PALETTE.blue, label: 'Em edifício' },
    STREET: { color: PALETTE.orange, label: 'Na via' },
    OTHER: { color: PALETTE.blue, label: 'Outro' },
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
        { key: 'hasEvCharging', icon: 'battery-charging', label: 'Carregamento elétrico' },
        { key: 'hasDisabledSpaces', icon: 'accessibility', label: 'Mobilidade reduzida' },
        { key: 'hasPregnantSpaces', icon: 'woman', label: 'Grávidas' },
        { key: 'isCovered', icon: 'umbrella', label: 'Coberto' },
    ];
