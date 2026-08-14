/**
 * Tema Parqi v2 (design_example_v2/src/styles/theme.css):
 * claro = azul #0647AC sobre fundos neutros #f5f5f7; escuro = laranja #FF6900 sobre #111111.
 */

export const LIGHT = {
    primary: '#0647AC',
    // Barras/headers: azul da marca
    bar: '#0647AC',
    // Card hero: tom mais profundo da família — destaca-se sem gritar
    heroBg: '#053A8C',
    accent: '#FF6900',
    // Texto/ícones sobre laranja: branco, como no design (primary-foreground)
    onAccent: '#FFFFFF',
    white: '#FFFFFF',
    background: '#F5F5F7',
    card: '#FFFFFF',
    // v2 muted: fundo de superfícies subtis (toggle, chips inativos)
    muted: '#EBEBED',
    text: '#111111',
    textMuted: '#8A8A8E',
    // rgba(0,0,0,0.08) do design achatado sobre o fundo
    border: '#E3E3E6',
    success: '#059669',
    danger: '#E5303A',
} as const;

export const DARK: ThemeColors = {
    // No escuro a marca vira laranja, como no design
    primary: '#FF6900',
    // Barras no escuro: superfície (card) com texto claro
    bar: '#1C1C1E',
    // Card hero no escuro: um nível acima do card para se destacar do fundo
    heroBg: '#1C1C1E',
    accent: '#FF6900',
    onAccent: '#FFFFFF',
    white: '#FFFFFF',
    background: '#111111',
    card: '#1C1C1E',
    muted: '#242426',
    text: '#F0EDE8',
    textMuted: '#878785',
    // rgba(255,255,255,0.08) do design achatado sobre o fundo
    border: '#2A2A2C',
    success: '#34D399',
    danger: '#EF4444',
};

export type ThemeColors = { -readonly [K in keyof typeof LIGHT]: string };
