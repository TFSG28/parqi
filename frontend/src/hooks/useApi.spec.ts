import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useApi } from './useApi';

// Mock do fetchClient
vi.mock('@/libs/fetchClient', () => ({
  fetchClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('useApi Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve iniciar com estado padrão', () => {
    const { result } = renderHook(() => useApi());

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('deve lidar com chamada de API bem-sucedida', async () => {
    const mockData = { id: 1, name: 'Teste' };
    const { fetchClient } = await import('@/libs/fetchClient');

    vi.mocked(fetchClient.post).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const { result } = renderHook(() => useApi());

    let promise!: Promise<unknown>;
    act(() => {
      promise = result.current.execute('post', '/api/test', { data: 'test' });
    });

    // Deve estar a carregar enquanto o pedido está pendente
    expect(result.current.loading).toBe(true);

    await act(async () => {
      await promise;
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('deve lidar com erro de API', async () => {
    const { fetchClient } = await import('@/libs/fetchClient');

    vi.mocked(fetchClient.get).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Não encontrado' }),
    } as Response);

    const { result } = renderHook(() => useApi());

    await act(async () => {
      await result.current.execute('get', '/api/test').catch(() => {});
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Não encontrado');
  });

  it('deve lidar com erro de rede', async () => {
    const { fetchClient } = await import('@/libs/fetchClient');

    vi.mocked(fetchClient.get).mockRejectedValue(new Error('Erro de rede'));

    const { result } = renderHook(() => useApi());

    await act(async () => {
      await result.current.execute('get', '/api/test').catch(() => {});
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Erro de rede');
  });

  it('deve permitir resetar o estado', async () => {
    const mockData = { id: 1, name: 'Teste' };
    const { fetchClient } = await import('@/libs/fetchClient');

    vi.mocked(fetchClient.get).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const { result } = renderHook(() => useApi());

    await act(async () => {
      await result.current.execute('get', '/api/test');
    });

    expect(result.current.data).toEqual(mockData);

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('deve suportar diferentes métodos HTTP', async () => {
    const { fetchClient } = await import('@/libs/fetchClient');
    const mockResponse = {
      ok: true,
      json: async () => ({ success: true }),
    } as Response;

    vi.mocked(fetchClient.get).mockResolvedValue(mockResponse);
    vi.mocked(fetchClient.post).mockResolvedValue(mockResponse);
    vi.mocked(fetchClient.put).mockResolvedValue(mockResponse);
    vi.mocked(fetchClient.patch).mockResolvedValue(mockResponse);
    vi.mocked(fetchClient.delete).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useApi());

    await act(async () => {
      await result.current.execute('get', '/api/test');
      await result.current.execute('post', '/api/test', { data: 'test' });
      await result.current.execute('put', '/api/test', { data: 'test' });
      await result.current.execute('patch', '/api/test', { data: 'test' });
      await result.current.execute('delete', '/api/test');
    });

    expect(fetchClient.get).toHaveBeenCalled();
    expect(fetchClient.post).toHaveBeenCalled();
    expect(fetchClient.put).toHaveBeenCalled();
    expect(fetchClient.patch).toHaveBeenCalled();
    expect(fetchClient.delete).toHaveBeenCalled();
  });
});
