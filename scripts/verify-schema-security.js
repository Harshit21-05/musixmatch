const { PGlite } = require('@electric-sql/pglite');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function testSchemaSecurity() {
  console.log('🐘 Initializing Postgres 16 Engine to verify Function Privileges & Table RLS...\n');

  const db = new PGlite();

  // Create standard Supabase roles if they don't exist
  await db.query(`
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
  `);

  // Load and apply all migrations in order
  const migrations = [
    '20261026000000_init_song_radar.sql',
    '20261026000001_seed_song_radar.sql',
    '20261026000002_ingest_upsert_function.sql',
    '20261026000003_secure_function_privileges.sql',
  ];

  for (const m of migrations) {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', m), 'utf8');
    await db.exec(sql);
    console.log(`  ✓ Applied migration: ${m}`);
  }

  // Test ALTER DEFAULT PRIVILEGES: Create a new function after migration 3 to prove default privileges apply
  await db.query(`
    CREATE OR REPLACE FUNCTION public.test_future_default_privileges()
    RETURNS TEXT LANGUAGE sql AS $$ SELECT 'future_secure'::text $$;
  `);
  console.log('  ✓ Created test_future_default_privileges() to verify ALTER DEFAULT PRIVILEGES');

  console.log('\n--- 1. Querying has_function_privilege for anon on all public functions ---');
  const funcQuery = `
    SELECT 
      p.proname,
      has_function_privilege('anon', p.oid, 'execute') AS anon_can_execute,
      has_function_privilege('service_role', p.oid, 'execute') AS service_role_can_execute
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY p.proname;
  `;

  const funcResults = await db.query(funcQuery);
  console.table(funcResults.rows);

  assert(funcResults.rows.length > 0, 'Must have public functions registered');
  for (const row of funcResults.rows) {
    assert.strictEqual(
      row.anon_can_execute,
      false,
      `Security violation: Role 'anon' must NOT have execute privilege on public.${row.proname}`
    );
    assert.strictEqual(
      row.service_role_can_execute,
      true,
      `Service role must have execute privilege on public.${row.proname}`
    );
  }
  console.log('✓ VERIFIED: All public functions return anon_can_execute = FALSE!');

  console.log('\n--- 2. Querying rowsecurity for all tables in public schema ---');
  const tableQuery = `
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `;

  const tableResults = await db.query(tableQuery);
  console.table(tableResults.rows);

  assert(tableResults.rows.length >= 8, 'All 8 public tables must be present');
  for (const row of tableResults.rows) {
    assert.strictEqual(
      row.rowsecurity,
      true,
      `Security violation: Table public.${row.tablename} must have rowsecurity = true (RLS enabled)`
    );
  }
  console.log('✓ VERIFIED: All public tables have rowsecurity = TRUE (RLS strictly enabled)!');

  console.log('\n🎉 POSTGRES MIGRATION 3 & RLS SECURITY VERIFICATION PASSED 100%!');
}

testSchemaSecurity().catch((err) => {
  console.error('\n❌ Security verification failed:', err);
  process.exit(1);
});
