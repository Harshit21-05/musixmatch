import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';
import { INITIAL_WATCHLIST } from '@/data/mock-data';
import { requireServerAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

// In-memory fallback if Supabase credentials are not connected
let memoryEntities = INITIAL_WATCHLIST.map(w => ({
  id: w.id,
  name: w.title,
  type: w.type === 'composer' ? 'artist' : w.type,
  tier: w.tier,
  hype_score: w.hype,
  release_date: w.expectedDropDate,
  tracked_reason: w.notes,
  is_demo: true,
  created_at: new Date().toISOString(),
}));

function verifyBearerToken(authHeader: string | null): boolean {
  const expected = process.env.INGEST_TOKEN || 'songradar-secret-ingest-token-2026';
  if (!authHeader) return false;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const token = match[1].trim();
  const tokenBuf = Buffer.from(token);
  const expectedBuf = Buffer.from(expected);

  if (tokenBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(tokenBuf, expectedBuf);
}

// Zod Schema for entity ingestion
const RawEntitySchema = z.object({
  name: z.string().min(1, 'Entity name is required'),
  type: z.enum(['movie', 'artist', 'label', 'composer']).transform(val => (val === 'composer' ? 'artist' : val)),
  tier: z.coerce.number().int().min(1).max(3).default(2),
  hype_score: z.coerce.number().min(0).max(100).default(50),
  release_date: z.string().nullable().optional(),
  why_tracked: z.string().optional(),
  tracked_reason: z.string().optional(),
  is_demo: z.boolean().default(false),
});

const IngestEntitiesSchema = z.union([
  RawEntitySchema.array().max(100, 'Max 100 entities per batch'),
  RawEntitySchema,
]);

export async function GET(req: NextRequest) {
  // 1. Server-side Authentication Guard: Require signed auth cookie or Bearer token
  const hasCookie = requireServerAuth(req) === null;
  const hasBearer = verifyBearerToken(req.headers.get('authorization'));

  if (!hasCookie && !hasBearer) {
    return NextResponse.json(
      { error: 'Unauthorized: Authentication cookie or Bearer token required' },
      { status: 401, headers: noStoreHeaders }
    );
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('entities')
        .select('*')
        .order('hype_score', { ascending: false });

      if (!error && data && data.length > 0) {
        return NextResponse.json(data, { headers: noStoreHeaders });
      }
    } catch {
      // Fallback to memory
    }
  }

  return NextResponse.json(memoryEntities, { headers: noStoreHeaders });
}

export async function POST(req: NextRequest) {
  // 1. Bearer Token Verification (Automation Scout only)
  const authHeader = req.headers.get('authorization');
  if (!verifyBearerToken(authHeader)) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing INGEST_TOKEN Bearer token' },
      { status: 401, headers: noStoreHeaders }
    );
  }

  // 2. Distributed Rate Limiting
  const clientIp = getClientIp(req);
  const rateLimit = await checkRateLimit(`ingest_entities:${clientIp}`, 60, 60);

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

  try {
    const rawBody = await req.json();

    // 3. Zod Validation
    const parseResult = IngestEntitiesSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.format() },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const entities = Array.isArray(parseResult.data) ? parseResult.data : [parseResult.data];
    const supabase = getSupabaseAdmin();

    let created = 0;
    let updated = 0;
    let ignored = 0;

    for (const ent of entities) {
      const cleanName = ent.name.trim();
      const whyTracked = ent.why_tracked || ent.tracked_reason || null;

      if (supabase) {
        try {
          const { data: existing } = await supabase
            .from('entities')
            .select('id, tier, hype_score, tracked_reason')
            .ilike('name', cleanName)
            .eq('type', ent.type)
            .maybeSingle();

          if (!existing) {
            await supabase.from('entities').insert({
              name: cleanName,
              type: ent.type,
              tier: ent.tier,
              hype_score: ent.hype_score,
              release_date: ent.release_date || null,
              tracked_reason: whyTracked,
              is_demo: ent.is_demo,
            });
            created++;
          } else {
            const hasChanges =
              existing.tier !== ent.tier ||
              existing.hype_score !== ent.hype_score ||
              existing.tracked_reason !== whyTracked;

            if (hasChanges) {
              await supabase
                .from('entities')
                .update({
                  tier: ent.tier,
                  hype_score: ent.hype_score,
                  release_date: ent.release_date || null,
                  tracked_reason: whyTracked,
                })
                .eq('id', existing.id);
              updated++;
            } else {
              ignored++;
            }
          }
          continue;
        } catch {
          // Fall through to memory logic
        }
      }

      // In-Memory Upsert
      const existingIdx = memoryEntities.findIndex(
        m => m.name.toLowerCase() === cleanName.toLowerCase() && m.type === ent.type
      );

      if (existingIdx === -1) {
        memoryEntities.push({
          id: `ent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: cleanName,
          type: ent.type as any,
          tier: ent.tier as any,
          hype_score: ent.hype_score,
          release_date: ent.release_date || 'Upcoming',
          tracked_reason: whyTracked || undefined,
          is_demo: ent.is_demo,
          created_at: new Date().toISOString(),
        });
        created++;
      } else {
        const existing = memoryEntities[existingIdx];
        const hasChanges =
          existing.tier !== ent.tier ||
          existing.hype_score !== ent.hype_score ||
          existing.tracked_reason !== whyTracked;

        if (hasChanges) {
          memoryEntities[existingIdx] = {
            ...existing,
            tier: ent.tier as any,
            hype_score: ent.hype_score,
            tracked_reason: whyTracked || undefined,
          };
          updated++;
        } else {
          ignored++;
        }
      }
    }

    return NextResponse.json(
      {
        status: 'success',
        created,
        updated,
        ignored,
        total_processed: entities.length,
      },
      { status: 200, headers: noStoreHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Ingest entities failed' },
      { status: 400, headers: noStoreHeaders }
    );
  }
}
