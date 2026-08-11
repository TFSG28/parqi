/**
 * Retry with exponential backoff + jitter for transient operations
 * (external HTTP calls, SMTP, etc). Do not use for non-idempotent operations.
 *
 *   retries run in-process. If the Node process dies, the retry is lost.
 * Upgrade path: move to a persistent queue (e.g. BullMQ) when this is insufficient.
 */
export interface RetryOptions {
    attempts?: number;      // total attempts (>= 1)
    baseDelayMs?: number;   // base delay for the backoff
    maxDelayMs?: number;    // ceiling for the delay between attempts
    onAttemptFailed?: (attempt: number, error: unknown) => void;
}

const DEFAULTS: Required<Omit<RetryOptions, 'onAttemptFailed'>> = {
    attempts: 3,
    baseDelayMs: 500,
    maxDelayMs: 5000,
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export async function retry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
    const { attempts, baseDelayMs, maxDelayMs } = { ...DEFAULTS, ...opts };
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            opts.onAttemptFailed?.(attempt, error);
            if (attempt === attempts) break;

            const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
            const jitter = Math.random() * exp;
            await sleep(exp / 2 + jitter / 2);
        }
    }

    throw lastError;
}
