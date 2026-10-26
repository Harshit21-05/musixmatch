#!/usr/bin/env node
/**
 * One-command script to delete demo seed data from Song Radar database
 * Usage: npm run db:clean-demo
 */

const { createClient } = require('@supabase/supabase-js');

async function cleanDemoData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('🧹 Song Radar: Cleaning demo data...');

  if (!supabaseUrl || !serviceKey) {
    console.log(
      '⚠️  SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL not set.\n' +
      '   To clean direct Postgres database, execute this SQL:\n\n' +
      '   DELETE FROM public.song_events WHERE is_demo = true;\n' +
      '   DELETE FROM public.entities WHERE is_demo = true;\n'
    );
    process.exit(0);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    const { count: eventsCount, error: eventsError } = await supabase
      .from('song_events')
      .delete({ count: 'exact' })
      .eq('is_demo', true);

    if (eventsError) throw eventsError;

    const { count: entitiesCount, error: entitiesError } = await supabase
      .from('entities')
      .delete({ count: 'exact' })
      .eq('is_demo', true);

    if (entitiesError) throw entitiesError;

    console.log(`✅ Cleaned ${eventsCount || 0} demo song events and ${entitiesCount || 0} demo entities successfully.`);
  } catch (err) {
    console.error('❌ Error cleaning demo data:', err.message);
    process.exit(1);
  }
}

cleanDemoData();
