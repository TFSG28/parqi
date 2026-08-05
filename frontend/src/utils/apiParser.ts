export function parseApiError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'Erro desconhecido';
}

export function parseApiResponse<T>(response: unknown): T {
    return response as T;
}
