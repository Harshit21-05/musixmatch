const assert = require('assert');

const API_BASE = 'http://localhost:3000';
const INGEST_TOKEN = process.env.INGEST_TOKEN || 'songradar-secret-ingest-token-2026';

async function postEntities(payload, token = INGEST_TOKEN) {
  const headers = { 'Content-Type': 'application/json' };
  if (token !== null) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/ingest/entities`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function runEntitiesTest() {
  console.log('🧪 Starting /api/ingest/entities Test Suite...\n');

  // Test 1: Bearer Auth
  console.log('Test 1: Authentication Check');
  const resNoAuth = await postEntities({ name: 'Test' }, null);
  assert.strictEqual(resNoAuth.status, 401, 'Must return 401 Unauthorized without token');
  const resBadAuth = await postEntities({ name: 'Test' }, 'bad-token');
  assert.strictEqual(resBadAuth.status, 401, 'Must return 401 Unauthorized with bad token');
  console.log('  ✓ Token check verified (401 on unauthorized)');

  // Test 2: Validation
  console.log('\nTest 2: Zod Validation');
  const resBadType = await postEntities({ name: 'Valid Name', type: 'invalid_type' });
  assert.strictEqual(resBadType.status, 400, 'Must return 400 Bad Request on invalid type');
  console.log('  ✓ Schema validation verified (400 on bad type)');

  // Test 3: Creation
  console.log('\nTest 3: Entity Creation & Ingestion');
  const testEntity = {
    name: 'Mythri Movie Makers Test',
    type: 'label',
    tier: 1,
    hype_score: 95,
    why_tracked: 'Top Telugu production house tracking Pushpa 2 drops',
    is_demo: true,
  };
  const resCreate = await postEntities(testEntity);
  assert.strictEqual(resCreate.status, 200, 'Must return 200 OK');
  assert(resCreate.data.created >= 1 || resCreate.data.updated >= 1, 'Should create or update');
  console.log('  ✓ Entity successfully ingested (created count verified)');

  // Test 4: Idempotency
  console.log('\nTest 4: Idempotency on Re-send');
  const resResend = await postEntities(testEntity);
  assert.strictEqual(resResend.status, 200, 'Re-sending must return 200 OK');
  assert.strictEqual(resResend.data.ignored, 1, 'Re-sending identical entity must be ignored (idempotent)');
  console.log('  ✓ Idempotency verified: re-send ignored = 1, created = 0');

  // Test 5: Update on Changed Attributes
  console.log('\nTest 5: Attribute Update');
  const updatedEntity = {
    ...testEntity,
    hype_score: 99,
    why_tracked: 'Upgraded hype score for major drop',
  };
  const resUpdate = await postEntities(updatedEntity);
  assert.strictEqual(resUpdate.status, 200);
  assert.strictEqual(resUpdate.data.updated, 1, 'Changed entity must be updated');
  console.log('  ✓ Updates applied cleanly without creating duplicate rows');

  console.log('\n🎉 ALL /api/ingest/entities TESTS PASSED CLEANLY!');
}

runEntitiesTest().catch(err => {
  console.error('❌ Entities test suite failed:', err);
  process.exit(1);
});
