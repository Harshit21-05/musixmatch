import { getSupabaseAdmin } from './supabase';
import {
  computeDedupKey,
  isStateProgressionAllowed,
  coerceEventPayload,
  STATE_RANK,
} from './ingest-dedup';
import { IngestEventInput, IngestEventSchema } from './ingest-schema';

export interface IngestResult {
  created: number;
  updated: number;
  ignored: number;
  errors?: Array<{ index: number; error: string }>;
}

// In-memory fallback store when running without external Supabase credentials
// Serialized with an atomic mutex to guarantee 0 race conditions or duplicates
const localEventsStore = new Map<string, Record<string, unknown>>();
const localHistoryStore: Array<Record<string, unknown>> = [];
const localSourcesStore: Array<Record<string, unknown>> = [];
const localIngestLogs: Array<Record<string, unknown>> = [];

// Mutex lock map to serialize concurrent operations on the same dedup key
const dedupKeyLocks = new Map<string, Promise<void>>();

async function acquireLock(key: string): Promise<() => void> {
  while (dedupKeyLocks.has(key)) {
    await dedupKeyLocks.get(key);
  }
  let resolver: () => void;
  const promise = new Promise<void>(resolve => {
    resolver = resolve;
  });
  dedupKeyLocks.set(key, promise);
  return () => {
    dedupKeyLocks.delete(key);
    resolver!();
  };
}

/**
 * Processes a single event with atomic dedup, state rank guard, and diff logging
 */
export async function processSingleEvent(
  rawInput: Record<string, unknown>
): Promise<'created' | 'updated' | 'ignored'> {
  // 1. Coerce dirty inputs ("not stated", "N/A", "")
  const coerced = coerceEventPayload(rawInput);

  // 2. Validate with Zod
  const validated: IngestEventInput = IngestEventSchema.parse(coerced);

  // 3. Compute canonical dedup key
  const dedupKey = computeDedupKey(
    validated.movie_or_artist,
    validated.song_title,
    validated.language
  );

  // 4. Acquire mutex lock for this dedup key to guarantee concurrency safety
  const releaseLock = await acquireLock(dedupKey);

  try {
    const supabase = getSupabaseAdmin();

    if (supabase) {
      // 1. Try atomic PostgreSQL stored procedure first (Single Transaction Upsert)
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('ingest_upsert_song_event', {
          p_dedup_key: dedupKey,
          p_song_title: validated.song_title,
          p_movie_or_artist: validated.movie_or_artist,
          p_language: validated.language,
          p_state: validated.state,
          p_date_time_ist: validated.date_time_ist || null,
          p_singers: validated.singers || [],
          p_music_director: validated.music_director || null,
          p_lyricist: validated.lyricist || null,
          p_link: validated.link || null,
          p_source: validated.source,
          p_source_url: validated.source_url || null,
          p_confidence: validated.confidence,
          p_raw_note: validated.raw_note || null,
          p_tier: validated.tier || 2,
          p_hype_score: validated.hype_score ?? 50,
          p_thumbnail: validated.thumbnail || null,
          p_is_demo: (validated as any).is_demo || false,
        });

        if (!rpcErr && rpcData?.outcome) {
          return rpcData.outcome as 'created' | 'updated' | 'ignored';
        }
      } catch {
        // Fallback to direct client query if function not yet applied
      }

      // 2. Direct Supabase Client Query Fallback
      const { data: existing, error: fetchErr } = await supabase
        .from('song_events')
        .select('*')
        .eq('dedup_key', dedupKey)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      if (!existing) {
        // CREATE: New event
        const isNewDrop = validated.state === 'unannounced_drop';
        const { data: inserted, error: insertErr } = await supabase
          .from('song_events')
          .insert({
            dedup_key: dedupKey,
            song_title: validated.song_title,
            movie_or_artist: validated.movie_or_artist,
            language: validated.language,
            state: validated.state,
            date_time_ist: validated.date_time_ist || null,
            singers: validated.singers || [],
            music_director: validated.music_director || null,
            lyricist: validated.lyricist || null,
            link: validated.link || null,
            source: validated.source,
            source_url: validated.source_url || null,
            confidence: validated.confidence,
            raw_note: validated.raw_note || null,
            tier: validated.tier || 2,
            hype_score: validated.hype_score ?? 50,
            thumbnail: validated.thumbnail || null,
            is_new_drop: isNewDrop,
            is_demo: false,
          })
          .select('id')
          .single();

        if (insertErr) throw insertErr;

        // Record initial source
        await supabase.from('event_sources').insert({
          event_id: inserted.id,
          source: validated.source,
          source_url: validated.source_url || '',
          confidence: validated.confidence,
        });

        // Record initial state in event_history
        await supabase.from('event_history').insert({
          event_id: inserted.id,
          field: 'state',
          old_value: null,
          new_value: validated.state,
        });

        return 'created';
      }

      // UPDATE / IGNORE: Event already exists
      const eventId = existing.id;
      const historyRows: Array<{
        event_id: string;
        field: string;
        old_value: string | null;
        new_value: string | null;
      }> = [];

      // A. State regression check
      let targetState = existing.state;
      if (validated.state !== existing.state) {
        if (isStateProgressionAllowed(existing.state, validated.state)) {
          targetState = validated.state;
          historyRows.push({
            event_id: eventId,
            field: 'state',
            old_value: existing.state,
            new_value: validated.state,
          });
        }
      }

      // B. date_time_ist change check (may change either way)
      let targetDateTime = existing.date_time_ist;
      const newTimeIso = validated.date_time_ist
        ? new Date(validated.date_time_ist).toISOString()
        : null;
      const existingTimeIso = existing.date_time_ist
        ? new Date(existing.date_time_ist).toISOString()
        : null;

      if (newTimeIso && newTimeIso !== existingTimeIso) {
        targetDateTime = newTimeIso;
        historyRows.push({
          event_id: eventId,
          field: 'date_time_ist',
          old_value: existingTimeIso,
          new_value: newTimeIso,
        });
      }

      // C. Other field diff checks
      const fieldsToCheck: Array<keyof IngestEventInput> = [
        'music_director',
        'lyricist',
        'link',
        'confidence',
      ];

      const updates: Record<string, unknown> = {
        state: targetState,
        date_time_ist: targetDateTime,
        updated_at: new Date().toISOString(),
      };

      for (const field of fieldsToCheck) {
        const newVal = validated[field];
        const oldVal = existing[field];
        if (newVal !== undefined && newVal !== null && newVal !== oldVal) {
          updates[field] = newVal;
          historyRows.push({
            event_id: eventId,
            field: String(field),
            old_value: oldVal ? String(oldVal) : null,
            new_value: String(newVal),
          });
        }
      }

      // Check singers array diff
      if (validated.singers && validated.singers.length > 0) {
        const existingSingers = (existing.singers as string[]) || [];
        const combined = Array.from(new Set([...existingSingers, ...validated.singers]));
        if (combined.length > existingSingers.length) {
          updates.singers = combined;
          historyRows.push({
            event_id: eventId,
            field: 'singers',
            old_value: existingSingers.join(', '),
            new_value: combined.join(', '),
          });
        }
      }

      // Handle unannounced drop flag
      if (validated.state === 'unannounced_drop') {
        updates.is_new_drop = true;
      }

      // If nothing changed and source is already recorded, it is an idempotent ignore
      if (historyRows.length === 0) {
        return 'ignored';
      }

      // Perform update
      const { error: updateErr } = await supabase
        .from('song_events')
        .update(updates)
        .eq('id', eventId);

      if (updateErr) throw updateErr;

      // Insert changed field history
      if (historyRows.length > 0) {
        await supabase.from('event_history').insert(historyRows);
      }

      // Append new source
      await supabase.from('event_sources').insert({
        event_id: eventId,
        source: validated.source,
        source_url: validated.source_url || '',
        confidence: validated.confidence,
      });

      return 'updated';
    } else {
      // --- LOCAL IN-MEMORY STORE FALLBACK ---
      const existing = localEventsStore.get(dedupKey);

      if (!existing) {
        const newId = `evt-ingest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const isNewDrop = validated.state === 'unannounced_drop';
        const newEventRecord: Record<string, unknown> = {
          id: newId,
          dedup_key: dedupKey,
          song_title: validated.song_title,
          songTitle: validated.song_title,
          movie_or_artist: validated.movie_or_artist,
          movieTitle: validated.movie_or_artist,
          language: validated.language,
          state: validated.state,
          date_time_ist: validated.date_time_ist || null,
          releaseTime: validated.date_time_ist || new Date().toISOString(),
          singers: validated.singers || [],
          music_director: validated.music_director || null,
          composer: validated.music_director || 'TBA',
          lyricist: validated.lyricist || 'TBA',
          link: validated.link || null,
          youtubeUrl: validated.link || 'https://youtube.com',
          source: validated.source,
          source_url: validated.source_url || null,
          confidence: validated.confidence,
          raw_note: validated.raw_note || null,
          tier: validated.tier || 2,
          hypeScore: validated.hype_score ?? 50,
          thumbnail:
            validated.thumbnail ||
            'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
          is_new_drop: isNewDrop,
          isNewDrop,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sources: [
            {
              source: validated.source,
              source_url: validated.source_url || '',
              confidence: validated.confidence,
              first_seen_at: new Date().toISOString(),
            },
          ],
          history: [
            {
              id: `hist-${Date.now()}`,
              event_id: newId,
              field: 'state',
              old_value: null,
              new_value: validated.state,
              changed_at: new Date().toISOString(),
            },
          ],
        };

        localEventsStore.set(dedupKey, newEventRecord);
        return 'created';
      }

      // Existing event update
      const historyRows: Array<{ field: string; old_value: string | null; new_value: string | null }> = [];
      let targetState = existing.state as string;

      if (validated.state !== existing.state) {
        if (isStateProgressionAllowed(existing.state as string, validated.state)) {
          targetState = validated.state;
          historyRows.push({
            field: 'state',
            old_value: String(existing.state),
            new_value: validated.state,
          });
        }
      }

      let targetDateTime = existing.date_time_ist as string | null;
      if (validated.date_time_ist && validated.date_time_ist !== existing.date_time_ist) {
        historyRows.push({
          field: 'date_time_ist',
          old_value: existing.date_time_ist ? String(existing.date_time_ist) : null,
          new_value: validated.date_time_ist,
        });
        targetDateTime = validated.date_time_ist;
      }

      // Check singers
      const existingSingers = (existing.singers as string[]) || [];
      const combinedSingers = Array.from(new Set([...existingSingers, ...(validated.singers || [])]));
      if (combinedSingers.length > existingSingers.length) {
        historyRows.push({
          field: 'singers',
          old_value: existingSingers.join(', '),
          new_value: combinedSingers.join(', '),
        });
      }

      if (historyRows.length === 0) {
        return 'ignored';
      }

      existing.state = targetState;
      existing.date_time_ist = targetDateTime;
      if (targetDateTime) existing.releaseTime = targetDateTime;
      existing.singers = combinedSingers;
      if (validated.music_director) existing.music_director = validated.music_director;
      if (validated.lyricist) existing.lyricist = validated.lyricist;
      if (validated.link) existing.link = validated.link;
      if (validated.state === 'unannounced_drop') {
        existing.is_new_drop = true;
        existing.isNewDrop = true;
      }
      existing.updated_at = new Date().toISOString();

      return 'updated';
    }
  } finally {
    releaseLock();
  }
}

/**
 * Main batch ingestion orchestrator
 */
export async function executeBatchIngest(
  payload: unknown
): Promise<IngestResult> {
  const eventsArray = Array.isArray(payload) ? payload : [payload];
  let created = 0;
  let updated = 0;
  let ignored = 0;
  const errors: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < eventsArray.length; i++) {
    try {
      const item = eventsArray[i];
      if (!item || typeof item !== 'object') {
        errors.push({ index: i, error: 'Event item must be an object' });
        continue;
      }
      const outcome = await processSingleEvent(item as Record<string, unknown>);
      if (outcome === 'created') created++;
      else if (outcome === 'updated') updated++;
      else ignored++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ index: i, error: msg });
    }
  }

  // Log batch execution to ingest_log table
  const status = errors.length === 0 ? 'success' : created + updated > 0 ? 'partial' : 'error';
  const supabase = getSupabaseAdmin();

  if (supabase) {
    await supabase.from('ingest_log').insert({
      count_created: created,
      count_updated: updated,
      count_ignored: ignored,
      status,
      error_details: errors.length > 0 ? JSON.stringify(errors) : null,
    });
  } else {
    localIngestLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      count_created: created,
      count_updated: updated,
      count_ignored: ignored,
      status,
      error_details: errors.length > 0 ? JSON.stringify(errors) : null,
    });
  }

  return { created, updated, ignored, ...(errors.length > 0 ? { errors } : {}) };
}

export function getLocalIngestStore() {
  return {
    events: Array.from(localEventsStore.values()),
    logs: localIngestLogs,
  };
}
