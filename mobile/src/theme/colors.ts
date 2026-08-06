/** Branding Parqi: #3B6BFF (azul mais claro), #FF7A00 (laranja vivo), #FFFFFF. */

export const LIGHT = {
    primary: '#3B6BFF',
    // Barras/headers: azul da marca
    bar: '#3B6BFF',
    // Card hero: tom mais profundo da família — destaca-se sem gritar
    heroBg: '#2A4ED6',
    accent: '#FF7A00',
    // Texto/ícones sobre laranja: escuro, porque branco sobre laranja vivo não passa o contraste AA
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
    primary: '#3B6BFF',
    // Barras no escuro: azul profundo com texto branco com bom contraste
    bar: '#2E46C9',
    // Card hero no escuro: azul mais claro para se destacar do fundo quase preto
    heroBg: '#3A56D8',
    accent: '#FF7A00',
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
