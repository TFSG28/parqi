import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type {
    ContributorStats,
    Geometry,
    LoginResult,
    ParkingSpot,
    ParkingSuggestion,
    ParkingType,
    CapacityRange,
    SuggestResult,
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
/** URL de dev deduzida do host do Metro (IP da LAN para telemóveis físicos). */
function devApiUrl(): string {
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

/** localhost / 127.0.0.1 / ::1 — URLs que só funcionam na própria máquina. */
function isLoopbackUrl(url: string): boolean {
    return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])([:/]|$)/.test(url);
}

function resolveApiUrl(): string {
    const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
    if (fromEnv) {
        // Em dev, um URL do .env com localhost nunca chega ao backend num telemóvel
        // físico (aponta para o próprio aparelho). Se o Metro está num IP da LAN,
        // preferimos esse — é o único que o aparelho consegue alcançar.
        if (__DEV__ && isLoopbackUrl(fromEnv)) {
            const auto = devApiUrl();
            if (!isLoopbackUrl(auto)) {
                return auto;
            }
        }
        return fromEnv;
    }
    return devApiUrl();
}

export const API_URL = resolveApiUrl();

if (__DEV__) {
    // Aparece nos logs do Metro: confirma que o telemóvel resolveu o IP certo.
    console.log(`[parqi] API_URL = ${API_URL}`);
}

const TOKEN_KEY = 'parqi.access_token';

/**
 * Chamado quando a API devolve 401 (sessão expirada ou inválida), para o
 * estado global limpar o utilizador. Regista-se a partir do AuthContext.
 */
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
    unauthorizedHandler = handler;
}

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

// Mensagem amigável quando o servidor devolve resposta sem `message` legível.
function friendlyFallback(status: number): string {
    if (status === 404) return 'Não encontrado.';
    if (status === 409) return 'Já existe um registo com estes dados.';
    if (status === 429) return 'Muitos pedidos de seguida. Espera um pouco e tenta de novo.';
    if (status >= 500) return 'Algo correu mal no servidor. Tenta de novo daqui a pouco.';
    return 'Não foi possível completar o pedido. Tenta de novo.';
}

interface Envelope<T> {
    status?: string;
    data?: T;
    message?: string;
    details?: Record<string, unknown>;
}

/** Tempo máximo de espera por resposta; evita spinners infinitos com a rede presa. */
const REQUEST_TIMEOUT_MS = 15_000;

const NETWORK_ERROR_MESSAGE =
    'Não foi possível ligar ao servidor. Verifica a ligação e tenta de novo.';
const TIMEOUT_ERROR_MESSAGE =
    'O servidor demorou demasiado a responder. Tenta de novo daqui a pouco.';

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = await getToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    // AbortController: falhas de rede e timeouts viram ApiError com mensagem
    // amigável, em vez de um TypeError cru que nenhum ecrã sabe mostrar.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
        response = await fetch(`${API_URL}${path}`, {
            method: init.method ?? 'GET',
            headers,
            body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
            signal: controller.signal,
        });
    } catch (error) {
        const timedOut = error instanceof Error && error.name === 'AbortError';
        throw new ApiError(
            timedOut ? TIMEOUT_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE,
            0,
            { timedOut }
        );
    } finally {
        clearTimeout(timeout);
    }

    const json = (await response.json().catch(() => null)) as Envelope<T> | null;

    if (!response.ok) {
        if (response.status === 401) {
            // Sessão expirada: limpa o token local e avisa o contexto de auth
            await setToken(null);
            unauthorizedHandler?.();
        }
        throw new ApiError(json?.message ?? friendlyFallback(response.status), response.status, json?.details);
    }

    return (json?.data ?? json) as T;
}

export const api = {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
    patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
    delete: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
};

export interface CreateParkingInput {
    name: string;
    description?: string;
    geometry: Geometry;
    parkingType: ParkingType;
    capacityRange?: CapacityRange;
    isFree?: boolean;
    hasPregnantSpaces?: boolean;
    hasDisabledSpaces?: boolean;
    hasEvCharging?: boolean;
    isCovered?: boolean;
}

/** Campos editáveis de um parque (edição própria ou sugestão à comunidade). */
export interface SpotFields {
    name?: string;
    description?: string | null;
    parkingType?: ParkingType;
    capacityRange?: CapacityRange | null;
    isFree?: boolean | null;
    hasPregnantSpaces?: boolean | null;
    hasDisabledSpaces?: boolean | null;
    hasEvCharging?: boolean | null;
    isCovered?: boolean | null;
}

export interface SuggestInput extends SpotFields {
    reason?: string;
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
    verifyEmail: (code: string) =>
        api.post<{ emailVerified: true }>('/auth/verify-email', { code }),
    resendCode: () => api.post<{ resentAt: string; waitSeconds: number }>('/auth/resend-code'),
    forgotPassword: (email: string) =>
        api.post<{ message: string }>('/auth/forgot-password', { email }),
    resetPassword: (email: string, code: string, password: string) =>
        api.post<{ message: string }>('/auth/reset-password', { email, code, password }),
    deleteAccount: (password: string) => api.delete<void>('/user/me', { password }),
};

export const parkingApi = {
    list: (bbox: string) =>
        api.get<ParkingSpot[]>(`/parking?bbox=${encodeURIComponent(bbox)}&limit=100`),
    /** Pesquisa por nome em todo o país (não limitada ao viewport). */
    search: (q: string) =>
        api.get<ParkingSpot[]>(`/parking?q=${encodeURIComponent(q)}&limit=50`),
    get: (id: string) => api.get<ParkingSpot>(`/parking/${id}`),
    create: (data: CreateParkingInput) => api.post<ParkingSpot>('/parking', data),
    update: (id: string, data: SpotFields) => api.patch<ParkingSpot>(`/parking/${id}`, data),
    vote: (id: string, value: 1 | -1, reason?: string) =>
        api.post<ParkingSpot>(`/parking/${id}/vote`, { value, reason }),
    /** Anula o voto do utilizador atual; idempotente. */
    unvote: (id: string) => api.delete<ParkingSpot>(`/parking/${id}/vote`),
    suggest: (id: string, data: SuggestInput) =>
        api.post<SuggestResult>(`/parking/${id}/suggest`, data),
    stats: () => api.get<ContributorStats>('/user/me/stats'),
    // Admin
    moderationQueue: (page = 1, limit = 50) =>
        api.get<ParkingSpot[]>(`/parking/moderation?page=${page}&limit=${limit}`),
    moderate: (id: string, action: 'APPROVE' | 'REJECT', reason?: string) =>
        api.post<ParkingSpot>(`/parking/${id}/moderate`, { action, reason }),
    listSuggestions: (status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING', page = 1, limit = 50) =>
        api.get<ParkingSuggestion[]>(`/parking/suggestions?status=${status}&page=${page}&limit=${limit}`),
    decideSuggestion: (id: string, action: 'APPROVE' | 'REJECT', reason?: string) =>
        api.post<ParkingSuggestion>(`/parking/suggestions/${id}/decide`, { action, reason }),
    setUserActive: (userId: string, isActive: boolean) =>
        api.patch<{ id: string; isActive: boolean }>(`/user/${userId}/active`, { isActive }),
};
