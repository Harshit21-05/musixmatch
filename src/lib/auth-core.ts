import crypto from 'crypto';

export const AUTH_COOKIE_NAME = 'song_radar_auth';
export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Returns the secret key used strictly for signing and verifying session cookies.
 * Falls back to SONG_RADAR_PASSCODE if AUTH_SECRET is not explicitly provided.
 */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.SONG_RADAR_PASSCODE;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL SECURITY ERROR: AUTH_SECRET or SONG_RADAR_PASSCODE environment variable is missing.');
    }
    // Fallback for development/testing only
    return 'dev-song-radar-auth-secret-change-in-prod-2026';
  }
  return secret;
}

/**
 * Creates a signed token value for the httpOnly cookie.
 * Format: v1.<issuedAtMs>.<expiresAtMs>.<hmacSignature>
 * Signed using HMAC-SHA256 with AUTH_SECRET (never the passcode).
 */
export function createSignedToken(
  customIssuedAt?: number,
  customExpiresAt?: number,
  customSecret?: string
): string {
  const issuedAt = customIssuedAt ?? Date.now();
  const expiresAt = customExpiresAt ?? (issuedAt + THIRTY_DAYS_MS);
  const secret = customSecret ?? getAuthSecret();

  const payload = `v1.${issuedAt}.${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`auth:${payload}`)
    .digest('hex');

  return `${payload}.${signature}`;
}

/**
 * Validates a signed cookie token.
 * Rejects if:
 * - Token is missing, malformed, or doesn't have 4 parts (v1.issued.expires.sig)
 * - Current time is past expiresAt (30-day expiration check)
 * - Issued timestamp is in the future beyond normal skew
 * - Token lifetime exceeds 30 days
 * - HMAC signature does not match (detects tampering and AUTH_SECRET rotation)
 */
export function verifySignedToken(
  token: string | undefined,
  customSecret?: string
): boolean {
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 4) return false;

  const [version, issuedAtStr, expiresAtStr, signature] = parts;
  if (version !== 'v1') return false;

  const issuedAt = parseInt(issuedAtStr, 10);
  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(issuedAt) || isNaN(expiresAt)) return false;

  const now = Date.now();

  // 1. Check expiration
  if (now > expiresAt) return false;

  // 2. Reject future-issued tokens (allow max 60s clock skew)
  if (now < issuedAt - 60000) return false;

  // 3. Reject tokens exceeding max lifetime of 30 days
  if (expiresAt - issuedAt > THIRTY_DAYS_MS + 1000) return false;

  // 4. Compute expected HMAC-SHA256 signature using AUTH_SECRET
  const secret = customSecret ?? getAuthSecret();
  const payload = `v1.${issuedAtStr}.${expiresAtStr}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`auth:${payload}`)
    .digest('hex');

  if (signature.length !== expectedSignature.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(expectedSignature, 'utf8')
  );
}

/**
 * Validates human passcode string against env SONG_RADAR_PASSCODE
 * Strictly uses timing-safe comparison.
 */
export function validatePasscode(input: string): boolean {
  const expected = process.env.SONG_RADAR_PASSCODE;
  if (!expected || !expected.trim()) return false;
  if (!input || !input.trim()) return false;

  const inputBuf = Buffer.from(input.trim());
  const expectedBuf = Buffer.from(expected.trim());

  if (inputBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(inputBuf, expectedBuf);
}

export interface AuthGateStatus {
  isProduction: boolean;
  isPasscodeConfigured: boolean;
  failClosed: boolean;
  authenticated: boolean;
  passcodeRequired: boolean;
}

/**
 * Determines server authentication status for incoming requests.
 * - If SONG_RADAR_PASSCODE is set: requires valid signed cookie token.
 * - If SONG_RADAR_PASSCODE is missing in production: FAILS CLOSED (never opens, authenticated=false, failClosed=true).
 * - If in development without passcode: authenticated=true.
 */
export function getAuthGateStatus(token?: string): AuthGateStatus {
  const isProduction = process.env.NODE_ENV === 'production';
  const passcode = process.env.SONG_RADAR_PASSCODE;
  const isPasscodeConfigured = Boolean(passcode && passcode.trim().length > 0);

  // If passcode env var is missing in production, fail closed, never open
  const failClosed = isProduction && !isPasscodeConfigured;
  const passcodeRequired = isPasscodeConfigured || failClosed;

  let authenticated = false;
  if (!passcodeRequired) {
    authenticated = true;
  } else if (failClosed) {
    authenticated = false;
  } else {
    authenticated = verifySignedToken(token);
  }

  return {
    isProduction,
    isPasscodeConfigured,
    failClosed,
    authenticated,
    passcodeRequired,
  };
}
