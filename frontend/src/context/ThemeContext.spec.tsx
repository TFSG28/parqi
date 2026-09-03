import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, renderHook } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

/** jsdom não implementa matchMedia; o provider usa-o no estado inicial. */
function stubMatchMedia(matches: boolean) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
        })),
    });
}

function Probe() {
    const { theme, toggleTheme } = useTheme();
    return (
        <div>
            <span data-testid="theme">{theme}</span>
            <button data-testid="toggle" onClick={toggleTheme}>toggle</button>
        </div>
    );
}

describe('ThemeProvider', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('dark');
        stubMatchMedia(false);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
        document.documentElement.classList.remove('dark');
    });

    it('usa light quando não há preferência guardada nem do sistema', () => {
        render(<ThemeProvider><Probe /></ThemeProvider>);

        expect(screen.getByTestId('theme')).toHaveTextContent('light');
        expect(document.documentElement).not.toHaveClass('dark');
    });

    it('usa a preferência guardada em localStorage', () => {
        localStorage.setItem('theme', 'dark');
        render(<ThemeProvider><Probe /></ThemeProvider>);

        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
        expect(document.documentElement).toHaveClass('dark');
    });

    it('segue prefers-color-scheme: dark quando não há valor guardado', () => {
        stubMatchMedia(true);

        render(<ThemeProvider><Probe /></ThemeProvider>);

        expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    });

    it('toggleTheme alterna light→dark e persiste', () => {
        render(<ThemeProvider><Probe /></ThemeProvider>);

        fireEvent.click(screen.getByTestId('toggle'));

        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
        expect(localStorage.getItem('theme')).toBe('dark');
        expect(document.documentElement).toHaveClass('dark');

        fireEvent.click(screen.getByTestId('toggle'));

        expect(screen.getByTestId('theme')).toHaveTextContent('light');
        expect(localStorage.getItem('theme')).toBe('light');
        expect(document.documentElement).not.toHaveClass('dark');
    });

    it('valor guardado inválido cai no tema do sistema', () => {
        localStorage.setItem('theme', 'blue');
        render(<ThemeProvider><Probe /></ThemeProvider>);

        expect(screen.getByTestId('theme')).toHaveTextContent('light');
    });
});

describe('useTheme fora do provider', () => {
    it('lança erro quando usado sem ThemeProvider', () => {
        expect(() => renderHook(() => useTheme())).toThrow(
            'useTheme must be used within ThemeProvider'
        );
    });
});
