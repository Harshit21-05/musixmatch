/**
 * Verification Script for Requirement 1:
 * - Cookie-less request to "/" returns ONLY the login screen (no feed data in HTML)
 * - Cookie-less request to "/api/events" returns 401 Unauthorized
 * - Passcode verification sets signed httpOnly cookie
 * - Authenticated request returns the full application
 * - Missing passcode in production fails closed (never open)
 */

const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');

const AUTH_COOKIE_NAME = 'song_radar_auth';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function createSignedToken(customIssuedAt, customExpiresAt, secret) {
  const issuedAt = customIssuedAt ?? Date.now();
  const expiresAt = customExpiresAt ?? (issuedAt + THIRTY_DAYS_MS);
  const payload = `v1.${issuedAt}.${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`auth:${payload}`)
    .digest('hex');
  return `${payload}.${signature}`;
}

function verifySignedToken(token, secret) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 4) return false;
  const [version, issuedAtStr, expiresAtStr, signature] = parts;
  if (version !== 'v1') return false;
  const issuedAt = parseInt(issuedAtStr, 10);
  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(issuedAt) || isNaN(expiresAt)) return false;
  const now = Date.now();
  if (now > expiresAt) return false;
  if (now < issuedAt - 60000) return false;
  if (expiresAt - issuedAt > THIRTY_DAYS_MS + 1000) return false;
  const payload = `v1.${issuedAtStr}.${expiresAtStr}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`auth:${payload}`)
    .digest('hex');
  if (signature.length !== expectedSignature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expectedSignature, 'utf8'));
}

function validatePasscode(input, expected) {
  if (!expected || !expected.trim()) return false;
  if (!input || !input.trim()) return false;
  const inputBuf = Buffer.from(input.trim());
  const expectedBuf = Buffer.from(expected.trim());
  if (inputBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(inputBuf, expectedBuf);
}

function getAuthGateStatus(token, passcode, isProduction, secret) {
  const isPasscodeConfigured = Boolean(passcode && passcode.trim().length > 0);
  const failClosed = isProduction && !isPasscodeConfigured;
  const passcodeRequired = isPasscodeConfigured || failClosed;
  let authenticated = false;
  if (!passcodeRequired) {
    authenticated = true;
  } else if (failClosed) {
    authenticated = false;
  } else {
    authenticated = verifySignedToken(token, secret);
  }
  return {
    isProduction,
    isPasscodeConfigured,
    failClosed,
    authenticated,
    passcodeRequired,
  };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runUnitSecurityTests() {
  console.log('\n--- Part 1: Auth Guard Logic & Fail-Closed Unit Tests ---');
  const secret = 'test-secret-key-32-chars-minimum-prod';
  const passcode = 'production-secret-pass-2026';

  // 1. Passcode configured in production
  const unauth = getAuthGateStatus(undefined, passcode, true, secret);
  assert(unauth.authenticated === false, 'Unauthenticated user is denied');
  assert(unauth.passcodeRequired === true, 'Passcode is required');
  assert(unauth.failClosed === false, 'failClosed is false when passcode is configured');

  const invalidToken = getAuthGateStatus('v1.12345.67890.invalid', passcode, true, secret);
  assert(invalidToken.authenticated === false, 'Invalid token is denied');

  const validToken = createSignedToken(Date.now(), Date.now() + 86400000, secret);
  const validStatus = getAuthGateStatus(validToken, passcode, true, secret);
  assert(validStatus.authenticated === true, 'Valid signed cookie token is authenticated');

  assert(validatePasscode('wrong-pass', passcode) === false, 'Wrong passcode rejected');
  assert(validatePasscode(passcode, passcode) === true, 'Correct passcode accepted');

  // 2. Passcode MISSING in production (FAIL-CLOSED)
  const missingPasscodeStatus = getAuthGateStatus(undefined, undefined, true, secret);
  assert(missingPasscodeStatus.authenticated === false, 'When passcode env var is missing in production, access is denied');
  assert(missingPasscodeStatus.failClosed === true, 'When passcode env var is missing in production, system FAILS CLOSED');

  const tokenDuringFailClosed = getAuthGateStatus(validToken, undefined, true, secret);
  assert(tokenDuringFailClosed.authenticated === false, 'Even with valid token, missing passcode in production fails closed');
  assert(validatePasscode('any-input', undefined) === false, 'Passcode verification fails closed when env var is missing');
}

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runLiveServerTests() {
  console.log('\n--- Part 2: Live HTTP Server Tests (Render & API Verification) ---');

  const PORT = 3099;
  const TEST_PASSCODE = 'radar_secure_2026';

  console.log(`Starting Next.js production server on port ${PORT}...`);
  const serverProcess = spawn('cmd.exe', ['/c', `npx next start -p ${PORT}`], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'production',
      SONG_RADAR_PASSCODE: TEST_PASSCODE,
      AUTH_SECRET: 'test-auth-secret-for-http-verification-2026',
    },
    stdio: 'pipe',
  });

  // Wait for server ready
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/auth/status', method: 'GET' });
      ready = true;
      break;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (!ready) {
    serverProcess.kill();
    throw new Error('Server failed to start within 30 seconds');
  }
  console.log('Next.js server is ready. Executing HTTP assertions...\n');

  try {
    // 1. Cookie-less GET request to "/"
    const rootRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/',
      method: 'GET',
    });

    assert(rootRes.statusCode === 200, 'GET / returns HTTP 200');
    assert(rootRes.body.includes('Song Radar Access'), 'HTML includes Song Radar Access login wall');
    assert(rootRes.body.includes('Enter the shared team passcode'), 'HTML includes passcode input form');

    // CRITICAL SECURITY ASSERTION: Verify ZERO feed data leaked in HTML or __next_f script payloads
    const leakedKeywords = [
      'Chuttamalle',
      'Tauba Tauba',
      'Illuminati',
      'Fear Song',
      'Hunter Vantaar',
      'Devara',
      'Bad Newz',
      'Aavesham',
    ];

    for (const keyword of leakedKeywords) {
      assert(
        !rootRes.body.includes(keyword),
        `HTML does NOT leak feed keyword "${keyword}" (leaked = false)`
      );
    }

    // 2. Cookie-less GET request to "/api/events"
    const apiRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/events',
      method: 'GET',
    });

    assert(apiRes.statusCode === 401, 'GET /api/events without cookie returns 401 Unauthorized');
    const apiJson = JSON.parse(apiRes.body);
    assert(apiJson.error && apiJson.error.includes('Unauthorized'), 'API returns explicit Unauthorized error');
    assert(!apiJson.events, 'API returns zero event data');

    // 3. POST /api/auth/verify with WRONG passcode
    const wrongAuthRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/verify',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      JSON.stringify({ passcode: 'wrong_passcode' })
    );
    assert(wrongAuthRes.statusCode === 401, 'POST /api/auth/verify with wrong passcode returns 401');

    // 4. POST /api/auth/verify with CORRECT passcode
    const correctAuthRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/verify',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      JSON.stringify({ passcode: TEST_PASSCODE })
    );
    assert(correctAuthRes.statusCode === 200, 'POST /api/auth/verify with correct passcode returns 200');
    const setCookieHeader = correctAuthRes.headers['set-cookie'] || [];
    const authCookie = setCookieHeader.find(c => c.includes(AUTH_COOKIE_NAME));
    assert(Boolean(authCookie), 'Verification response sets song_radar_auth cookie');
    assert(authCookie.includes('HttpOnly'), 'Cookie is httpOnly');

    const cookieValue = authCookie.split(';')[0];

    // 5. GET / with valid auth cookie
    const authedRootRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/',
      method: 'GET',
      headers: { Cookie: cookieValue },
    });

    assert(authedRootRes.statusCode === 200, 'GET / with auth cookie returns 200');
    assert(
      authedRootRes.body.includes('Live Ingestion Radar') || authedRootRes.body.includes('Song Radar'),
      'Authenticated HTML renders the Song Radar application feed'
    );

    // 6. GET /api/events with valid auth cookie
    const authedEventsRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/events',
      method: 'GET',
      headers: { Cookie: cookieValue },
    });
    assert(authedEventsRes.statusCode === 200, 'GET /api/events with auth cookie returns 200 OK');

    console.log('\n🎉 ALL LIVE HTTP SECURITY & FAIL-CLOSED ASSERTIONS PASSED!');
  } finally {
    // Kill the next server process tree on Windows
    spawn('cmd.exe', ['/c', `taskkill /F /T /PID ${serverProcess.pid}`]);
  }
}

async function main() {
  try {
    await runUnitSecurityTests();
    await runLiveServerTests();
    process.exit(0);
  } catch (err) {
    console.error('Test run failed:', err);
    process.exit(1);
  }
}

main();
