import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, renderHook, act, waitFor, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { authApi } from '@/services/authApi';
import { fetchClient } from '@/libs/fetchClient';
import type { User } from '@/types/auth';

vi.mock('@/services/authApi', () => ({
    authApi: {
        login: vi.fn(),
        logout: vi.fn(),
        restoreSession: vi.fn(),
    },
}));

vi.mock('@/libs/fetchClient', () => ({
    fetchClient: {
        setCsrfToken: vi.fn(),
        clearCsrfToken: vi.fn(),
    },
}));

const mockUser: User = {
    id: 'u1',
    name: 'Ana',
    email: 'ana@example.com',
} as User;

function Probe() {
    const { user, loading, login, logout } = useAuth();
    return (
        <div>
            <span data-testid="loading">{String(loading)}</span>
            <span data-testid="user">{user ? user.email : 'anonymous'}</span>
            <button data-testid="login" onClick={() => login('ana@example.com', 'pw')}>login</button>
            <button data-testid="logout" onClick={() => logout()}>logout</button>
        </div>
    );
}

describe('AuthProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('começa em loading e restaura a sessão do cookie httpOnly', async () => {
        vi.mocked(authApi.restoreSession).mockResolvedValue(mockUser);

        render(<AuthProvider><Probe /></AuthProvider>);

        expect(screen.getByTestId('loading')).toHaveTextContent('true');
        await waitFor(() => {
            expect(screen.getByTestId('user')).toHaveTextContent('ana@example.com');
        });
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    it('sem sessão guardada fica anónimo e termina o loading', async () => {
        vi.mocked(authApi.restoreSession).mockResolvedValue(null);

        render(<AuthProvider><Probe /></AuthProvider>);

        await waitFor(() => {
            expect(screen.getByTestId('loading')).toHaveTextContent('false');
        });
        expect(screen.getByTestId('user')).toHaveTextContent('anonymous');
    });

    it('login guarda o csrf token e o utilizador', async () => {
        vi.mocked(authApi.restoreSession).mockResolvedValue(null);
        vi.mocked(authApi.login).mockResolvedValue({
            user: mockUser,
            csrfToken: 'csrf-123',
        });

        render(<AuthProvider><Probe /></AuthProvider>);
        await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

        await act(async () => {
            fireEvent.click(screen.getByTestId('login'));
        });

        expect(authApi.login).toHaveBeenCalledWith('ana@example.com', 'pw');
        expect(fetchClient.setCsrfToken).toHaveBeenCalledWith('csrf-123');
        expect(screen.getByTestId('user')).toHaveTextContent('ana@example.com');
    });

    it('logout limpa o csrf token e o utilizador', async () => {
        vi.mocked(authApi.restoreSession).mockResolvedValue(mockUser);

        render(<AuthProvider><Probe /></AuthProvider>);
        await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('ana@example.com'));

        await act(async () => {
            fireEvent.click(screen.getByTestId('logout'));
        });

        expect(authApi.logout).toHaveBeenCalled();
        expect(fetchClient.clearCsrfToken).toHaveBeenCalled();
        expect(screen.getByTestId('user')).toHaveTextContent('anonymous');
    });
});

describe('useAuth fora do provider', () => {
    it('devolve contexto vazio (objeto default) fora do AuthProvider', () => {
        const { result } = renderHook(() => useAuth());
        expect(result.current.user).toBeUndefined();
        expect(result.current.loading).toBeUndefined();
    });
});
