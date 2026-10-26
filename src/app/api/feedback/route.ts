import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireServerAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';

export async function POST(req: NextRequest) {
  // 1. Server-side Authentication Guard: Require signed auth cookie
  const authError = requireServerAuth(req);
  if (authError) return authError;

  // 2. Client IP Rate Limiting: 10 feedback reports per minute per IP
  const clientIp = getClientIp(req);
  const rateLimit = await checkRateLimit(`feedback:${clientIp}`, 10, 60);

  if (rateLimit.error) {
    return NextResponse.json(
      { error: 'Rate limiting service unavailable. Please retry shortly.', retryable: true },
      { status: 503, headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' } }
    );
  }

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many feedback submissions. Please wait 1 minute before submitting again.' },
      { status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const body = await req.json();
    const { event_id, reason, note } = body || {};

    if (!reason) {
      return NextResponse.json(
        { error: 'Missing required field: reason' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { error } = await supabase.from('feedback').insert({
        event_id: event_id || null,
        reason,
        note: note || null,
      });

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500, headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }

    return NextResponse.json(
      { success: true, message: 'Feedback report recorded successfully' },
      { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch {
    return NextResponse.json(
      { error: 'Bad request parsing feedback body' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
