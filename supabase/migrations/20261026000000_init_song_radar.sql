-- ==============================================================================
-- Song Radar: Initial Database Migration & Schema
-- Tables: song_events, event_sources, event_history, entities, tasks, feedback, ingest_log
-- Realtime: song_events
-- Row Level Security:
--   Anon read-only ONLY on song_events, event_sources, event_history, entities.
--   tasks, feedback, ingest_log have NO anon access; accessed via server routes with service-role key.
-- ==============================================================================

-- 1. SONG EVENTS (Primary tracking table)
CREATE TABLE IF NOT EXISTS public.song_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedup_key TEXT UNIQUE NOT NULL,
  song_title TEXT NOT NULL,
  movie_or_artist TEXT NOT NULL,
  language TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('rumor', 'announced', 'teaser', 'scheduled', 'released', 'unannounced_drop', 'live_on_dsp')),
  date_time_ist TIMESTAMPTZ,
  singers TEXT[] DEFAULT '{}'::TEXT[],
  music_director TEXT,
  lyricist TEXT,
  link TEXT,
  source TEXT,
  source_url TEXT,
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  raw_note TEXT,
  tier INT DEFAULT 2 CHECK (tier IN (1, 2, 3)),
  hype_score INT DEFAULT 50 CHECK (hype_score BETWEEN 0 AND 100),
  thumbnail TEXT,
  is_new_drop BOOLEAN DEFAULT false,
  is_demo BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for dedup key and search
CREATE INDEX IF NOT EXISTS idx_song_events_dedup_key ON public.song_events(dedup_key);
CREATE INDEX IF NOT EXISTS idx_song_events_state ON public.song_events(state);
CREATE INDEX IF NOT EXISTS idx_song_events_date_time ON public.song_events(date_time_ist DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_song_events_language ON public.song_events(language);
CREATE INDEX IF NOT EXISTS idx_song_events_is_demo ON public.song_events(is_demo);

-- 2. EVENT SOURCES (Every collector source that reported or confirmed an event)
CREATE TABLE IF NOT EXISTS public.event_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.song_events(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  first_seen_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_sources_event_id ON public.event_sources(event_id);

-- 3. EVENT HISTORY (Audit log of state transitions and field mutations)
CREATE TABLE IF NOT EXISTS public.event_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.song_events(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_history_event_id ON public.event_history(event_id);

-- 4. ENTITIES (Movies, Artists, Music Labels tracked by the scout)
CREATE TABLE IF NOT EXISTS public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('movie', 'artist', 'label')),
  tier INT DEFAULT 2 CHECK (tier IN (1, 2, 3)),
  hype_score INT DEFAULT 50 CHECK (hype_score BETWEEN 0 AND 100),
  release_date DATE,
  tracked_reason TEXT,
  is_demo BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entities_name ON public.entities(name);
CREATE INDEX IF NOT EXISTS idx_entities_is_demo ON public.entities(is_demo);

-- 5. TASKS (Workflow tracking: todo -> lyrics_found -> translating -> synced -> submitted -> done)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.song_events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'lyrics_found', 'translating', 'synced', 'submitted', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  notes TEXT,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- 6. FEEDBACK (Reports for "Wrong alert", bad date, inaccurate credits)
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.song_events(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  note TEXT,
  reported_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 7. INGEST LOG (Tracks every batch processed by /api/ingest)
CREATE TABLE IF NOT EXISTS public.ingest_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
  count_created INT DEFAULT 0,
  count_updated INT DEFAULT 0,
  count_ignored INT DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'error')),
  error_details TEXT
);

-- Realtime Setup: publication for live frontend updates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE public.song_events;
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'song_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.song_events;
  END IF;
END $$;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
  END IF;
END $$;

ALTER TABLE public.song_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingest_log ENABLE ROW LEVEL SECURITY;

-- Anonymous users (public website visitors) get read-only access ONLY to song_events, event_sources, event_history, and entities:
CREATE POLICY "Public Read: song_events" ON public.song_events FOR SELECT USING (true);
CREATE POLICY "Public Read: event_sources" ON public.event_sources FOR SELECT USING (true);
CREATE POLICY "Public Read: event_history" ON public.event_history FOR SELECT USING (true);
CREATE POLICY "Public Read: entities" ON public.entities FOR SELECT USING (true);

-- NOTICE: No public anon policies exist for tasks, feedback, or ingest_log.
-- Those tables are strictly accessed via server routes with the service-role key.

-- Full access for service_role key (server routes, Ingest API, tasks API, feedback API):
CREATE POLICY "Service Role: All on song_events" ON public.song_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role: All on event_sources" ON public.event_sources FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role: All on event_history" ON public.event_history FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role: All on entities" ON public.entities FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role: All on tasks" ON public.tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role: All on feedback" ON public.feedback FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role: All on ingest_log" ON public.ingest_log FOR ALL TO service_role USING (true) WITH CHECK (true);
