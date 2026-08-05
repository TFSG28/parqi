import { useState, useCallback } from 'react';
import { fetchClient } from '@/libs/fetchClient';
import { parseApiError } from '@/utils/apiParser';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

interface UseApiOptions {
    onSuccess?: (data: unknown) => void;
    onError?: (error: string) => void;
}

export function useApi<T>(options?: UseApiOptions) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const execute = async (method: HttpMethod, url: string, body?: unknown) => {
        setLoading(true);
        setError(null);

        try {
            const response =
                method === 'get' || method === 'delete'
                    ? await fetchClient[method](url)
                    : await fetchClient[method](url, body);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Erro na requisição');
            }

            setData(result);
            options?.onSuccess?.(result);
            return result;
        } catch (err) {
            const message = parseApiError(err);
            setError(message);
            options?.onError?.(message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const reset = useCallback(() => {
        setData(null);
        setLoading(false);
        setError(null);
    }, []);

    return {
        data,
        loading,
        error,
        execute,
        reset,
    };
}
