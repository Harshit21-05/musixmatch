const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const SIZES = [
  { name: '390x844', width: 390, height: 844 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
];

const ARTIFACT_DIR = path.resolve('C:/Users/harsh/.gemini/antigravity/brain/692717e5-2345-410c-9419-a82eb2f1932d');

async function capture() {
  const browser = await chromium.launch({ headless: true });
  console.log('Capturing Wall Mode screenshots at 4 resolutions...');

  for (const size of SIZES) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      baseURL: 'http://localhost:3000',
    });

    // Authenticate with passcode
    try {
      await context.request.post('/api/auth/verify', {
        data: { passcode: 'songradar2026' },
      });
    } catch (e) {
      console.warn('Auth request failed:', e.message);
    }

    const page = await context.newPage();
    await page.goto('/wall', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const filename = `wall_${size.name}.png`;
    const outputPath = path.join(ARTIFACT_DIR, filename);

    await page.screenshot({ path: outputPath, fullPage: false });
    const stats = fs.statSync(outputPath);
    console.log(`✓ Saved ${filename} (${stats.size} bytes)`);

    await context.close();
  }

  await browser.close();
  console.log('Finished capturing Wall Mode screenshots.');
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
