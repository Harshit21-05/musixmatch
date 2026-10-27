import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, validatePasscode, createSignedToken, getAuthGateStatus } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';

export async function POST(req: NextRequest) {
  try {
    const gateStatus = getAuthGateStatus();
    if (gateStatus.failClosed) {
      return NextResponse.json(
        { error: 'Server configuration error: SONG_RADAR_PASSCODE is not set in production. Access is locked.' },
        { status: 503, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }
    const clientIp = getClientIp(req);

    // 1. Per-IP Rate Limiting: 5 attempts per minute per IP
    const ipRateLimit = await checkRateLimit(`auth_verify_ip:${clientIp}`, 5, 60);

    if (ipRateLimit.error) {
      return NextResponse.json(
        { error: 'Rate limiting service temporarily unavailable. Please retry.', retryable: true },
        { status: 503, headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' } }
      );
    }

    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many authentication attempts from this IP. Please wait 1 minute before trying again.',
          retryAfter: 60,
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    // 2. Global Failure Limiter (Brute-force protection across distributed rotating proxies)
    const globalRateLimit = await checkRateLimit('auth_verify_global_attempts', 100, 60);
    if (!globalRateLimit.allowed) {
      return NextResponse.json(
        { error: 'Global authentication limit reached. Please wait 1 minute.' },
        { status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } }
      );
    }

    const body = await req.json();
    const passcode = body?.passcode;

    if (!validatePasscode(passcode)) {
      // Record global failure attempt
      await checkRateLimit('auth_verify_global_failures', 50, 60);

      return NextResponse.json(
        {
          error: 'Invalid passcode',
          remaining: ipRateLimit.remaining,
        },
        {
          status: 401,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': String(ipRateLimit.remaining),
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    const token = createSignedToken();
    const response = NextResponse.json(
      { success: true },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );

    // Set signed httpOnly cookie for 30 days
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Bad request' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
