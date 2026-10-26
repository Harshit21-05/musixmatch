-- ==============================================================================
-- Migration 3: Security Hardening for Functions & Role Privileges
-- Guarantee: Revoke execute privilege on all public functions from PUBLIC, anon,
--            and authenticated roles. Grant execute strictly to service_role.
--            Alter default privileges so any future function is also secured.
-- ==============================================================================

-- 0. Ensure standard Supabase roles exist if executing in standalone Postgres test environments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END $$;

-- 1. Revoke public execution privileges on existing public schema functions
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 2. Alter default privileges so future functions created revoke execute from PUBLIC, anon, authenticated
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES GRANT EXECUTE ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

-- 3. Explicit targeted revokes and grants on specific sensitive functions
REVOKE EXECUTE ON FUNCTION public.ingest_upsert_song_event(
  TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, TEXT, BOOLEAN
) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(
  TEXT, INT, INT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.ingest_upsert_song_event(
  TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, TEXT, BOOLEAN
) TO service_role;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(
  TEXT, INT, INT
) TO service_role;

-- 4. Confirm RLS is enabled on all public tables
ALTER TABLE IF EXISTS public.song_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ingest_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rate_limits ENABLE ROW LEVEL SECURITY;
