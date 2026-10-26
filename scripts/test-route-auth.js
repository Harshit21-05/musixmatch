const assert = require('assert');

const BASE_URL = 'http://localhost:3000';
const INGEST_TOKEN = process.env.INGEST_TOKEN || 'songradar-secret-ingest-token-2026';
const PASSCODE = process.env.SONG_RADAR_PASSCODE || 'songradar2026';

async function runTests() {
  console.log('🧪 Starting Server-Side Route Authentication & Cache-Control Test Suite...\n');

  // --------------------------------------------------------------------------
  // TEST 1: Service-Role routes called WITHOUT authentication cookie return 401
  // --------------------------------------------------------------------------
  console.log('Test 1: Service-Role API routes called WITHOUT auth cookie must return 401:');

  const unauthenticatedRoutes = [
    { method: 'GET', url: '/api/tasks', desc: 'GET /api/tasks' },
    { method: 'POST', url: '/api/tasks', body: { title: 'Test' }, desc: 'POST /api/tasks' },
    { method: 'PATCH', url: '/api/tasks/tsk-1', body: { status: 'done' }, desc: 'PATCH /api/tasks/[id]' },
    { method: 'DELETE', url: '/api/tasks/tsk-1', desc: 'DELETE /api/tasks/[id]' },
    { method: 'POST', url: '/api/feedback', body: { reason: 'Wrong time' }, desc: 'POST /api/feedback' },
    { method: 'GET', url: '/api/health', desc: 'GET /api/health' },
    { method: 'GET', url: '/api/events', desc: 'GET /api/events' },
    { method: 'GET', url: '/api/ingest/entities', desc: 'GET /api/ingest/entities' },
  ];

  for (const r of unauthenticatedRoutes) {
    const res = await fetch(`${BASE_URL}${r.url}`, {
      method: r.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: r.body ? JSON.stringify(r.body) : undefined,
    });

    assert.strictEqual(
      res.status,
      401,
      `${r.desc} without cookie MUST return 401 Unauthorized (got: ${res.status})`
    );

    const cacheHeader = res.headers.get('cache-control') || '';
    assert(
      cacheHeader.includes('no-store'),
      `${r.desc} 401 response MUST contain Cache-Control: no-store (got: "${cacheHeader}")`
    );

    console.log(`  ✓ ${r.desc} -> HTTP 401 Unauthorized [Cache-Control: ${cacheHeader}]`);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Ingest API routes use ONLY the Bearer token (no cookie required)
  // --------------------------------------------------------------------------
  console.log('\nTest 2: /api/ingest* routes use strictly the Bearer token:');

  // 2a. POST /api/ingest without token -> 401
  const noTokenIngest = await fetch(`${BASE_URL}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ song_title: 'Test' }),
  });
  assert.strictEqual(noTokenIngest.status, 401, 'POST /api/ingest without Bearer token must return 401');
  console.log('  ✓ POST /api/ingest without Bearer token -> HTTP 401');

  // 2b. POST /api/ingest with wrong token -> 401
  const badTokenIngest = await fetch(`${BASE_URL}/api/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer invalid_token_123',
    },
    body: JSON.stringify({ song_title: 'Test' }),
  });
  assert.strictEqual(badTokenIngest.status, 401, 'POST /api/ingest with invalid Bearer token must return 401');
  console.log('  ✓ POST /api/ingest with invalid Bearer token -> HTTP 401');

  // 2c. POST /api/ingest with valid Bearer token -> 200
  const goodTokenIngest = await fetch(`${BASE_URL}/api/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${INGEST_TOKEN}`,
    },
    body: JSON.stringify({
      song_title: 'Ingest Auth Test Track',
      movie_or_artist: 'Devara Part 1',
      language: 'Telugu',
      state: 'released',
      date_time_ist: '2026-10-26T18:00:00+05:30',
      is_demo: true,
    }),
  });
  assert.strictEqual(goodTokenIngest.status, 200, 'POST /api/ingest with valid Bearer token must return 200');
  const ingestCache = goodTokenIngest.headers.get('cache-control') || '';
  assert(ingestCache.includes('no-store'), 'POST /api/ingest response must contain Cache-Control: no-store');
  console.log(`  ✓ POST /api/ingest with valid Bearer token -> HTTP 200 [Cache-Control: ${ingestCache}]`);

  // 2d. POST /api/ingest/entities with valid Bearer token -> 200
  const goodEntitiesIngest = await fetch(`${BASE_URL}/api/ingest/entities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${INGEST_TOKEN}`,
    },
    body: JSON.stringify({
      name: 'Pushpa 2: The Rule',
      type: 'movie',
      tier: 1,
      hype_score: 95,
      is_demo: true,
    }),
  });
  assert.strictEqual(goodEntitiesIngest.status, 200, 'POST /api/ingest/entities with valid Bearer token must return 200');
  console.log('  ✓ POST /api/ingest/entities with valid Bearer token -> HTTP 200');

  // --------------------------------------------------------------------------
  // TEST 3: Calendar feed /api/calendar.ics uses its own token
  // --------------------------------------------------------------------------
  console.log('\nTest 3: /api/calendar.ics uses its own query/bearer token:');

  const calNoToken = await fetch(`${BASE_URL}/api/calendar.ics`);
  assert.strictEqual(calNoToken.status, 401, '/api/calendar.ics without token must return 401');
  console.log('  ✓ /api/calendar.ics without token -> HTTP 401');

  const calBadToken = await fetch(`${BASE_URL}/api/calendar.ics?token=badtoken`);
  assert.strictEqual(calBadToken.status, 401, '/api/calendar.ics with bad token must return 401');
  console.log('  ✓ /api/calendar.ics with invalid token -> HTTP 401');

  const calGoodToken = await fetch(`${BASE_URL}/api/calendar.ics?token=${INGEST_TOKEN}`);
  assert.strictEqual(calGoodToken.status, 200, '/api/calendar.ics with valid token must return 200');
  const calCache = calGoodToken.headers.get('cache-control') || '';
  assert(calCache.includes('no-store'), '/api/calendar.ics must return Cache-Control: no-store');
  console.log(`  ✓ /api/calendar.ics with valid token -> HTTP 200 [Cache-Control: ${calCache}]`);

  // --------------------------------------------------------------------------
  // TEST 4: Service-Role routes called WITH signed cookie succeed (200 / 201)
  // --------------------------------------------------------------------------
  console.log('\nTest 4: Service-Role API routes called WITH signed cookie succeed:');

  // Authenticate first
  const authRes = await fetch(`${BASE_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode: PASSCODE }),
  });
  assert.strictEqual(authRes.status, 200, 'Authentication must succeed with valid passcode');
  const cookieHeader = authRes.headers.get('set-cookie');
  const cookieMatch = cookieHeader && cookieHeader.match(/song_radar_auth=[^;]+/);
  assert(cookieMatch, 'Must obtain song_radar_auth cookie');
  const authCookie = cookieMatch[0];

  const authenticatedRoutes = [
    { method: 'GET', url: '/api/tasks', desc: 'GET /api/tasks' },
    { method: 'GET', url: '/api/events', desc: 'GET /api/events' },
    { method: 'GET', url: '/api/health', desc: 'GET /api/health' },
    { method: 'GET', url: '/api/ingest/entities', desc: 'GET /api/ingest/entities' },
    {
      method: 'POST',
      url: '/api/feedback',
      body: { reason: 'Test verification feedback' },
      desc: 'POST /api/feedback',
    },
  ];

  for (const r of authenticatedRoutes) {
    const res = await fetch(`${BASE_URL}${r.url}`, {
      method: r.method,
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: r.body ? JSON.stringify(r.body) : undefined,
    });

    assert(
      res.status === 200 || res.status === 201,
      `${r.desc} with valid cookie MUST succeed (got: ${res.status})`
    );

    const cacheHeader = res.headers.get('cache-control') || '';
    assert(
      cacheHeader.includes('no-store'),
      `${r.desc} authenticated response MUST contain Cache-Control: no-store`
    );

    console.log(`  ✓ ${r.desc} with cookie -> HTTP ${res.status} [Cache-Control: ${cacheHeader}]`);
  }

  console.log('\n🎉 ALL ROUTE AUTHENTICATION & CACHE-CONTROL TESTS PASSED 100%!');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
