-- ==============================================================================
-- Song Radar: DB-Level Upsert Function & Shared Rate Limits Table
-- Guarantee: Atomic row-level lock (FOR UPDATE), State rank progression check,
--            Diff audit logging into event_history, Source appending to event_sources,
--            and DB counter rate-limiting across serverless instances.
-- ==============================================================================

-- 1. Shared Rate Limits Table (Counter across all serverless lambda instances)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index to quickly prune old rate limit entries
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_start);

-- 2. Atomic Rate Limit Increment Function (Returns true if allowed, false if limit exceeded)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_max_requests INT DEFAULT 60,
  p_window_seconds INT DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
  v_now TIMESTAMPTZ := now();
  v_window_start TIMESTAMPTZ;
  v_allowed BOOLEAN;
BEGIN
  INSERT INTO public.rate_limits (key, count, window_start)
  VALUES (p_key, 1, v_now)
  ON CONFLICT (key) DO UPDATE
  SET 
    count = CASE 
      WHEN public.rate_limits.window_start < (v_now - (p_window_seconds || ' seconds')::INTERVAL) THEN 1
      ELSE public.rate_limits.count + 1
    END,
    window_start = CASE
      WHEN public.rate_limits.window_start < (v_now - (p_window_seconds || ' seconds')::INTERVAL) THEN v_now
      ELSE public.rate_limits.window_start
    END
  RETURNING count, window_start INTO v_count, v_window_start;

  v_allowed := (v_count <= p_max_requests);
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'current_count', v_count,
    'remaining', GREATEST(0, p_max_requests - v_count)
  );
END;
$$;

-- 3. Atomic Single-Transaction Upsert Function for Song Events
CREATE OR REPLACE FUNCTION public.ingest_upsert_song_event(
  p_dedup_key TEXT,
  p_song_title TEXT,
  p_movie_or_artist TEXT,
  p_language TEXT,
  p_state TEXT,
  p_date_time_ist TIMESTAMPTZ,
  p_singers TEXT[],
  p_music_director TEXT,
  p_lyricist TEXT,
  p_link TEXT,
  p_source TEXT,
  p_source_url TEXT,
  p_confidence TEXT,
  p_raw_note TEXT,
  p_tier INT DEFAULT 2,
  p_hype_score INT DEFAULT 50,
  p_thumbnail TEXT DEFAULT NULL,
  p_is_demo BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
  v_existing RECORD;
  v_target_state TEXT;
  v_target_date TIMESTAMPTZ;
  v_rank_new INT;
  v_rank_old INT;
  v_is_new_drop BOOLEAN := false;
  v_has_changes BOOLEAN := false;
  v_merged_singers TEXT[];
BEGIN
  -- Rank lookup: rumor=1, announced=2, teaser=3, scheduled=4, released=5, unannounced_drop=5, live_on_dsp=6
  v_rank_new := CASE p_state
    WHEN 'rumor' THEN 1
    WHEN 'announced' THEN 2
    WHEN 'teaser' THEN 3
    WHEN 'scheduled' THEN 4
    WHEN 'released' THEN 5
    WHEN 'unannounced_drop' THEN 5
    WHEN 'live_on_dsp' THEN 6
    ELSE 1
  END;

  -- Atomic row-level lock: FOR UPDATE serializes concurrent requests on the exact dedup_key
  SELECT * INTO v_existing FROM public.song_events WHERE dedup_key = p_dedup_key FOR UPDATE;

  IF NOT FOUND THEN
    -- Fresh creation
    IF p_state = 'unannounced_drop' THEN
      v_is_new_drop := true;
    END IF;

    INSERT INTO public.song_events (
      dedup_key, song_title, movie_or_artist, language, state, date_time_ist,
      singers, music_director, lyricist, link, source, source_url,
      confidence, raw_note, tier, hype_score, thumbnail, is_new_drop, is_demo
    ) VALUES (
      p_dedup_key, p_song_title, p_movie_or_artist, p_language, p_state, p_date_time_ist,
      COALESCE(p_singers, '{}'::TEXT[]), p_music_director, p_lyricist, p_link, p_source, p_source_url,
      p_confidence, p_raw_note, COALESCE(p_tier, 2), COALESCE(p_hype_score, 50), p_thumbnail, v_is_new_drop, COALESCE(p_is_demo, false)
    ) RETURNING id INTO v_event_id;

    -- Record first source
    INSERT INTO public.event_sources (event_id, source, source_url, confidence)
    VALUES (v_event_id, p_source, COALESCE(p_source_url, ''), p_confidence);

    -- Record initial state in event_history
    INSERT INTO public.event_history (event_id, field, old_value, new_value)
    VALUES (v_event_id, 'state', NULL, p_state);

    RETURN jsonb_build_object('outcome', 'created', 'event_id', v_event_id);
  ELSE
    -- Row exists: compare state rank and audit field diffs
    v_event_id := v_existing.id;
    v_target_state := v_existing.state;
    v_target_date := v_existing.date_time_ist;

    v_rank_old := CASE v_existing.state
      WHEN 'rumor' THEN 1
      WHEN 'announced' THEN 2
      WHEN 'teaser' THEN 3
      WHEN 'scheduled' THEN 4
      WHEN 'released' THEN 5
      WHEN 'unannounced_drop' THEN 5
      WHEN 'live_on_dsp' THEN 6
      ELSE 1
    END;

    -- State progression: never move backwards
    IF v_rank_new > v_rank_old OR (v_rank_new = v_rank_old AND p_state = 'unannounced_drop' AND v_existing.state != 'unannounced_drop') THEN
      v_target_state := p_state;
      v_has_changes := true;
      INSERT INTO public.event_history (event_id, field, old_value, new_value)
      VALUES (v_event_id, 'state', v_existing.state, p_state);
    END IF;

    -- date_time_ist: may change either way; log change
    IF p_date_time_ist IS NOT NULL AND (v_existing.date_time_ist IS NULL OR v_existing.date_time_ist != p_date_time_ist) THEN
      INSERT INTO public.event_history (event_id, field, old_value, new_value)
      VALUES (v_event_id, 'date_time_ist', v_existing.date_time_ist::TEXT, p_date_time_ist::TEXT);
      v_target_date := p_date_time_ist;
      v_has_changes := true;
    END IF;

    -- Music Director change
    IF p_music_director IS NOT NULL AND (v_existing.music_director IS NULL OR v_existing.music_director != p_music_director) THEN
      INSERT INTO public.event_history (event_id, field, old_value, new_value)
      VALUES (v_event_id, 'music_director', v_existing.music_director, p_music_director);
      v_has_changes := true;
    END IF;

    -- Lyricist change
    IF p_lyricist IS NOT NULL AND (v_existing.lyricist IS NULL OR v_existing.lyricist != p_lyricist) THEN
      INSERT INTO public.event_history (event_id, field, old_value, new_value)
      VALUES (v_event_id, 'lyricist', v_existing.lyricist, p_lyricist);
      v_has_changes := true;
    END IF;

    -- Link change
    IF p_link IS NOT NULL AND (v_existing.link IS NULL OR v_existing.link != p_link) THEN
      INSERT INTO public.event_history (event_id, field, old_value, new_value)
      VALUES (v_event_id, 'link', v_existing.link, p_link);
      v_has_changes := true;
    END IF;

    -- Confidence change
    IF p_confidence IS NOT NULL AND p_confidence != v_existing.confidence THEN
      INSERT INTO public.event_history (event_id, field, old_value, new_value)
      VALUES (v_event_id, 'confidence', v_existing.confidence, p_confidence);
      v_has_changes := true;
    END IF;

    -- Merge singers if new distinct singers provided
    IF p_singers IS NOT NULL AND array_length(p_singers, 1) > 0 THEN
      SELECT ARRAY(SELECT DISTINCT unnest(array_cat(COALESCE(v_existing.singers, '{}'::TEXT[]), p_singers))) INTO v_merged_singers;
      IF array_length(v_merged_singers, 1) > COALESCE(array_length(v_existing.singers, 1), 0) THEN
        INSERT INTO public.event_history (event_id, field, old_value, new_value)
        VALUES (v_event_id, 'singers', array_to_string(v_existing.singers, ', '), array_to_string(v_merged_singers, ', '));
        UPDATE public.song_events SET singers = v_merged_singers WHERE id = v_event_id;
        v_has_changes := true;
      END IF;
    END IF;

    -- If no fields changed, return idempotent ignore
    IF NOT v_has_changes THEN
      RETURN jsonb_build_object('outcome', 'ignored', 'event_id', v_event_id);
    END IF;

    -- Apply updates
    UPDATE public.song_events SET
      state = v_target_state,
      date_time_ist = v_target_date,
      music_director = COALESCE(p_music_director, music_director),
      lyricist = COALESCE(p_lyricist, lyricist),
      link = COALESCE(p_link, link),
      confidence = COALESCE(p_confidence, confidence),
      is_new_drop = CASE WHEN p_state = 'unannounced_drop' THEN true ELSE is_new_drop END,
      updated_at = now()
    WHERE id = v_event_id;

    -- Append source
    INSERT INTO public.event_sources (event_id, source, source_url, confidence)
    VALUES (v_event_id, p_source, COALESCE(p_source_url, ''), p_confidence);

    RETURN jsonb_build_object('outcome', 'updated', 'event_id', v_event_id);
  END IF;
END;
$$;
