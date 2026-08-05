import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type {
    Geometry,
    LoginResult,
    ParkingSpot,
    ParkingType,
    CapacityRange,
    User,
} from '../types/parking';

/**
 * API Parqi. Auth mobile via `Authorization: Bearer <jwt>` (devolvido pelo
 * /auth/login); o cookie httpOnly + CSRF é o mecanismo da web.
 *
 * A URL resolve por ordem:
 *  1. EXPO_PUBLIC_API_URL (produção / testes)
 *  2. host do Metro (IP LAN) — telemóvel físico em desenvolvimento
 *  3. 10.0.2.2 (emulador Android) / localhost (simulador iOS)
 */
function resolveApiUrl(): string {
    const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
    if (fromEnv) return fromEnv;

    const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
    const host = hostUri?.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return `http://${host}:3001/api/v1`;
    }
    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:3001/api/v1';
    }
    return 'http://localhost:3001/api/v1';
}

export const API_URL = resolveApiUrl();

if (__DEV__) {
    // Aparece nos logs do Metro: confirma que o telemóvel resolveu o IP certo.
    console.log(`[parqi] API_URL = ${API_URL}`);
}

const TOKEN_KEY = 'parqi.access_token';

export async function getToken(): Promise<string | null> {
    try {
        return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
        return null;
    }
}

export async function setToken(token: string | null): Promise<void> {
    try {
        if (token) {
            await SecureStore.setItemAsync(TOKEN_KEY, token);
        } else {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
    } catch {
        // storage indisponível (ex.: web) - a sessão simplesmente não persiste
    }
}

export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

interface Envelope<T> {
    status?: string;
    data?: T;
    message?: string;
    details?: Record<string, unknown>;
}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = await getToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
        method: init.method ?? 'GET',
        headers,
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });

    const json = (await response.json().catch(() => null)) as Envelope<T> | null;

    if (!response.ok) {
        throw new ApiError(json?.message ?? `Erro ${response.status}`, response.status, json?.details);
    }

    return (json?.data ?? json) as T;
}

export const api = {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
    patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export interface CreateParkingInput {
    name: string;
    description?: string;
    geometry: Geometry;
    parkingType: ParkingType;
    capacityRange?: CapacityRange;
    isFree?: boolean;
}

export const authApi = {
    login: (email: string, password: string) =>
        api.post<LoginResult>('/auth/login', { email, password }),
    register: (name: string, email: string, password: string) =>
        api.post<User>('/user', { name, email, password }),
    me: () => api.get<User>('/auth/me'),
    logout: async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            // limpeza local independente do resultado
        }
    },
};

export const parkingApi = {
    list: (bbox: string) =>
        api.get<ParkingSpot[]>(`/parking?bbox=${encodeURIComponent(bbox)}&limit=100`),
    get: (id: string) => api.get<ParkingSpot>(`/parking/${id}`),
    create: (data: CreateParkingInput) => api.post<ParkingSpot>('/parking', data),
    vote: (id: string, value: 1 | -1, reason?: string) =>
        api.post<ParkingSpot>(`/parking/${id}/vote`, { value, reason }),
};
