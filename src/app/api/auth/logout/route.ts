import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json(
    { success: true },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
  );
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}
