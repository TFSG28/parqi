import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { ThemeProvider, useTheme, type ThemeMode } from '../ThemeContext';
import { DARK, LIGHT } from '../../theme/colors';

const STORAGE_KEY = 'parqi.theme_mode';

/** Sonda que consome o hook para os testes de valor. */
function Probe(): null {
    useTheme();
    return null;
}

const wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
);

beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockClear?.();
    (AsyncStorage.setItem as jest.Mock).mockClear?.();
    return AsyncStorage.clear();
});

describe('ThemeProvider', () => {
    it('começa em system e resolve light quando o sistema é claro', async () => {
        const { result } = await renderHook(() => useTheme(), { wrapper });

        expect(result.current.mode).toBe('system');
        expect(result.current.resolvedScheme).toBe('light');
        expect(result.current.colors).toEqual(LIGHT);
    });

    it('guarda e restaura o modo escolhido (dark)', async () => {
        const first = await renderHook(() => useTheme(), { wrapper });

        await act(async () => {
            first.result.current.setMode('dark');
        });

        expect(first.result.current.mode).toBe('dark');
        expect(first.result.current.resolvedScheme).toBe('dark');
        expect(first.result.current.colors).toEqual(DARK);
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'dark');

        // Nova sessão: o modo persistido é recarregado.
        const second = await renderHook(() => useTheme(), { wrapper });
        await waitFor(() => {
            expect(second.result.current.mode).toBe('dark');
        });
    });

    it('ignora valores inválidos guardados no storage', async () => {
        await AsyncStorage.setItem(STORAGE_KEY, 'blue' as ThemeMode);

        const { result } = await renderHook(() => useTheme(), { wrapper });
        await waitFor(() => {
            expect(result.current.mode).toBe('system');
        });
    });

    it('volta ao modo system e mantém a persistência coerente', async () => {
        const { result } = await renderHook(() => useTheme(), { wrapper });

        await act(async () => {
            result.current.setMode('light');
        });
        expect(result.current.resolvedScheme).toBe('light');

        await act(async () => {
            result.current.setMode('system');
        });
        expect(result.current.mode).toBe('system');
        expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(STORAGE_KEY, 'system');
    });
});

describe('useTheme fora do provider', () => {
    it('lança erro quando usado sem ThemeProvider', async () => {
        // Captura o throw dentro do próprio hook: o erro nunca chega ao React
        // e o assert fica determinístico (render/renderHook são async na v14).
        const { result } = await renderHook(() => {
            try {
                useTheme();
                return 'no-throw';
            } catch (error) {
                return (error as Error).message;
            }
        });

        await waitFor(() => {
            expect(result.current).toBe('useTheme deve ser usado dentro de ThemeProvider');
        });
    });
});
