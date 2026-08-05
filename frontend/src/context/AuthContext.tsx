'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { fetchClient } from '@/libs/fetchClient';
import { authApi } from '@/services/authApi';
import type { User } from '@/types/auth';

interface AuthContextData {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Restore the session from the httpOnly cookie on mount.
    useEffect(() => {
        (async () => {
            const restored = await authApi.restoreSession();
            if (restored) setUser(restored);
            setLoading(false);
        })();
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const { user, csrfToken } = await authApi.login(email, password);
        fetchClient.setCsrfToken(csrfToken);
        setUser(user);
    }, []);

    const logout = useCallback(async () => {
        await authApi.logout();
        fetchClient.clearCsrfToken();
        setUser(null);
    }, []);

    const value = useMemo(
        () => ({ user, loading, login, logout }),
        [user, loading, login, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
