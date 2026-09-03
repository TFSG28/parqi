import { getItemAsync, setItemAsync, deleteItemAsync } from 'expo-secure-store';

type ApiModule = typeof import('../api');

/**
 * API client da app: auth Bearer, unwrapping do envelope, timeout, erros de
 * rede e limpeza de sessão em 401.
 */

// expo-constants: CI não tem hostUri do Metro; com EXPO_PUBLIC_API_URL definido
// (abaixo, antes de o módulo resolver a URL) o fallback nunca é usado.
jest.mock('expo-constants', () => ({
    __esModule: true,
    default: { expoConfig: { hostUri: 'localhost:8081' } },
}));

jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}));

const fetchMock = jest.fn();

// api.ts resolve a URL no momento do import; isolamos o módulo com o env já
// definido (require em vez de import dinâmico: o jest VM não suporta import()).
let api: ApiModule['api'];
let authApi: ApiModule['authApi'];
let parkingApi: ApiModule['parkingApi'];
let ApiError: ApiModule['ApiError'];
let setToken: ApiModule['setToken'];
let getToken: ApiModule['getToken'];
let setUnauthorizedHandler: ApiModule['setUnauthorizedHandler'];

beforeAll(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    process.env.EXPO_PUBLIC_API_URL = 'http://test-api.local/api/v1';
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const module = require('../api') as ApiModule;
        api = module.api;
        authApi = module.authApi;
        parkingApi = module.parkingApi;
        ApiError = module.ApiError;
        setToken = module.setToken;
        getToken = module.getToken;
        setUnauthorizedHandler = module.setUnauthorizedHandler;
    });
});

beforeEach(() => {
    fetchMock.mockReset();
    jest.clearAllMocks();
});

function jsonResolve(status: number, body: unknown) {
    return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(body),
    } as Response);
}

describe('token storage', () => {
    it('getToken lê do SecureStore e devolve null em erro', async () => {
        (getItemAsync as jest.Mock).mockResolvedValueOnce('tok-1');
        await expect(getToken()).resolves.toBe('tok-1');

        (getItemAsync as jest.Mock).mockRejectedValueOnce(new Error('boom'));
        await expect(getToken()).resolves.toBeNull();
    });

    it('setToken grava e apaga do SecureStore (null apaga)', async () => {
        await setToken('tok-1');
        expect(setItemAsync).toHaveBeenCalledWith('parqi.access_token', 'tok-1');

        await setToken(null);
        expect(deleteItemAsync).toHaveBeenCalledWith('parqi.access_token');
    });

    it('setToken engole erros de storage indisponível', async () => {
        (setItemAsync as jest.Mock).mockRejectedValueOnce(new Error('no storage'));
        await expect(setToken('tok')).resolves.toBeUndefined();
    });
});

describe('request', () => {
    it('faz GET e devolve json.data (unwrap do envelope)', async () => {
        fetchMock.mockResolvedValueOnce(
            jsonResolve(200, { status: 'success', data: [{ id: 'a' }] })
        );

        await expect(api.get('/parking')).resolves.toEqual([{ id: 'a' }]);
        expect(fetchMock).toHaveBeenCalledWith(
            'http://test-api.local/api/v1/parking',
            expect.objectContaining({ method: 'GET' })
        );
    });

    it('devolve o corpo inteiro quando não há envelope', async () => {
        fetchMock.mockResolvedValueOnce(jsonResolve(200, { direto: true }));

        await expect(api.get('/ping')).resolves.toEqual({ direto: true });
    });

    it('envia Authorization: Bearer quando há token guardado', async () => {
        (getItemAsync as jest.Mock).mockResolvedValue('tok-42');
        fetchMock.mockResolvedValueOnce(jsonResolve(200, { data: null }));

        await api.get('/user/me');

        expect(fetchMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                headers: expect.objectContaining({ Authorization: 'Bearer tok-42' }),
            })
        );
    });

    it('POST serializa o body em JSON', async () => {
        fetchMock.mockResolvedValueOnce(jsonResolve(201, { data: { id: '1' } }));

        await api.post('/parking', { name: 'Parque' });

        expect(fetchMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ name: 'Parque' }),
            })
        );
    });

    it('erro da API lança ApiError com message/status do envelope', async () => {
        fetchMock.mockResolvedValueOnce(
            jsonResolve(400, { status: 'error', message: 'Dados inválidos', details: { f: 'x' } })
        );

        const promise = api.post('/parking', {});
        await expect(promise).rejects.toThrow(ApiError);
        await promise.catch((error: { status: number; message: string; details: Record<string, unknown> }) => {
            expect(error.status).toBe(400);
            expect(error.message).toBe('Dados inválidos');
            expect(error.details).toEqual({ f: 'x' });
        });
    });

    it('erro sem message usa fallback amigável por status', async () => {
        fetchMock.mockResolvedValueOnce(jsonResolve(500, null));
        await expect(api.get('/x')).rejects.toThrow('Algo correu mal no servidor');

        fetchMock.mockResolvedValueOnce(jsonResolve(404, null));
        await expect(api.get('/x')).rejects.toThrow('Não encontrado.');
    });

    it('401 limpa o token e chama o handler de sessão expirada', async () => {
        (getItemAsync as jest.Mock).mockResolvedValue('tok-expirado');
        fetchMock.mockResolvedValueOnce(jsonResolve(401, { message: 'Sessão expirada' }));

        const handler = jest.fn();
        setUnauthorizedHandler(handler);

        await expect(api.get('/user/me')).rejects.toThrow(ApiError);

        expect(deleteItemAsync).toHaveBeenCalledWith('parqi.access_token');
        expect(handler).toHaveBeenCalledTimes(1);

        setUnauthorizedHandler(null);
    });

    it('falha de rede vira ApiError com mensagem amigável (status 0)', async () => {
        fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

        const promise = api.get('/parking');
        await expect(promise).rejects.toThrow('Não foi possível ligar ao servidor');
        await promise.catch((error: { status: number }) => {
            expect(error.status).toBe(0);
        });
    });

    it('timeout do cliente aborta o pedido e devolve mensagem própria', async () => {
        jest.useFakeTimers();

        // O mock respeita o signal: quando o cliente aborta (15s), rejeita
        // com AbortError — exatamente como o fetch real.
        fetchMock.mockImplementationOnce(
            (_url: unknown, init: { signal: AbortSignal }) =>
                new Promise((_resolve, reject) => {
                    init.signal.addEventListener('abort', () => {
                        const error = new Error('The operation was aborted');
                        error.name = 'AbortError';
                        reject(error);
                    });
                })
        );

        const promise = api.get('/slow');
        const assertion = expect(promise).rejects.toThrow(
            'O servidor demorou demasiado a responder'
        );

        await jest.advanceTimersByTimeAsync(16_000);
        await assertion;

        await promise.catch((error: { status: number; details: { timedOut: boolean } }) => {
            expect(error.status).toBe(0);
            expect(error.details).toEqual({ timedOut: true });
        });

        jest.useRealTimers();
    });

    it('signal externo abortado propaga o erro original (cancelamento de ecrã)', async () => {
        const external = new AbortController();
        external.abort();

        fetchMock.mockImplementationOnce(
            (_url: unknown, init: { signal: AbortSignal }) =>
                init.signal.aborted
                    ? Promise.reject(external.signal.reason ?? new Error('aborted'))
                    : Promise.resolve(jsonResolve(200, { data: null }))
        );

        await expect(api.get('/parking', external.signal)).rejects.toThrow();
    });

    it('resposta com JSON malformado não rebenta (json -> null)', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 502,
            json: () => Promise.reject(new Error('invalid json')),
        } as unknown as Response);

        await expect(api.get('/x')).rejects.toThrow('Algo correu mal no servidor');
    });
});

describe('authApi', () => {
    it('login envia credenciais para /auth/login', async () => {
        fetchMock.mockResolvedValueOnce(
            jsonResolve(200, { data: { token: 'jwt', user: { id: 'u1' } } })
        );

        await expect(authApi.login('a@b.c', 'pw')).resolves.toEqual({
            token: 'jwt',
            user: { id: 'u1' },
        });
        expect(fetchMock).toHaveBeenCalledWith(
            'http://test-api.local/api/v1/auth/login',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ email: 'a@b.c', password: 'pw' }),
            })
        );
    });

    it('logout engole erros de rede e limpa na mesma', async () => {
        fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

        await expect(authApi.logout()).resolves.toBeUndefined();
    });
});

describe('parkingApi', () => {
    it('list codifica o bbox e pede limit 100', async () => {
        fetchMock.mockResolvedValueOnce(jsonResolve(200, { data: [] }));

        await parkingApi.list('-9.2,38.7,-9.1,38.8');

        expect(fetchMock).toHaveBeenCalledWith(
            'http://test-api.local/api/v1/parking?bbox=-9.2%2C38.7%2C-9.1%2C38.8&limit=100',
            expect.anything()
        );
    });

    it('search codifica a query', async () => {
        fetchMock.mockResolvedValueOnce(jsonResolve(200, { data: [] }));

        await parkingApi.search('parque azul & verde');

        expect(fetchMock).toHaveBeenCalledWith(
            'http://test-api.local/api/v1/parking?q=parque%20azul%20%26%20verde&limit=50',
            expect.anything()
        );
    });
});
