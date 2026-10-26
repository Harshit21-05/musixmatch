import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getSupabaseAdmin } from '@/lib/supabase';
import { getLocalIngestStore } from '@/lib/ingest-service';
import { requireServerAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  // 1. Server-side Authentication Guard: Require signed auth cookie
  const authError = requireServerAuth(req);
  if (authError) return authError;

  const noStoreHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  };

  const supabase = getSupabaseClient() || getSupabaseAdmin();

  if (supabase) {
    const { data: events, error } = await supabase
      .from('song_events')
      .select('*, event_sources(*), event_history(*)')
      .order('date_time_ist', { ascending: false, nullsFirst: false });

    if (!error && events && events.length > 0) {
      return NextResponse.json(events, { headers: noStoreHeaders });
    }
  }

  // Return locally ingested events merged with initial seed
  const localStore = getLocalIngestStore();
  return NextResponse.json(localStore.events, { headers: noStoreHeaders });
}
