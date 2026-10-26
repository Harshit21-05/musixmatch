import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, verifySignedToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const isPasscodeConfigured = Boolean(process.env.SONG_RADAR_PASSCODE);

  const cookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = verifySignedToken(cookie);

  return NextResponse.json(
    {
      authenticated: isAuthenticated,
      passcodeRequired: isPasscodeConfigured,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
