import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  THIRTY_DAYS_MS,
  getAuthSecret,
  createSignedToken,
  verifySignedToken,
  validatePasscode,
} from './auth-core';

export {
  AUTH_COOKIE_NAME,
  THIRTY_DAYS_MS,
  getAuthSecret,
  createSignedToken,
  verifySignedToken,
  validatePasscode,
};

/**
 * Server-side Route Guard: Verifies the signed auth cookie.
 * Returns null if authorized; returns 401 Unauthorized NextResponse if invalid or missing.
 */
export function requireServerAuth(req: NextRequest): NextResponse | null {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!verifySignedToken(token)) {
    return NextResponse.json(
      { error: 'Unauthorized: Valid signed authentication cookie required' },
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
  return null;
}
