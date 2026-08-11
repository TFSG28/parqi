/**
 * Cookie configuration for cookie-based auth.
 *
 * - access_token: httpOnly JWT cookie (not readable by JS).
 * - csrf_token: readable cookie for the stateless double-submit CSRF check
 *   (the client echoes it back in the X-CSRF-Token header).
 *
 *   sameSite 'lax' assumes frontend and backend share a site.
 * If they live on different domains (e.g. app.example.com + api.example.com),
 * switch to sameSite 'none' with secure: true.
 */
const isProd = process.env.NODE_ENV === 'production';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const CSRF_COOKIE = 'csrf_token';

// Matches the JWT expiry (7d) configured in Jwt.service.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const accessCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    maxAge: MAX_AGE_MS,
    path: '/',
};

export const csrfCookieOptions = {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax' as const,
    maxAge: MAX_AGE_MS,
    path: '/',
};

// Options used when clearing cookies (must match path/sameSite/secure).
export const clearCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
};
