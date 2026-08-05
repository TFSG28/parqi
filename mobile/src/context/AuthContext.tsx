import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, authApi, setToken } from '../lib/api';
import type { User } from '../types/parking';

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const me = await api.get<User>('/auth/me');
            setUser(me);
        } catch {
            setUser(null);
        }
    }, []);

    useEffect(() => {
        refresh().finally(() => setLoading(false));
    }, [refresh]);

    const login = useCallback(async (email: string, password: string) => {
        const result = await authApi.login(email, password);
        await setToken(result.token);
        setUser(result.user);
    }, []);

    const register = useCallback(async (name: string, email: string, password: string) => {
        await authApi.register(name, email, password);
        const result = await authApi.login(email, password);
        await setToken(result.token);
        setUser(result.user);
    }, []);

    const logout = useCallback(async () => {
        await authApi.logout();
        await setToken(null);
        setUser(null);
    }, []);

    const value = useMemo(
        () => ({ user, loading, login, register, logout }),
        [user, loading, login, register, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth deve ser usado dentro de AuthProvider');
    }
    return ctx;
}
