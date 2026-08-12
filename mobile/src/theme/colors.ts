/**
 * Tema Parqi (design_example/src/styles/theme.css):
 * claro = azul #0647AC sobre fundos frios; escuro = laranja #FF6900 sobre azul-noite.
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
    background: '#F4F7FC',
    card: '#FFFFFF',
    text: '#0D1A2E',
    textMuted: '#5A7099',
    // rgba(6,71,172,0.14) achatada sobre branco
    border: '#DCE5F3',
    success: '#059669',
    danger: '#DC2626',
} as const;

export const DARK: ThemeColors = {
    // No escuro a marca vira laranja, como no design
    primary: '#FF6900',
    // Barras no escuro: superfície azul-noite (card) com texto claro
    bar: '#131826',
    // Card hero no escuro: um nível acima do card para se destacar do fundo
    heroBg: '#1A2030',
    accent: '#FF6900',
    onAccent: '#FFFFFF',
    white: '#FFFFFF',
    background: '#0B0F1A',
    card: '#131826',
    text: '#E8EDF5',
    textMuted: '#6B7FA0',
    // rgba(255,105,0,0.15) achatada sobre o fundo
    border: '#31221C',
    success: '#34D399',
    danger: '#EF4444',
};

export type ThemeColors = { -readonly [K in keyof typeof LIGHT]: string };
