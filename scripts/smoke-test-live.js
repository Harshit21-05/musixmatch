#!/usr/bin/env node
/**
 * Song Radar: Post-Deployment Live Smoke Test Suite
 *
 * Requirements:
 * 1. Fails if --url points to localhost unless --allow-local is explicitly passed.
 * 2. Never simulates the PostgREST check (calls the real {supabase}/rest/v1/rpc/ingest_upsert_song_event with the anon key).
 * 3. Reads all secrets strictly from environment variables, NEVER from command-line arguments.
 * 4. Lists every public function with its anon execute privilege status.
 *
 * Usage:
 *   # Set required environment variables:
 *   export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
 *   export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
 *   export INGEST_TOKEN="your-production-ingest-token"
 *   export SONG_RADAR_PASSCODE="your-passcode"
 *   # Optional direct DB connection for deep catalog introspection:
 *   export DATABASE_URL="postgres://postgres.xxx:xxx@xxx.supabase.co:6543/postgres"
 *
 *   node scripts/smoke-test-live.js --url https://your-song-radar.vercel.app
 *   # Or for local development testing:
 *   node scripts/smoke-test-live.js --url http://localhost:3000 --allow-local
 */

const assert = require('assert');

// ----------------------------------------------------------------------------
// 1. CLI Parsing & Security Guards (No secrets in arguments)
// ----------------------------------------------------------------------------
const args = process.argv.slice(2);

const FORBIDDEN_SECRET_FLAGS = ['--token', '--passcode', '--anon-key', '--secret', '--key'];
for (const flag of FORBIDDEN_SECRET_FLAGS) {
  if (args.includes(flag)) {
    console.error(`\n❌ SECURITY ERROR: Forbidden flag '${flag}' detected in command arguments.`);
    console.error('Secrets must NEVER be passed as CLI arguments (they leak in shell history and ps aux).');
    console.error('Export environment variables instead:');
    console.error('  INGEST_TOKEN, SONG_RADAR_PASSCODE, NEXT_PUBLIC_SUPABASE_ANON_KEY\n');
    process.exit(1);
  }
}

function getCliOption(flag, fallback = '') {
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
    return args[idx + 1];
  }
  return fallback;
}

const LIVE_URL = (getCliOption('--url', process.env.LIVE_URL || '')).replace(/\/$/, '');
const ALLOW_LOCAL = args.includes('--allow-local');

if (!LIVE_URL) {
  console.error('\n❌ ERROR: Target URL is required.');
  console.error('Pass --url <url> or export LIVE_URL environment variable.');
  console.error('Example: node scripts/smoke-test-live.js --url https://song-radar.vercel.app\n');
  process.exit(1);
}

// Enforce --allow-local for localhost
const isLocal = LIVE_URL.includes('localhost') || LIVE_URL.includes('127.0.0.1') || LIVE_URL.includes('[::1]');
if (isLocal && !ALLOW_LOCAL) {
  console.error(`\n❌ ERROR: Target URL points to local address (${LIVE_URL}).`);
  console.error('This smoke test suite is designed for deployed production environments.');
  console.error('To run against a local server intentionally, pass the --allow-local flag:');
  console.error(`  node scripts/smoke-test-live.js --url ${LIVE_URL} --allow-local\n`);
  process.exit(1);
}

// ----------------------------------------------------------------------------
// 2. Read Secrets STRICTLY from Environment Variables
// ----------------------------------------------------------------------------
const SUPABASE_URL = (getCliOption('--supabase', process.env.NEXT_PUBLIC_SUPABASE_URL || '')).replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const INGEST_TOKEN = process.env.INGEST_TOKEN || '';
const PASSCODE = process.env.SONG_RADAR_PASSCODE || '';
const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';

// Fail immediately if required secrets are absent
const missingSecrets = [];
if (!SUPABASE_URL) missingSecrets.push('NEXT_PUBLIC_SUPABASE_URL (or --supabase <url>)');
if (!SUPABASE_ANON_KEY) missingSecrets.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
if (!INGEST_TOKEN) missingSecrets.push('INGEST_TOKEN');
if (!PASSCODE) missingSecrets.push('SONG_RADAR_PASSCODE');

if (missingSecrets.length > 0) {
  console.error('\n❌ ERROR: Required environment variables are missing:');
  for (const s of missingSecrets) {
    console.error(`  - ${s}`);
  }
  console.error('\nPlease export all required environment variables before running the smoke test.\n');
  process.exit(1);
}

async function runSmokeTests() {
  console.log('================================================================');
  console.log('🚀 SONG RADAR: LIVE PRODUCTION POST-DEPLOY SMOKE TEST SUITE');
  console.log('================================================================');
  console.log(`Target URL:        ${LIVE_URL}`);
  console.log(`Supabase Project:  ${SUPABASE_URL}`);
  console.log(`Supabase Anon Key: ${SUPABASE_ANON_KEY.slice(0, 10)}...${SUPABASE_ANON_KEY.slice(-6)}`);
  console.log(`Ingest Token:      ***${INGEST_TOKEN.slice(-4)}`);
  console.log(`Allow Local:       ${ALLOW_LOCAL}`);
  console.log(`Database URL:      ${DATABASE_URL ? '(configured for direct catalog check)' : '(not set; using PostgREST OpenAPI schema check)'}`);
  console.log('----------------------------------------------------------------\n');

  let passed = 0;
  let total = 0;

  function recordPass(msg) {
    passed++;
    total++;
    console.log(`  ✓ ${msg}`);
  }

  function recordFail(msg, err) {
    total++;
    console.error(`  ❌ FAILED: ${msg}`);
    if (err) console.error(`     Error: ${err.message || err}`);
  }

  // --------------------------------------------------------------------------
  // Check 1: List every public function and verify anon execute privilege
  // --------------------------------------------------------------------------
  console.log('Check 1: Listing every public function & verifying anon execute privileges...');
  if (DATABASE_URL) {
    // Deep catalog introspection via PostgreSQL connection
    try {
      const { Client } = require('pg');
      const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
      await client.connect();

      const query = `
        SELECT 
          p.proname AS function_name,
          pg_get_function_identity_arguments(p.oid) AS arguments,
          has_function_privilege('anon', p.oid, 'execute') AS anon_can_execute,
          has_function_privilege('service_role', p.oid, 'execute') AS service_role_can_execute
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        ORDER BY p.proname;
      `;
      const res = await client.query(query);
      await client.end();

      console.log('\n  --- Public Schema Functions & Execution Privileges ---');
      console.table(res.rows);

      assert(res.rows.length > 0, 'Must find at least 1 function in public schema');
      let anonBreached = false;
      for (const row of res.rows) {
        if (row.anon_can_execute === true) {
          anonBreached = true;
          recordFail(`Function public.${row.function_name} permits execution by 'anon'!`);
        }
      }
      if (!anonBreached) {
        recordPass(`All ${res.rows.length} public functions verified: anon_can_execute = FALSE`);
      }
    } catch (e) {
      recordFail('Direct Postgres catalog inspection failed', e);
    }
  } else {
    // Introspect via PostgREST OpenAPI Schema
    try {
      const schemaRes = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_ANON_KEY}`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      if (schemaRes.status === 200) {
        const schema = await schemaRes.json();
        const paths = Object.keys(schema.paths || {});
        const rpcPaths = paths.filter((p) => p.startsWith('/rpc/'));

        console.log('  Introspected PostgREST OpenAPI endpoints available to anon:');
        if (rpcPaths.length === 0) {
          console.log('  [None] - No RPC functions are exposed or callable by anon role.');
          recordPass('PostgREST schema introspection confirmed: 0 RPC functions exposed to anon');
        } else {
          console.table(rpcPaths.map((p) => ({ exposed_rpc_to_anon: p })));
          const forbiddenRpcs = ['/rpc/ingest_upsert_song_event', '/rpc/check_rate_limit'];
          const leaked = forbiddenRpcs.filter((f) => rpcPaths.includes(f));
          if (leaked.length > 0) {
            recordFail(`PostgREST exposes forbidden functions to anon: ${leaked.join(', ')}`);
          } else {
            recordPass('Public sensitive RPCs (ingest_upsert_song_event, check_rate_limit) are NOT exposed to anon');
          }
        }
      } else {
        recordFail(`PostgREST OpenAPI schema returned HTTP ${schemaRes.status}`);
      }
    } catch (e) {
      recordFail('PostgREST OpenAPI schema introspection error', e);
    }
  }

  // --------------------------------------------------------------------------
  // Check 2: Real PostgREST Anon RPC Call to ingest_upsert_song_event DENIED
  // --------------------------------------------------------------------------
  console.log('\nCheck 2: Testing live PostgREST RPC call with anon key (must be strictly denied)...');
  try {
    const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/ingest_upsert_song_event`;
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        p_dedup_key: 'smoke_test_tamper_attempt',
        p_song_title: 'Unauthorized Ingest',
        p_movie_or_artist: 'Attacker',
        p_language: 'Telugu',
        p_state: 'released',
      }),
    });

    // Revoked execute privilege returns HTTP 401 Unauthorized, 403 Forbidden, or 404 (hidden function cache)
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      recordPass(`Direct anon RPC call strictly DENIED with HTTP ${res.status} (${res.statusText})`);
    } else {
      const body = await res.text();
      recordFail(`CRITICAL SECURITY FAILURE: Direct anon RPC call returned HTTP ${res.status}: ${body}`);
    }
  } catch (e) {
    recordFail('Direct anon RPC test request error', e);
  }

  // Also verify check_rate_limit is denied to anon
  try {
    const rateLimitRpcUrl = `${SUPABASE_URL}/rest/v1/rpc/check_rate_limit`;
    const res = await fetch(rateLimitRpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ p_key: 'test', p_limit: 10, p_window_seconds: 60 }),
    });

    if (res.status === 401 || res.status === 403 || res.status === 404) {
      recordPass(`Direct anon RPC call to check_rate_limit strictly DENIED with HTTP ${res.status}`);
    } else {
      recordFail(`Direct anon RPC call to check_rate_limit returned HTTP ${res.status}`);
    }
  } catch (e) {
    recordFail('Direct anon RPC check_rate_limit request error', e);
  }

  // --------------------------------------------------------------------------
  // Check 3: Private API routes called WITHOUT auth cookie return 401
  // --------------------------------------------------------------------------
  console.log('\nCheck 3: Testing service-role API routes called WITHOUT auth cookie return 401...');
  const protectedRoutes = [
    { path: '/api/tasks', method: 'GET' },
    { path: '/api/events', method: 'GET' },
    { path: '/api/health', method: 'GET' },
    { path: '/api/feedback', method: 'POST', body: { reason: 'Smoke test feedback probe' } },
    { path: '/api/ingest/entities', method: 'GET' },
  ];

  for (const r of protectedRoutes) {
    try {
      const res = await fetch(`${LIVE_URL}${r.path}`, {
        method: r.method,
        headers: { 'Content-Type': 'application/json' },
        body: r.body ? JSON.stringify(r.body) : undefined,
      });

      if (res.status === 401) {
        const cache = res.headers.get('cache-control') || '';
        const hasNoStore = cache.includes('no-store');
        recordPass(`${r.method} ${r.path} -> 401 Unauthorized [Cache-Control: ${cache || 'none'}]`);
        assert(hasNoStore, `${r.path} must return Cache-Control: no-store`);
      } else {
        recordFail(`${r.method} ${r.path} without cookie returned HTTP ${res.status} (expected 401)`);
      }
    } catch (e) {
      recordFail(`${r.method} ${r.path} request failed`, e);
    }
  }

  // --------------------------------------------------------------------------
  // Check 4: Ingest API authentication (wrong token -> 401, correct -> 200)
  // --------------------------------------------------------------------------
  console.log('\nCheck 4: Testing Ingest API Bearer token verification...');
  try {
    // 4a. Wrong token
    const wrongRes = await fetch(`${LIVE_URL}/api/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid_smoke_token_9999',
      },
      body: JSON.stringify({ song_title: 'Unauthorized Smoke Song' }),
    });

    if (wrongRes.status === 401) {
      recordPass('POST /api/ingest with wrong Bearer token returned HTTP 401');
    } else {
      recordFail(`POST /api/ingest with wrong token returned HTTP ${wrongRes.status} (expected 401)`);
    }

    // 4b. Correct token
    const correctRes = await fetch(`${LIVE_URL}/api/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${INGEST_TOKEN}`,
      },
      body: JSON.stringify({
        song_title: `Live Smoke Test Track ${Date.now()}`,
        movie_or_artist: 'Devara Part 1',
        language: 'Telugu',
        state: 'announced',
        date_time_ist: '2026-11-15T18:00:00+05:30',
        is_demo: true,
      }),
    });

    if (correctRes.status === 200) {
      const data = await correctRes.json();
      const cache = correctRes.headers.get('cache-control') || '';
      recordPass(`POST /api/ingest with correct Bearer token succeeded HTTP 200 (created: ${data.created}) [Cache-Control: ${cache}]`);
    } else {
      const errText = await correctRes.text();
      recordFail(`POST /api/ingest with correct token returned HTTP ${correctRes.status}: ${errText}`);
    }
  } catch (e) {
    recordFail('Ingest token verification error', e);
  }

  // --------------------------------------------------------------------------
  // Check 5: Rate limit triggers after 5 bad passcodes on /api/auth/verify
  // --------------------------------------------------------------------------
  console.log('\nCheck 5: Testing /api/auth/verify rate limiting (triggers 429 after 5 failed attempts)...');
  try {
    const smokeIp = `smoke-probe-ip-${Date.now()}`;
    let hit429 = false;
    let retryAfterHeader = null;

    for (let i = 1; i <= 6; i++) {
      const res = await fetch(`${LIVE_URL}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': smokeIp,
        },
        body: JSON.stringify({ passcode: 'invalid_passcode_probe' }),
      });

      if (i <= 5) {
        if (res.status === 401) {
          // Expected rejection
        } else {
          recordFail(`Attempt ${i} returned unexpected HTTP ${res.status}`);
        }
      } else if (i === 6) {
        if (res.status === 429) {
          hit429 = true;
          retryAfterHeader = res.headers.get('retry-after');
        } else {
          recordFail(`Attempt 6 did not trigger rate limit (returned HTTP ${res.status})`);
        }
      }
    }

    if (hit429) {
      recordPass(`Rate limit triggered on 6th attempt: HTTP 429 Too Many Requests (Retry-After: ${retryAfterHeader}s)`);
    } else {
      recordFail('Rate limit did not trigger 429 on 6th attempt');
    }
  } catch (e) {
    recordFail('Auth rate limit verification error', e);
  }

  // --------------------------------------------------------------------------
  // Check 6: Webcal Calendar token protection
  // --------------------------------------------------------------------------
  console.log('\nCheck 6: Testing /api/calendar.ics token protection...');
  try {
    const noToken = await fetch(`${LIVE_URL}/api/calendar.ics`);
    if (noToken.status === 401) {
      recordPass('GET /api/calendar.ics without token returned HTTP 401');
    } else {
      recordFail(`GET /api/calendar.ics without token returned HTTP ${noToken.status}`);
    }

    const validToken = await fetch(`${LIVE_URL}/api/calendar.ics?token=${INGEST_TOKEN}`);
    if (validToken.status === 200) {
      const type = validToken.headers.get('content-type') || '';
      assert(type.includes('text/calendar'), 'Must return text/calendar MIME type');
      recordPass('GET /api/calendar.ics with valid token returned HTTP 200 [text/calendar]');
    } else {
      recordFail(`GET /api/calendar.ics with valid token returned HTTP ${validToken.status}`);
    }
  } catch (e) {
    recordFail('Calendar token verification error', e);
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`SMOKE TEST RESULTS: ${passed}/${total} checks PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('================================================================');

  if (passed === total) {
    console.log('🎉 ALL PRODUCTION SMOKE TESTS PASSED CLEANLY!\n');
    process.exit(0);
  } else {
    console.error('⚠️  Some smoke tests failed. Check logs above.\n');
    process.exit(1);
  }
}

runSmokeTests().catch((err) => {
  console.error('\nFatal smoke test error:', err);
  process.exit(1);
});
