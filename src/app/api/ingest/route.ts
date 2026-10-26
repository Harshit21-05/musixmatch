import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { executeBatchIngest } from '@/lib/ingest-service';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';

const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5MB
const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

function verifyBearerToken(authHeader: string | null): boolean {
  const expected = process.env.INGEST_TOKEN || 'songradar-secret-ingest-token-2026';
  if (!authHeader) return false;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const token = match[1].trim();
  const tokenBuf = Buffer.from(token);
  const expectedBuf = Buffer.from(expected);

  if (tokenBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(tokenBuf, expectedBuf);
}

export async function POST(req: NextRequest) {
  // 1. Constant-time Bearer token verification
  const authHeader = req.headers.get('authorization');
  if (!verifyBearerToken(authHeader)) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing INGEST_TOKEN Bearer token' },
      { status: 401, headers: noStoreHeaders }
    );
  }

  // 2. Distributed Rate Limiting (Upstash / DB counter / Memory)
  const clientIp = getClientIp(req);
  const rateLimit = await checkRateLimit(`ingest:${clientIp}`, 60, 60);

  // Requirement 4: Rate-limiter errors must return 503 (not 429) so automation retries
  if (rateLimit.error) {
    return NextResponse.json(
      {
        error: 'Rate limiting backend unavailable. Temporary service error, please retry.',
        retryable: true,
      },
      {
        status: 503,
        headers: {
          'Retry-After': '5',
          ...noStoreHeaders,
        },
      }
    );
  }

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too Many Requests: Rate limit exceeded (max 60/min)' },
      { status: 429, headers: { 'Retry-After': '60', ...noStoreHeaders } }
    );
  }

  // 3. Body size verification
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: 'Payload Too Large: Body exceeds 5MB limit' },
      { status: 413, headers: noStoreHeaders }
    );
  }

  // 4. Parse & Validate Payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400, headers: noStoreHeaders }
    );
  }

  if (Array.isArray(body) && body.length > 200) {
    return NextResponse.json(
      { error: 'Batch exceeds maximum limit of 200 events per request' },
      { status: 400, headers: noStoreHeaders }
    );
  }

  // 5. Execute Atomic UPSERT with dedup & history logging
  try {
    const result = await executeBatchIngest(body);
    return NextResponse.json(result, { status: 200, headers: noStoreHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal ingest error';
    return NextResponse.json({ error: message }, { status: 500, headers: noStoreHeaders });
  }
}
