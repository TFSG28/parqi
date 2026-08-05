/**
 * Auth API layer.
 *
 * Centralizes every /auth endpoint call and returns typed, already-unwrapped
 * data (no `{ status, data }` envelope leaking into components/contexts).
 * Endpoint URLs and response shapes live here and nowhere else.
 */
import { fetchClient } from '@/libs/fetchClient';
import type { User, ApiEnvelope } from '@/types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export interface LoginResult {
    user: User;
    csrfToken: string;
}

/**
 * Reads the backend envelope and returns `data`, throwing the backend message
 * on a non-2xx response so callers get a meaningful error.
 */
async function unwrap<T>(response: Response): Promise<T> {
    const body: ApiEnvelope<T> = await response.json();
    if (!response.ok) {
        throw new Error(body.message || 'Erro na requisição');
    }
    return body.data as T;
}

export const authApi = {
    login(email: string, password: string): Promise<LoginResult> {
        return fetchClient.post('/auth/login', { email, password }).then(unwrap<LoginResult>);
    },

    async logout(): Promise<void> {
        // Ignore network errors on logout; local state is cleared regardless.
        try {
            await fetchClient.post('/auth/logout');
        } catch {
            /* noop */
        }
    },

    /**
     * Restores the session from the httpOnly cookie on app start.
     * Uses raw fetch (not fetchClient) so a 401 "not logged in" does NOT trip
     * the client's refresh/redirect interceptor. Returns null when anonymous.
     */
    async restoreSession(): Promise<User | null> {
        try {
            const response = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
            if (!response.ok) return null;
            const { data } = (await response.json()) as ApiEnvelope<User>;
            return data ?? null;
        } catch {
            return null;
        }
    },
};
