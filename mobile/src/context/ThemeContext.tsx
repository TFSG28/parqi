import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { DARK, LIGHT, type ThemeColors } from '../theme/colors';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextValue {
    colors: ThemeColors;
    mode: ThemeMode;
    resolvedScheme: 'light' | 'dark';
    setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = 'parqi.theme_mode';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const systemScheme = useColorScheme();
    const [mode, setModeState] = useState<ThemeMode>('system');

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then((value) => {
                if (value === 'light' || value === 'dark' || value === 'system') {
                    setModeState(value);
                }
            })
            .catch(() => {});
    }, []);

    const setMode = (next: ThemeMode) => {
        setModeState(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
    };

    const resolvedScheme: 'light' | 'dark' =
        mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

    const value = useMemo(
        () => ({
            colors: resolvedScheme === 'dark' ? DARK : LIGHT,
            mode,
            resolvedScheme,
            setMode,
        }),
        [mode, resolvedScheme]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useTheme deve ser usado dentro de ThemeProvider');
    }
    return ctx;
}
