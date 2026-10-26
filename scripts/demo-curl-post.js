const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\harsh\\.gemini\\antigravity\\brain\\692717e5-2345-410c-9419-a82eb2f1932d';
const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'screenshots');
const INGEST_TOKEN = process.env.INGEST_TOKEN || 'songradar-secret-ingest-token-2026';

async function demonstrateLiveDrop() {
  console.log('🚀 Demonstrating Live Page updating from curl / Ingest POST...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  console.log('📡 Sending curl Ingest POST with surprise drop: Daavudi (Telugu)...');

  // Ingest Surprise Drop
  const payload = {
    song_title: 'Daavudi (Mass Dance Drop)',
    movie_or_artist: 'Devara: Part 1',
    language: 'te',
    state: 'unannounced_drop',
    date_time_ist: new Date().toISOString(),
    singers: ['Nakash Aziz', 'Akasa'],
    music_director: 'Anirudh Ravichander',
    lyricist: 'Ramajogayya Sastry',
    link: 'https://www.youtube.com/watch?v=mock_daavudi_live',
    source: 'T-Series Telugu Ingestion Webhook',
    source_url: 'https://youtube.com',
    confidence: 'high',
    raw_note: 'Unannounced high-energy dance drop featuring Jr NTR & Janhvi Kapoor.',
    tier: 1,
    hype_score: 99,
  };

  const response = await fetch('http://localhost:3000/api/ingest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${INGEST_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  const resJson = await response.json();
  console.log('📥 Ingest API response:', resJson);

  // Allow live feed to poll/receive update and trigger highlight
  await page.waitForTimeout(2000);

  // Take screenshot showing updated live feed
  const filename = 'live_after_curl_ingest.png';
  const localPath = path.join(OUTPUT_DIR, filename);
  const artifactPath = path.join(ARTIFACT_DIR, filename);

  await page.screenshot({ path: localPath, fullPage: false });
  fs.copyFileSync(localPath, artifactPath);

  console.log(`📸 Screenshot captured after ingest: ${localPath}`);
  console.log(`   Copied to artifact dir: ${artifactPath}`);

  await browser.close();
  console.log('✅ Demonstration completed successfully.');
}

demonstrateLiveDrop().catch(err => {
  console.error('❌ Demonstration failed:', err);
  process.exit(1);
});
