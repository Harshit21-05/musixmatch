const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\harsh\\.gemini\\antigravity\\brain\\692717e5-2345-410c-9419-a82eb2f1932d';
const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'screenshots');

const VIEWPORTS = [
  {
    name: '390x844',
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    breakpoint: 'mobile',
  },
  {
    name: '768x1024',
    width: 768,
    height: 1024,
    isMobile: false,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)',
    breakpoint: 'tablet',
  },
  {
    name: '1440x900',
    width: 1440,
    height: 900,
    isMobile: false,
    hasTouch: false,
    breakpoint: 'desktop',
  },
  {
    name: '1920x1080',
    width: 1920,
    height: 1080,
    isMobile: false,
    hasTouch: false,
    breakpoint: 'wide',
  },
];

const PAGES = [
  { prefix: 'tasks', path: '/tasks', name: 'Personal Pipeline Tasks (/tasks)' },
  { prefix: 'watchlist', path: '/watchlist', name: 'Discovered Watchlist (/watchlist)' },
  { prefix: 'health', path: '/health', name: 'System Telemetry & Health (/health)' },
  { prefix: 'settings', path: '/settings', name: 'Settings & Preferences (/settings)' },
];

function parsePNGDimensions(buffer) {
  const sig = buffer.slice(0, 8);
  const isPNG = sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4e && sig[3] === 0x47;
  if (!isPNG) return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

async function captureStep4() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const capturedFiles = [];

  for (const pageInfo of PAGES) {
    console.log(`\n========================================`);
    console.log(`📄 Capturing Page: ${pageInfo.name}`);
    console.log(`========================================`);

    for (const vp of VIEWPORTS) {
      console.log(`📸 Viewport: ${vp.name} (${vp.breakpoint})...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch,
        userAgent: vp.userAgent,
      });

      // Authenticate context with passcode gate
      const authRes = await context.request.post('http://localhost:3000/api/auth/verify', {
        data: { passcode: 'songradar2026' },
      });
      if (!authRes.ok()) {
        console.warn(`   ⚠️ Auth verify returned status: ${authRes.status()}`);
      }

      // Set breakpoint cookie to ensure server matches viewport
      await context.addCookies([
        {
          name: 'mxm_breakpoint',
          value: vp.breakpoint,
          domain: 'localhost',
          path: '/',
        },
      ]);

      const page = await context.newPage();
      const url = `http://localhost:3000${pageInfo.path}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(2500); // Allow fonts, data, and layout to settle

      const filename = `${pageInfo.prefix}_${vp.name}.png`;
      const localPath = path.join(OUTPUT_DIR, filename);
      const artifactPath = path.join(ARTIFACT_DIR, filename);

      await page.screenshot({ path: localPath, fullPage: false });
      fs.copyFileSync(localPath, artifactPath);

      capturedFiles.push({ filename, localPath, artifactPath, vp });
      console.log(`   Saved: ${localPath}`);

      await context.close();
    }
  }

  await browser.close();

  // Verification step: verify non-blank, valid PNG headers, entropy
  console.log(`\n🔍 Verifying all ${capturedFiles.length} captured screenshots...`);
  for (const item of capturedFiles) {
    const buf = fs.readFileSync(item.localPath);
    const dims = parsePNGDimensions(buf);

    if (!dims) {
      throw new Error(`File ${item.filename} is not a valid PNG!`);
    }

    if (buf.length < 5000) {
      throw new Error(`File ${item.filename} is too small (${buf.length} bytes), possible blank!`);
    }

    const sampleBytes = buf.slice(100, Math.min(buf.length, 5000));
    const uniqueBytes = new Set(sampleBytes);
    if (uniqueBytes.size < 30) {
      throw new Error(`File ${item.filename} has low entropy, likely blank!`);
    }

    console.log(`  ✓ ${item.filename.padEnd(25)} ${dims.width}x${dims.height} (${(buf.length / 1024).toFixed(1)} KB, verified non-blank)`);
  }

  console.log('\n🎉 ALL 16 STEP 4 SCREENSHOTS CAPTURED, VERIFIED, AND SYNCED SUCCESSFULLY!');
}

captureStep4().catch(err => {
  console.error('❌ Error during Step 4 capture:', err);
  process.exit(1);
});
