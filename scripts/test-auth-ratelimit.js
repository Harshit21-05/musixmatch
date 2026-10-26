const assert = require('assert');

async function runAuthRateLimitTests() {
  console.log('🧪 Starting /api/auth/verify Rate-Limiting & Backoff Test...\n');

  const testIp = `test-ip-${Date.now()}`;
  const baseUrl = 'http://localhost:3000';

  console.log(`Phase 1: Sending 5 failed attempts from IP ${testIp}...`);

  for (let i = 1; i <= 5; i++) {
    const res = await fetch(`${baseUrl}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': testIp,
      },
      body: JSON.stringify({ passcode: 'wrong_passcode' }),
    });

    assert.strictEqual(res.status, 401, `Attempt ${i} should return 401 Unauthorized`);
    const limitHeader = res.headers.get('x-ratelimit-limit');
    const remainingHeader = res.headers.get('x-ratelimit-remaining');

    console.log(`  ✓ Attempt ${i}/5: HTTP 401 (Limit: ${limitHeader}, Remaining: ${remainingHeader})`);
  }

  console.log('\nPhase 2: Sending 6th attempt (must trigger HTTP 429 Too Many Requests)...');
  const rateLimitedRes = await fetch(`${baseUrl}/api/auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': testIp,
    },
    body: JSON.stringify({ passcode: 'wrong_passcode' }),
  });

  assert.strictEqual(rateLimitedRes.status, 429, '6th attempt must return 429 Too Many Requests');
  const retryAfter = rateLimitedRes.headers.get('retry-after');
  assert.strictEqual(retryAfter, '60', 'Must include Retry-After: 60 header');

  const body = await rateLimitedRes.json();
  assert(body.error.includes('Too many authentication attempts'), 'Error message must explain rate limit lockout');
  console.log(`  ✓ Attempt 6 throttled: HTTP 429 Too Many Requests (Retry-After: ${retryAfter}s)`);

  console.log('\nPhase 3: Verify IP isolation with a fresh IP address...');
  const freshIp = `test-fresh-ip-${Date.now()}`;
  const freshRes = await fetch(`${baseUrl}/api/auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': freshIp,
    },
    body: JSON.stringify({ passcode: 'wrong_passcode' }),
  });

  assert.strictEqual(freshRes.status, 401, 'Fresh IP must NOT be blocked by previous IP lockout');
  console.log(`  ✓ Fresh IP ${freshIp} received HTTP 401 (Not blocked)`);

  console.log('\nPhase 4: Successful authentication with valid passcode...');
  const successIp = `test-success-ip-${Date.now()}`;
  const successRes = await fetch(`${baseUrl}/api/auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': successIp,
    },
    body: JSON.stringify({ passcode: 'songradar2026' }),
  });

  assert.strictEqual(successRes.status, 200, 'Valid passcode must return HTTP 200 OK');
  const cookieHeader = successRes.headers.get('set-cookie');
  assert(cookieHeader && cookieHeader.includes('song_radar_auth'), 'Must set signed httpOnly auth cookie');
  console.log('  ✓ Valid passcode returned HTTP 200 OK and set song_radar_auth cookie');

  console.log('\n🎉 ALL /api/auth/verify RATE LIMIT & SECURITY TESTS PASSED 100%!');
}

runAuthRateLimitTests().catch((err) => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});
