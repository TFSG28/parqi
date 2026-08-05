/** Branding Parqi: #272EF5 (azul), #F2A116 (laranja), #FFFFFF. */

export const LIGHT = {
    primary: '#272EF5',
    // Barras/headers: azul da marca (no escuro, uma versão profunda para não encandear)
    bar: '#272EF5',
    accent: '#F2A116',
    // Texto/ícones sobre laranja: escuro, porque branco sobre #F2A116 não passa o contraste AA
    onAccent: '#15173A',
    white: '#FFFFFF',
    background: '#F7F8FA',
    card: '#FFFFFF',
    text: '#111318',
    textMuted: '#6B7280',
    border: '#E5E7EB',
    success: '#16A34A',
    danger: '#DC2626',
} as const;

export const DARK: ThemeColors = {
    // Azul mais claro: o #272EF5 não tem contraste suficiente sobre fundos escuros
    primary: '#6A6FF9',
    bar: '#1B1F71',
    accent: '#F2A116',
    onAccent: '#15173A',
    white: '#FFFFFF',
    background: '#0F1117',
    card: '#1A1D27',
    text: '#F2F3F7',
    textMuted: '#9AA0B4',
    border: '#2A2E3D',
    success: '#34D27B',
    danger: '#F87171',
};

export type ThemeColors = { -readonly [K in keyof typeof LIGHT]: string };
