/**
 * Distributed rate limiter across serverless instances.
 * Stores counters in:
 * 1. Upstash Redis (if UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN are set)
 * 2. Database counter table `public.rate_limits` via Postgres function / query
 * 3. Fallback sliding window in-memory store for local development
 *
 * Rate-Limiter Errors:
 * If the rate-limiter backend suffers an error or failure, it returns { allowed: false, error: true }
 * so the calling API route returns HTTP 503 Service Unavailable (not 429), allowing automation to retry.
 */

import { getSupabaseAdmin } from './supabase';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  error?: boolean; // True if backend suffered an internal error/failure
  errorMessage?: string;
  backend?: 'redis' | 'postgres' | 'memory';
}

// Local in-memory sliding window fallback for dev
const clientRecords = new Map<string, { timestamps: number[] }>();

export async function checkRateLimit(
  clientId: string,
  maxRequests = 60,
  windowSeconds = 60
): Promise<RateLimitResult> {
  // 1. Upstash Redis REST check (if configured)
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      const key = `ratelimit:${clientId}`;
      const res = await fetch(`${upstashUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, windowSeconds, 'NX'],
        ]),
      });

      if (res.ok) {
        const results = await res.json();
        const currentCount = results[0]?.result || 1;
        return {
          allowed: currentCount <= maxRequests,
          remaining: Math.max(0, maxRequests - currentCount),
          backend: 'redis',
        };
      } else {
        console.error(`[RateLimiter] Upstash Redis HTTP error: ${res.status}`);
        // Fall through to Postgres
      }
    } catch (err: any) {
      console.error('[RateLimiter] Upstash connection failure:', err?.message);
      // Fall through to Postgres
    }
  }

  // 2. Postgres DB counter (via Supabase Admin)
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_key: clientId,
        p_max_requests: maxRequests,
        p_window_seconds: windowSeconds,
      });

      if (!error && data) {
        return {
          allowed: Boolean(data.allowed),
          remaining: Number(data.remaining || 0),
          backend: 'postgres',
        };
      } else if (error) {
        console.error('[RateLimiter] Postgres check_rate_limit RPC error:', error.message);
        if (process.env.NODE_ENV === 'production') {
          // Return 503 error flag so the caller returns HTTP 503 to automation
          return {
            allowed: false,
            remaining: 0,
            error: true,
            errorMessage: `Postgres rate limiter error: ${error.message}`,
            backend: 'postgres',
          };
        }
      }
    } catch (err: any) {
      console.error('[RateLimiter] Postgres rate limit query failed:', err?.message);
      if (process.env.NODE_ENV === 'production') {
        return {
          allowed: false,
          remaining: 0,
          error: true,
          errorMessage: `Postgres rate limiter query failed: ${err?.message}`,
          backend: 'postgres',
        };
      }
    }
  } else if (process.env.NODE_ENV === 'production') {
    console.error('[RateLimiter] SUPABASE_SERVICE_ROLE_KEY missing in production environment');
    return {
      allowed: false,
      remaining: 0,
      error: true,
      errorMessage: 'Database connection unconfigured for rate limiting in production',
      backend: 'postgres',
    };
  }

  // 3. Fallback in-memory sliding window (strictly for local offline dev when Supabase is unconfigured)
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  let record = clientRecords.get(clientId);

  if (!record) {
    record = { timestamps: [] };
    clientRecords.set(clientId, record);
  }

  record.timestamps = record.timestamps.filter(ts => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    return { allowed: false, remaining: 0, backend: 'memory' };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxRequests - record.timestamps.length,
    backend: 'memory',
  };
}
