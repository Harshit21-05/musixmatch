import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const PAGES = [
  { path: '/', name: '01_live_feed' },
  { path: '/upcoming', name: '02_upcoming_calendar' },
  { path: '/released', name: '03_released_catalog' },
  { path: '/events/evt-1', name: '04_event_detail' },
  { path: '/tasks', name: '05_tasks_kanban' },
  { path: '/watchlist', name: '06_watchlist_monitor' },
  { path: '/health', name: '07_collector_health' },
  { path: '/settings', name: '08_settings_appearance' },
  { path: '/wall', name: '09_wall_mode' },
];

test.describe('Two First-Class UIs Quality Gates', () => {
  for (const pageInfo of PAGES) {
    test(`Capture screenshot & verify ${pageInfo.name}`, async ({ page }, testInfo) => {
      await page.goto(pageInfo.path, { waitUntil: 'networkidle' });

      // Ensure content is rendered
      await expect(page.locator('body')).toBeVisible();

      // Take and store screenshot per viewport project
      const screenshotDir = path.join(process.cwd(), 'tests', 'screenshots', testInfo.project.name);
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }

      const screenshotPath = path.join(screenshotDir, `${pageInfo.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      expect(fs.existsSync(screenshotPath)).toBeTruthy();
    });
  }

  test('Mobile shell navigation and thumb-zone verification', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'phone-390x844') return;

    await page.goto('/');
    // Check bottom navigation exists
    const bottomNav = page.locator('nav[aria-label="Mobile Navigation"]');
    await expect(bottomNav).toBeVisible();

    // Verify touch targets have at least 44px height (WCAG touch rule)
    const navButtons = bottomNav.locator('a');
    const count = await navButtons.count();
    expect(count).toBe(5);

    for (let i = 0; i < count; i++) {
      const box = await navButtons.nth(i).boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }

    // Verify Next-up card
    const nextUpCard = page.locator('text=Next Up Drop');
    await expect(nextUpCard).toBeVisible();
  });

  test('Desktop shell master-detail, sidebar, and keyboard shortcuts', async ({ page }, testInfo) => {
    if (!['laptop-1440x900', 'desktop-1920x1080'].includes(testInfo.project.name)) return;

    await page.goto('/');

    // Check sidebar brand & links
    await expect(page.locator('aside').first()).toBeVisible();
    await expect(page.locator('text=Live Drops')).toBeVisible();

    // Check master-detail view: event list + detail pane
    await expect(page.locator('text=Live Ingestion Radar')).toBeVisible();
    await expect(page.locator('text=Production Credits')).toBeVisible();

    // Test Keyboard Shortcut "?" opens Shortcuts Guide
    await page.keyboard.press('?');
    await expect(page.locator('role=dialog[name="Keyboard Shortcuts"]')).toBeVisible();
    await page.keyboard.press('Escape');

    // Test Command Palette Ctrl+K
    await page.keyboard.press('Control+k');
    await expect(page.locator('role=dialog[name="Global Search Command Palette"]')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('Desktop wide 1920x1080 right rail verification', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'desktop-1920x1080') return;

    await page.goto('/');
    // On 1920x1080, right rail with Live Radar & Health must be visible
    await expect(page.locator('text=Live Radar & Health')).toBeVisible();
    await expect(page.locator('text=Task Pipeline')).toBeVisible();
  });

  test('Dense Table in Released view with multi-select and export', async ({ page }, testInfo) => {
    if (!['laptop-1440x900', 'desktop-1920x1080'].includes(testInfo.project.name)) return;

    await page.goto('/released');
    // Check dense table header
    await expect(page.locator('th:has-text("Song Title")')).toBeVisible();
    await expect(page.locator('th:has-text("Language")')).toBeVisible();

    // Select first row checkbox
    const firstCheckbox = page.locator('tbody tr input[type="checkbox"]').first();
    await firstCheckbox.check();

    // Bulk actions bar should appear
    await expect(page.locator('text=1 selected')).toBeVisible();
    await expect(page.locator('button:has-text("Add to Tasks")')).toBeVisible();
  });
});
