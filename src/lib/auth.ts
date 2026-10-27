import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  THIRTY_DAYS_MS,
  getAuthSecret,
  createSignedToken,
  verifySignedToken,
  validatePasscode,
  getAuthGateStatus,
  AuthGateStatus,
} from './auth-core';

export {
  AUTH_COOKIE_NAME,
  THIRTY_DAYS_MS,
  getAuthSecret,
  createSignedToken,
  verifySignedToken,
  validatePasscode,
  getAuthGateStatus,
};
export type { AuthGateStatus };

/**
 * Server-side Route Guard: Verifies the signed auth cookie.
 * If SONG_RADAR_PASSCODE is missing in production, fails closed with 503 / 401.
 * Returns null if authorized; returns 401 Unauthorized NextResponse if invalid or missing.
 */
export function requireServerAuth(req: NextRequest): NextResponse | null {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const status = getAuthGateStatus(token);

  if (!status.authenticated) {
    return NextResponse.json(
      {
        error: status.failClosed
          ? 'Server configuration error: SONG_RADAR_PASSCODE is required in production'
          : 'Unauthorized: Valid signed authentication cookie required',
      },
      {
        status: status.failClosed ? 503 : 401,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
  return null;
}
