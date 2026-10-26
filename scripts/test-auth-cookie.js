#!/usr/bin/env node
const assert = require('assert');

// Auto-spawn with --experimental-strip-types if needed so plain 'node scripts/test-auth-cookie.js' works
if (!process.execArgv.includes('--experimental-strip-types')) {
  const { spawnSync } = require('child_process');
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', __filename, ...process.argv.slice(2)],
    { stdio: 'inherit', env: process.env }
  );
  process.exit(result.status || 0);
}

async function runAuthCookieTests() {
  console.log('================================================================');
  console.log('🔐 SONG RADAR: AUTH COOKIE & SECRET ROTATION TEST SUITE');
  console.log('================================================================\n');

  // Load auth module dynamically
  const {
    createSignedToken,
    verifySignedToken,
    validatePasscode,
    THIRTY_DAYS_MS,
  } = await import('../src/lib/auth-core.ts');

  const secretA = 'secret-rotation-test-key-alpha-2026';
  const secretB = 'secret-rotation-test-key-bravo-2026';

  // 1. Valid cookie verification
  console.log('Test 1: Valid signed cookie verification...');
  const validToken = createSignedToken(Date.now(), Date.now() + THIRTY_DAYS_MS, secretA);
  const isValid = verifySignedToken(validToken, secretA);
  assert.strictEqual(isValid, true, 'Valid token signed with secretA must verify true');
  console.log(`  ✓ Valid signed token: ${validToken.slice(0, 32)}...`);
  console.log('  ✓ Valid signed token verifies successfully');

  // 2. Expired cookie rejection (>30 days ago)
  console.log('\nTest 2: Expired cookie rejection (>30 days ago)...');
  const pastIssuedAt = Date.now() - (31 * 24 * 60 * 60 * 1000);
  const pastExpiresAt = Date.now() - (1 * 24 * 60 * 60 * 1000); // Expired yesterday
  const expiredToken = createSignedToken(pastIssuedAt, pastExpiresAt, secretA);
  const isExpiredValid = verifySignedToken(expiredToken, secretA);
  assert.strictEqual(isExpiredValid, false, 'Expired token must return false');
  console.log(`  ✓ Expired token: ${expiredToken.slice(0, 32)}...`);
  console.log('  ✓ Expired token rejected successfully');

  // 3. Tampered payload rejection (attacker alters expiresAt in token string)
  console.log('\nTest 3: Tampered payload rejection...');
  const parts = validToken.split('.');
  // Extend expiration by 100 days without valid signature
  const tamperedPayloadToken = `${parts[0]}.${parts[1]}.${Date.now() + 100 * 24 * 60 * 60 * 1000}.${parts[3]}`;
  const isTamperedPayloadValid = verifySignedToken(tamperedPayloadToken, secretA);
  assert.strictEqual(isTamperedPayloadValid, false, 'Tampered token payload must return false');
  console.log('  ✓ Tampered payload detected and rejected');

  // 4. Tampered signature rejection (attacker flips signature bits)
  console.log('\nTest 4: Tampered signature rejection...');
  const tamperedSig = parts[3].slice(0, -4) + 'beef';
  const tamperedSigToken = `${parts[0]}.${parts[1]}.${parts[2]}.${tamperedSig}`;
  const isTamperedSigValid = verifySignedToken(tamperedSigToken, secretA);
  assert.strictEqual(isTamperedSigValid, false, 'Tampered signature must return false');
  console.log('  ✓ Tampered signature detected and rejected');

  // 5. Secret rotation: Token signed with Secret A verified against rotated Secret B
  console.log('\nTest 5: Secret rotation invalidation...');
  const tokenSignedWithA = createSignedToken(Date.now(), Date.now() + THIRTY_DAYS_MS, secretA);
  const verifiedWithRotatedSecretB = verifySignedToken(tokenSignedWithA, secretB);
  assert.strictEqual(
    verifiedWithRotatedSecretB,
    false,
    'Changing AUTH_SECRET must invalidate all outstanding session cookies'
  );
  console.log('  ✓ Changing AUTH_SECRET immediately invalidates existing sessions');

  // 6. Passcode independence: verify that changing SONG_RADAR_PASSCODE does not affect signed token
  console.log('\nTest 6: Passcode independence verification...');
  process.env.SONG_RADAR_PASSCODE = 'original_passcode';
  assert.strictEqual(validatePasscode('original_passcode'), true);
  assert.strictEqual(validatePasscode('wrong_passcode'), false);

  process.env.SONG_RADAR_PASSCODE = 'updated_passcode';
  assert.strictEqual(validatePasscode('updated_passcode'), true);
  // Cookie signed with secretA remains valid as long as AUTH_SECRET is unchanged
  assert.strictEqual(verifySignedToken(validToken, secretA), true);
  console.log('  ✓ Cookie signing is strictly isolated to AUTH_SECRET (not passcode)');

  // 7. Malformed / garbage tokens
  console.log('\nTest 7: Malformed and garbage token handling...');
  assert.strictEqual(verifySignedToken(''), false);
  assert.strictEqual(verifySignedToken(undefined), false);
  assert.strictEqual(verifySignedToken('not.enough.parts'), false);
  assert.strictEqual(verifySignedToken('v2.12345.67890.abcdef'), false);
  assert.strictEqual(verifySignedToken('v1.notanumber.67890.abcdef'), false);
  console.log('  ✓ Malformed tokens safely rejected');

  console.log('\n================================================================');
  console.log('🎉 ALL AUTH COOKIE & SECURITY ROTATION TESTS PASSED 100%!');
  console.log('================================================================\n');
}

runAuthCookieTests().catch((err) => {
  console.error('❌ Auth cookie test failed:', err);
  process.exit(1);
});
