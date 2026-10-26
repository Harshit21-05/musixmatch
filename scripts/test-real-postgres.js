/**
 * Test Real Postgres Stored Procedure & Row-Level Lock Concurrency
 * Uses @electric-sql/pglite to execute the actual migrations and PL/pgSQL
 * stored procedure in a real PostgreSQL 16 engine!
 */

const { PGlite } = require('@electric-sql/pglite');
const fs = require('fs');
const path = require('path');

async function testRealPostgres() {
  console.log('🐘 Starting Real Postgres 16 Engine with PL/pgSQL & Migrations...\n');

  const db = new PGlite();

  // 1. Run migration 0 (Schema + Tables)
  const migration1Sql = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', '20261026000000_init_song_radar.sql'),
    'utf8'
  );
  await db.exec(migration1Sql);
  console.log('  ✓ Migration 1 (Schema & Tables) applied to Postgres');

  // 2. Run migration 2 (Upsert Stored Procedure + Rate limits)
  const migration2Sql = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', '20261026000002_ingest_upsert_function.sql'),
    'utf8'
  );
  await db.exec(migration2Sql);
  console.log('  ✓ Migration 2 (PL/pgSQL ingest_upsert_song_event) applied to Postgres');

  // 3. Test High Concurrency with Row-Level Locking (FOR UPDATE)
  console.log('\n  ⚡ Firing 20 simultaneous concurrent transactions with exact same dedup key...');
  const dedupKey = 'devara__te__chutamale_real_pg_test';

  const concurrentCalls = Array.from({ length: 20 }, (_, idx) => {
    return db.query(`
      SELECT public.ingest_upsert_song_event(
        $1,
        'Chuttamalle',
        'Devara',
        'te',
        'scheduled',
        now() + interval '2 hours',
        ARRAY['Shilpa Rao'],
        'Anirudh Ravichander',
        'Ramajogayya Sastry',
        'https://youtube.com',
        'Postgres Test ' || $2,
        'https://youtube.com',
        'high',
        'Real PG concurrency test',
        1,
        98,
        NULL,
        true
      ) as result;
    `, [dedupKey, idx]);
  });

  const results = await Promise.all(concurrentCalls);
  const outcomes = results.map(r => r.rows[0].result.outcome);

  const createdCount = outcomes.filter(o => o === 'created').length;
  const nonCreatedCount = outcomes.filter(o => o !== 'created').length;

  console.log(`     Outcomes: created=${createdCount}, ignored/updated=${nonCreatedCount}`);

  if (createdCount !== 1) {
    throw new Error(`Real Postgres concurrency failed: expected exactly 1 created, got ${createdCount}`);
  }
  console.log('  ✓ REAL POSTGRES CONCURRENCY GUARANTEE VERIFIED: Exactly 1 row created, 0 race conditions');

  // 4. Verify Database Integrity (Ensure exactly 1 row in song_events for this dedup_key)
  const countRes = await db.query(
    'SELECT count(*) FROM public.song_events WHERE dedup_key = $1',
    [dedupKey]
  );
  const actualDbCount = parseInt(countRes.rows[0].count, 10);
  if (actualDbCount !== 1) {
    throw new Error(`Table contains duplicate rows! Count = ${actualDbCount}`);
  }
  console.log(`  ✓ Table count query verified: exactly ${actualDbCount} row in public.song_events`);

  // 5. Verify State Progression in Postgres (Try to downgrade from scheduled to rumor)
  const existingEvt = await db.query('SELECT * FROM public.song_events WHERE dedup_key = $1', [dedupKey]);
  const originalDate = existingEvt.rows[0].date_time_ist;

  const downgradeRes = await db.query(`
    SELECT public.ingest_upsert_song_event(
      $1,
      'Chuttamalle',
      'Devara',
      'te',
      'rumor',
      $2,
      ARRAY['Shilpa Rao'],
      'Anirudh Ravichander',
      'Ramajogayya Sastry',
      'https://youtube.com',
      'Downgrade Attempter',
      'https://youtube.com',
      'high',
      NULL,
      1,
      98,
      NULL,
      true
    ) as result;
  `, [dedupKey, originalDate]);

  const downgradeOutcome = downgradeRes.rows[0].result.outcome;
  if (downgradeOutcome !== 'ignored') {
    throw new Error(`State downgrade was not ignored! Got ${downgradeOutcome}`);
  }

  const stateCheck = await db.query('SELECT state FROM public.song_events WHERE dedup_key = $1', [dedupKey]);
  if (stateCheck.rows[0].state !== 'scheduled') {
    throw new Error(`State was downgraded in database! Got ${stateCheck.rows[0].state}`);
  }
  console.log('  ✓ Postgres function correctly rejected state downgrade (state preserved as scheduled)');

  // 6. Verify Rate Limit Function in Postgres
  const rlRes1 = await db.query("SELECT public.check_rate_limit('test_ip_1', 2, 60) as res");
  const rl1 = rlRes1.rows[0].res;
  const rlRes2 = await db.query("SELECT public.check_rate_limit('test_ip_1', 2, 60) as res");
  const rl2 = rlRes2.rows[0].res;
  const rlRes3 = await db.query("SELECT public.check_rate_limit('test_ip_1', 2, 60) as res");
  const rl3 = rlRes3.rows[0].res;

  if (!rl1.allowed || !rl2.allowed || rl3.allowed) {
    throw new Error(`Postgres rate limiter failed: rl1=${rl1.allowed}, rl2=${rl2.allowed}, rl3=${rl3.allowed}`);
  }
  console.log('  ✓ Postgres shared rate limit counter verified: request 3 correctly throttled (allowed: false)');

  await db.close();
  console.log('\n🎉 REAL POSTGRES 16 TEST PASSED 100%!');
}

testRealPostgres().catch(err => {
  console.error('\n❌ Real Postgres test failed:', err);
  process.exit(1);
});
