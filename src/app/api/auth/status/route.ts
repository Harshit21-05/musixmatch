import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, getAuthGateStatus } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const status = getAuthGateStatus(cookie);

  return NextResponse.json(
    {
      authenticated: status.authenticated,
      passcodeRequired: status.passcodeRequired,
      failClosed: status.failClosed,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
