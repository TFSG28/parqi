/**
 * Shared domain types for authentication.
 * Kept here (not inline in a component/context) so any part of the app can
 * import the same User shape without redeclaring it.
 */

export interface User {
    id: string;
    name: string;
    email: string;
    // Populated only when the backend User model carries a role and includes it
    // in /auth/login and /auth/me. Used by ProtectedPage / requireRole.
    role?: string;
}

/**
 * Envelope returned by the backend (see backend ApiResponse):
 *   success -> { status: 'success', data }
 *   error   -> { status: 'error', message }
 */
export interface ApiEnvelope<T> {
    status: 'success' | 'error';
    data?: T;
    message?: string;
}
