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
  {
    prefix: 'event_detail',
    path: '/events/a1000000-0000-0000-0000-000000000002',
    name: 'Event Detail (/events/[id])',
  },
  {
    prefix: 'upcoming',
    path: '/upcoming',
    name: 'Upcoming Releases (/upcoming)',
  },
  {
    prefix: 'released',
    path: '/released',
    name: 'Released Catalog (/released)',
  },
];

async function captureStep3() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

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

      // Set breakpoint cookie to ensure server-side matches viewport perfectly
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
      await page.waitForTimeout(2500); // Allow data fetch, hydration, and fonts to settle

      const filename = `${pageInfo.prefix}_${vp.name}.png`;
      const localPath = path.join(OUTPUT_DIR, filename);
      const artifactPath = path.join(ARTIFACT_DIR, filename);

      await page.screenshot({ path: localPath, fullPage: false });
      fs.copyFileSync(localPath, artifactPath);

      console.log(`   Saved: ${localPath}`);
      console.log(`   Copied to artifact dir: ${artifactPath}`);

      await context.close();
    }
  }

  await browser.close();
  console.log('\n🎉 All 12 Step 3 screenshots captured and synced to artifacts successfully!');
}

captureStep3().catch(err => {
  console.error('❌ Error capturing Step 3 screenshots:', err);
  process.exit(1);
});
