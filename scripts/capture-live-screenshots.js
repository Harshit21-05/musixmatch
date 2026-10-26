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

async function capture() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    console.log(`📸 Capturing ${vp.name}...`);
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
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000); // Allow fonts and layout to settle

    const filename = `live_${vp.name}.png`;
    const localPath = path.join(OUTPUT_DIR, filename);
    const artifactPath = path.join(ARTIFACT_DIR, filename);

    await page.screenshot({ path: localPath, fullPage: false });
    fs.copyFileSync(localPath, artifactPath);

    console.log(`   Saved: ${localPath}`);
    console.log(`   Copied to artifact dir: ${artifactPath}`);

    await context.close();
  }

  await browser.close();
  console.log('✅ All screenshots captured successfully.');
}

capture().catch(err => {
  console.error('❌ Error capturing screenshots:', err);
  process.exit(1);
});
