/**
 * HTTP client with cookie-based auth support:
 * - credentials: 'include' on every request (httpOnly cookies)
 * - CSRF token handling for unsafe methods (stored in sessionStorage)
 * - single-flight access-token refresh on 401 (avoids refresh stampede)
 * - CSRF retry on 403
 * - uploadWithProgress for file uploads
 *
 * Degrades gracefully: if the backend exposes no /auth/refresh or CSRF, the
 * refresh/CSRF paths simply fail and fall back to redirecting to '/'.
 */
class FetchClient {
    private readonly baseURL: string = process.env.NEXT_PUBLIC_API_URL || '';
    private readonly CSRF_TOKEN_KEY = 'csrf_token';
    private isRefreshing = false;
    private refreshPromise: Promise<boolean> | null = null;

    setCsrfToken(token: string) {
        if (globalThis.window !== undefined) {
            sessionStorage.setItem(this.CSRF_TOKEN_KEY, token);
        }
    }

    clearCsrfToken() {
        if (globalThis.window !== undefined) {
            sessionStorage.removeItem(this.CSRF_TOKEN_KEY);
        }
    }

    getCsrfToken(): string | null {
        if (globalThis.window !== undefined) {
            return sessionStorage.getItem(this.CSRF_TOKEN_KEY);
        }
        return null;
    }

    private async refreshAccessToken(): Promise<boolean> {
        // If a refresh is already in progress, await it instead of firing another.
        if (this.isRefreshing && this.refreshPromise) {
            return this.refreshPromise;
        }

        this.isRefreshing = true;
        this.refreshPromise = (async () => {
            try {
                const response = await fetch(`${this.baseURL}/auth/refresh`, {
                    method: 'POST',
                    credentials: 'include',
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.csrfToken) {
                        this.setCsrfToken(data.csrfToken);
                    }
                    return true;
                }
                return false;
            } catch (error) {
                console.error('Error refreshing token:', error);
                return false;
            } finally {
                this.isRefreshing = false;
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

    private isUnsafeMethod(method?: string): boolean {
        return !['GET', 'HEAD', 'OPTIONS'].includes(method || 'GET');
    }

    // Auth endpoints must not trigger the refresh/redirect interceptor:
    // a 401 from /login means "bad credentials", not "session expired".
    private isAuthExempt(url: string): boolean {
        return url === '/auth/refresh' || url === '/auth/login';
    }

    private buildConfig(options: RequestInit): RequestInit {
        const config: RequestInit = {
            ...options,
            credentials: 'include',
            headers: { ...options.headers },
        };

        if (!(options.body instanceof FormData)) {
            config.headers = { 'Content-Type': 'application/json', ...config.headers };
        }

        const csrfToken = this.getCsrfToken();
        if (csrfToken && this.isUnsafeMethod(options.method)) {
            config.headers = { ...config.headers, 'X-CSRF-Token': csrfToken };
        }

        return config;
    }

    private failAuth(message: string): never {
        this.clearCsrfToken();
        if (globalThis.window !== undefined) {
            globalThis.location.href = '/';
        }
        throw new Error(message);
    }

    private async refreshAndRetry(url: string, config: RequestInit, refreshCsrf = false): Promise<Response | null> {
        const refreshed = await this.refreshAccessToken();
        if (!refreshed) return null;

        if (refreshCsrf) {
            const newCsrfToken = this.getCsrfToken();
            if (newCsrfToken && this.isUnsafeMethod(config.method)) {
                config.headers = { ...config.headers, 'X-CSRF-Token': newCsrfToken };
            }
        }

        const retryResponse = await fetch(`${this.baseURL}${url}`, config);
        return retryResponse.ok ? retryResponse : null;
    }

    private async handleCsrfFailure(url: string, response: Response, config: RequestInit): Promise<Response> {
        // ponytail: clone() so we don't consume the original response body when it isn't a CSRF error.
        const data = await response.clone().json().catch(() => ({}));
        const isCsrfError = data.message?.includes('CSRF') && !this.isAuthExempt(url);
        if (!isCsrfError) return response;

        const retry = await this.refreshAndRetry(url, config, true);
        if (retry) return retry;
        this.failAuth('Sessão expirada');
    }

    async fetch(url: string, options: RequestInit = {}) {
        const config = this.buildConfig(options);

        try {
            const response = await fetch(`${this.baseURL}${url}`, config);

            if (response.status === 401 && !this.isAuthExempt(url)) {
                const retry = await this.refreshAndRetry(url, config);
                if (retry) return retry;
                this.failAuth('Não autenticado');
            }

            if (response.status === 403) {
                return await this.handleCsrfFailure(url, response, config);
            }

            return response;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    get(url: string) {
        return this.fetch(url);
    }

    post(url: string, data?: unknown) {
        return this.fetch(url, {
            method: 'POST',
            body: data instanceof FormData ? data : JSON.stringify(data),
        });
    }

    put(url: string, data?: unknown) {
        return this.fetch(url, {
            method: 'PUT',
            body: data instanceof FormData ? data : JSON.stringify(data),
        });
    }

    patch(url: string, data?: unknown) {
        return this.fetch(url, {
            method: 'PATCH',
            body: data instanceof FormData ? data : JSON.stringify(data),
        });
    }

    delete(url: string) {
        return this.fetch(url, {
            method: 'DELETE',
        });
    }

    /**
     * Uploads FormData via XHR to report upload progress (fetch can't do this).
     */
    async uploadWithProgress(
        url: string,
        formData: FormData,
        onProgress?: (progress: number) => void
    ): Promise<Response> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            if (onProgress) {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        onProgress((e.loaded / e.total) * 100);
                    }
                });
            }

            xhr.onload = () => {
                const response = new Response(xhr.responseText, {
                    status: xhr.status,
                    statusText: xhr.statusText,
                    headers: new Headers(
                        xhr.getAllResponseHeaders()
                            .split('\r\n')
                            .reduce((headers, line) => {
                                const [key, value] = line.split(': ');
                                if (key && value) {
                                    headers[key] = value;
                                }
                                return headers;
                            }, {} as Record<string, string>)
                    ),
                });

                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(response);
                } else {
                    reject(new Error(`HTTP Error: ${xhr.status}`));
                }
            };

            xhr.onerror = () => reject(new Error('Network error'));
            xhr.ontimeout = () => reject(new Error('Request timeout'));

            xhr.open('POST', `${this.baseURL}${url}`);
            xhr.withCredentials = true;

            const csrfToken = this.getCsrfToken();
            if (csrfToken) {
                xhr.setRequestHeader('X-CSRF-Token', csrfToken);
            }
            xhr.send(formData);
        });
    }
}

export const fetchClient = new FetchClient();
