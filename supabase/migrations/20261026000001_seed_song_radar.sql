-- ==============================================================================
-- Song Radar: Seed Data Migration
-- Includes realistic Indian music drops across Hindi, Tamil, Telugu, and Punjabi
-- NOTE: Devara is strictly Telugu only.
-- All seed data rows are flagged with is_demo = true.
-- ==============================================================================

-- Clean existing demo data safely if re-running
DELETE FROM public.event_history;
DELETE FROM public.event_sources;
DELETE FROM public.tasks;
DELETE FROM public.song_events WHERE is_demo = true;
DELETE FROM public.entities WHERE is_demo = true;
DELETE FROM public.ingest_log;

-- 1. Insert Entities (All marked is_demo = true)
INSERT INTO public.entities (id, name, type, tier, hype_score, release_date, tracked_reason, is_demo) VALUES
('e1000000-0000-0000-0000-000000000001', 'Devara: Part 1', 'movie', 1, 98, '2024-09-27', 'Telugu tentpole starring Jr NTR with Anirudh Ravichander high-energy score', true),
('e1000000-0000-0000-0000-000000000002', 'Pushpa 2: The Rule', 'movie', 1, 99, '2024-12-06', 'Allu Arjun sequel with Devi Sri Prasad high-charting discography', true),
('e1000000-0000-0000-0000-000000000003', 'Anirudh Ravichander', 'artist', 1, 99, NULL, 'Premier hitmaker dominating South Indian streaming platforms', true),
('e1000000-0000-0000-0000-000000000004', 'Karan Aujla', 'artist', 1, 94, NULL, 'Global Punjabi sensation with massive viral hooks and Billboard charting', true),
('e1000000-0000-0000-0000-000000000005', 'T-Series', 'label', 1, 95, NULL, 'Largest Indian music label with primary Bollywood & regional catalog', true),
('e1000000-0000-0000-0000-000000000006', 'Diljit Dosanjh', 'artist', 1, 97, NULL, 'International live icon breaking historic global records', true);

-- 2. Insert Song Events (All marked is_demo = true; Devara is Telugu only)
INSERT INTO public.song_events (
  id, dedup_key, song_title, movie_or_artist, language, state, date_time_ist,
  singers, music_director, lyricist, link, source, source_url,
  confidence, raw_note, tier, hype_score, thumbnail, is_new_drop, is_demo
) VALUES
-- Event 1: Surprise Drop (unannounced_drop) - Punjabi
(
  'a1000000-0000-0000-0000-000000000001',
  'karan_aujla_winning_speech_pa',
  'Winning Speech',
  'Karan Aujla',
  'pa',
  'unannounced_drop',
  now() - interval '18 minutes',
  ARRAY['Karan Aujla'],
  'Mxrci',
  'Karan Aujla',
  'https://www.youtube.com/watch?v=mock_winning_speech',
  'YouTube Webhook Realtime',
  'https://youtube.com',
  'high',
  'Surprise drop with no advance premiere countdown. Audio fingerprint matched instantly.',
  1,
  96,
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  true,
  true
),
-- Event 2: Live on DSP / Released - Telugu (Devara: Part 1, strictly Telugu)
(
  'a1000000-0000-0000-0000-000000000002',
  'devara_part_1_chuttamalle_te',
  'Chuttamalle',
  'Devara: Part 1',
  'te',
  'live_on_dsp',
  now() - interval '45 minutes',
  ARRAY['Shilpa Rao'],
  'Anirudh Ravichander',
  'Ramajogayya Sastry',
  'https://www.youtube.com/watch?v=mock_chuttamalle',
  'Spotify Catalog Sync',
  'https://spotify.com',
  'high',
  'Full track went live across Spotify, Apple Music and Wynk. Video trending #1 on YouTube.',
  1,
  98,
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  false,
  true
),
-- Event 3: Scheduled Premiere in 35 minutes - Telugu
(
  'a1000000-0000-0000-0000-000000000003',
  'pushpa_2_the_rule_kissik_te',
  'Kissik (The Dancing Queen Anthem)',
  'Pushpa 2: The Rule',
  'te',
  'scheduled',
  now() + interval '35 minutes',
  ARRAY['Sublahshini', 'Devi Sri Prasad'],
  'Devi Sri Prasad',
  'Chandrabose',
  'https://www.youtube.com/watch?v=mock_kissik',
  'Mythri Movie Makers Twitter',
  'https://x.com/MythriOfficial',
  'high',
  'Special item song premiere scheduled today at 11:07 AM IST on Mythri YouTube.',
  1,
  97,
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
  false,
  true
),
-- Event 4: Teaser released, waiting for full track - Tamil
(
  'a1000000-0000-0000-0000-000000000004',
  'the_greatest_of_all_time_chinna_chinna_kangal_ta',
  'Chinna Chinna Kangal',
  'The Greatest Of All Time',
  'ta',
  'teaser',
  now() - interval '3 hours',
  ARRAY['Thalapathy Vijay', 'Bhavatharini (AI recreated)'],
  'Yuvan Shankar Raja',
  'Kabilan Vairamuthu',
  'https://www.youtube.com/watch?v=mock_chinna_chinna',
  'T-Series Tamil YouTube',
  'https://youtube.com',
  'high',
  '1-minute promo dropped with late singer Bhavatharinis vocals recreated via voice AI.',
  1,
  93,
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop&q=80',
  false,
  true
),
-- Event 5: Announced track dropping tomorrow - Hindi
(
  'a1000000-0000-0000-0000-000000000005',
  'bhool_bhulaiyaa_3_title_track_hi',
  'Bhool Bhulaiyaa 3 Title Track',
  'Bhool Bhulaiyaa 3',
  'hi',
  'announced',
  now() + interval '26 hours',
  ARRAY['Pitbull', 'Diljit Dosanjh', 'Neeraj Shridhar'],
  'Pritam',
  'Sameer',
  'https://www.youtube.com/watch?v=mock_bb3_title',
  'T-Series Instagram Announcement',
  'https://instagram.com/tseries.official',
  'high',
  'Official poster released confirming Pitbull x Diljit Dosanjh collaboration.',
  1,
  99,
  'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop&q=80',
  false,
  true
),
-- Event 6: Rumor / Industry Buzz - Telugu (Devara: Part 1, strictly Telugu)
(
  'a1000000-0000-0000-0000-000000000006',
  'devara_part_1_ayudha_pooja_anthem_te',
  'Ayudha Pooja Anthem',
  'Devara: Part 1',
  'te',
  'rumor',
  now() + interval '72 hours',
  ARRAY['Anirudh Ravichander', 'Kaala Bhairava'],
  'Anirudh Ravichander',
  'Ramajogayya Sastry',
  'https://www.youtube.com/watch?v=mock_ayudha',
  'Tollywood Insider Discord',
  'https://discord.gg/tollywood',
  'medium',
  'Industry insider leak suggests raw festival song dropping ahead of Navratri weekend.',
  2,
  82,
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  false,
  true
),
-- Event 7: Released track - Hindi
(
  'a1000000-0000-0000-0000-000000000007',
  'bad_newz_tauba_tauba_hi',
  'Tauba Tauba',
  'Bad Newz',
  'hi',
  'released',
  now() - interval '5 days',
  ARRAY['Karan Aujla'],
  'Karan Aujla',
  'Karan Aujla',
  'https://www.youtube.com/watch?v=mock_tauba_tauba',
  'Saregama Music YouTube',
  'https://youtube.com',
  'high',
  'Superhit dance number featuring Vicky Kaushal and Triptii Dimri.',
  1,
  95,
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
  false,
  true
);

-- 3. Insert Event Sources
INSERT INTO public.event_sources (event_id, source, source_url, confidence, first_seen_at) VALUES
('a1000000-0000-0000-0000-000000000001', 'YouTube Webhook', 'https://youtube.com', 'high', now() - interval '18 minutes'),
('a1000000-0000-0000-0000-000000000001', 'Apple Music Feed', 'https://apple.com/music', 'high', now() - interval '14 minutes'),
('a1000000-0000-0000-0000-000000000002', 'Spotify Metadata Ingest', 'https://spotify.com', 'high', now() - interval '50 minutes'),
('a1000000-0000-0000-0000-000000000002', 'YouTube Live Premiere', 'https://youtube.com', 'high', now() - interval '45 minutes'),
('a1000000-0000-0000-0000-000000000003', 'Mythri Twitter Post', 'https://x.com/MythriOfficial', 'high', now() - interval '2 hours'),
('a1000000-0000-0000-0000-000000000005', 'T-Series Press Release', 'https://tseries.com', 'high', now() - interval '6 hours');

-- 4. Insert Event History (Audit transitions)
INSERT INTO public.event_history (event_id, field, old_value, new_value, changed_at) VALUES
('a1000000-0000-0000-0000-000000000001', 'state', 'rumor', 'unannounced_drop', now() - interval '18 minutes'),
('a1000000-0000-0000-0000-000000000002', 'state', 'scheduled', 'live_on_dsp', now() - interval '45 minutes'),
('a1000000-0000-0000-0000-000000000003', 'state', 'announced', 'scheduled', now() - interval '2 hours'),
('a1000000-0000-0000-0000-000000000004', 'state', 'announced', 'teaser', now() - interval '3 hours');

-- 5. Insert Tasks (Internal pipeline)
INSERT INTO public.tasks (id, event_id, title, status, priority, notes, due_date) VALUES
('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Fetch lyrics for Winning Speech (Karan Aujla)', 'todo', 'high', 'Surprise drop, get Punjabi lyrics from genius/official description', now() + interval '2 hours'),
('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'Translate Chuttamalle Telugu lyrics to English', 'translating', 'medium', 'Draft romanized Telugu script and English meaning lines', now() + interval '4 hours'),
('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000004', 'Sync timestamps for Chinna Chinna Kangal promo', 'synced', 'medium', 'Generate LRC synchronized file for 1:02 duration', now() + interval '6 hours'),
('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000007', 'Submit Tauba Tauba verified sync to catalog', 'done', 'low', 'Submitted and live on Musixmatch & Spotify', now() - interval '1 day');

-- 6. Insert Ingest Log
INSERT INTO public.ingest_log (count_created, count_updated, count_ignored, status) VALUES
(7, 4, 0, 'success');
