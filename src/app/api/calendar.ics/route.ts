import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';
import { buildICSContent } from '@/utils/export';
import { MusicEvent } from '@/types';
import { INITIAL_EVENTS } from '@/data/mock-data';

function verifyCalendarToken(req: NextRequest): boolean {
  const expectedPasscode = process.env.SONG_RADAR_PASSCODE || 'songradar2026';
  const expectedIngest = process.env.INGEST_TOKEN || 'songradar-secret-ingest-token-2026';

  // 1. Check query parameter: ?token=...
  const url = new URL(req.url);
  const tokenQuery = url.searchParams.get('token') || '';

  // 2. Check Authorization header: Bearer ...
  const authHeader = req.headers.get('authorization') || '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const tokenBearer = bearerMatch ? bearerMatch[1].trim() : '';

  const incomingToken = tokenQuery || tokenBearer;
  if (!incomingToken) return false;

  const inBuf = Buffer.from(incomingToken);
  const passBuf = Buffer.from(expectedPasscode);
  const ingestBuf = Buffer.from(expectedIngest);

  const matchPasscode = inBuf.length === passBuf.length && crypto.timingSafeEqual(inBuf, passBuf);
  const matchIngest = inBuf.length === ingestBuf.length && crypto.timingSafeEqual(inBuf, ingestBuf);

  return matchPasscode || matchIngest;
}

export async function GET(req: NextRequest) {
  // 1. Verify token
  if (!verifyCalendarToken(req)) {
    return new NextResponse('Unauthorized: Invalid or missing calendar token', {
      status: 401,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }

  // 2. Fetch upcoming events (from DB or fallback demo data)
  let events: MusicEvent[] = [];
  const supabase = getSupabaseAdmin();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('song_events')
        .select('*')
        .in('state', ['upcoming', 'scheduled', 'announced', 'teaser', 'rumor'])
        .order('date_time_ist', { ascending: true });

      if (!error && data && data.length > 0) {
        events = data.map((row: any) => ({
          id: row.id,
          songTitle: row.song_title,
          movieTitle: row.movie_or_artist,
          movie_or_artist: row.movie_or_artist,
          language: row.language,
          state: row.state,
          releaseTime: row.date_time_ist || new Date().toISOString(),
          date_time_ist: row.date_time_ist,
          tier: row.tier || 2,
          hypeScore: row.hype_score || 50,
          confidence: row.confidence === 'high' ? 95 : row.confidence === 'medium' ? 70 : 40,
          singers: row.singers || [],
          composer: row.music_director || 'TBA',
          music_director: row.music_director,
          lyricist: row.lyricist,
          recordLabel: row.source || 'Official Channel',
          thumbnail: row.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop',
          youtubeUrl: row.link,
          link: row.link,
          description: row.raw_note,
          is_demo: row.is_demo,
          timeline: [],
          sources: [],
          created_at: row.created_at,
          updated_at: row.updated_at,
        }));
      }
    } catch {
      // Fallback below
    }
  }

  if (events.length === 0) {
    events = INITIAL_EVENTS.filter(
      e =>
        e.state === 'upcoming' ||
        e.state === 'scheduled' ||
        e.state === 'announced' ||
        e.state === 'teaser' ||
        e.state === 'rumor'
    );
  }

  // 3. Build RFC 5545 calendar with line folding <= 75 octets & SEQUENCE
  const ics = buildICSContent(events);

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="song_radar_subscription.ics"',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
