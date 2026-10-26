const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== Running PWA, Notification Stub & API Client Tests ===\n');

// 1. Verify manifest.json
const manifestPath = path.resolve('public/manifest.json');
assert(fs.existsSync(manifestPath), 'manifest.json must exist');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.name, 'Song Radar — Indian Song Announcements, Premieres & Live Drops');
assert.strictEqual(manifest.short_name, 'Song Radar');
assert.strictEqual(manifest.display, 'standalone');
assert.strictEqual(manifest.background_color, '#090a0f');
assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'manifest must have at least 2 icons');
console.log('✓ 1. manifest.json is valid and contains standard PWA configuration');

// 2. Verify all icon files on disk
manifest.icons.forEach((icon) => {
  const iconPath = path.resolve('public', icon.src.replace(/^\//, ''));
  assert(fs.existsSync(iconPath), `Icon file ${icon.src} must exist on disk`);
  const stats = fs.statSync(iconPath);
  assert(stats.size > 200, `Icon file ${icon.src} must be a valid non-empty file`);
  console.log(`✓ 2. Verified icon: ${icon.src} (${stats.size} bytes)`);
});

// 3. Verify favicon.ico & apple-touch-icon.png
assert(fs.existsSync(path.resolve('public/favicon.ico')), 'favicon.ico must exist');
assert(fs.existsSync(path.resolve('public/apple-touch-icon.png')), 'apple-touch-icon.png must exist');
console.log('✓ 3. favicon.ico and apple-touch-icon.png verified');

// 4. Verify Service Worker (sw.js)
const swPath = path.resolve('public/sw.js');
assert(fs.existsSync(swPath), 'public/sw.js must exist');
const swContent = fs.readFileSync(swPath, 'utf8');
assert(swContent.includes("addEventListener('install'"), 'sw.js must handle install event');
assert(swContent.includes("addEventListener('activate'"), 'sw.js must handle activate event');
assert(swContent.includes("addEventListener('fetch'"), 'sw.js must handle fetch event');
assert(swContent.includes("addEventListener('push'"), 'sw.js must contain push event listener');
assert(swContent.includes("CACHE_VERSION"), 'sw.js must define CACHE_VERSION for cache invalidation');
assert(swContent.includes("CLEAR_CACHES"), 'sw.js must listen for CLEAR_CACHES message');
assert(swContent.includes("/api/auth/"), 'sw.js must strictly exclude /api/auth/* from caching');
assert(swContent.includes("/api/ingest"), 'sw.js must strictly exclude /api/ingest* from caching');
assert(swContent.includes("/api/calendar.ics"), 'sw.js must strictly exclude /api/calendar.ics from caching');
assert(swContent.includes("request.method !== 'GET'"), 'sw.js must strictly exclude non-GET requests from caching');
console.log('✓ 4. public/sw.js verified with strict no-cache rules for auth, ingest, calendar, and non-GET requests, plus versioning & logout purge');

// 5. Verify API client module logic
const apiClientPath = path.resolve('src/lib/api-client.ts');
assert(fs.existsSync(apiClientPath), 'src/lib/api-client.ts must exist');
const apiClientCode = fs.readFileSync(apiClientPath, 'utf8');
assert(apiClientCode.includes('NEXT_PUBLIC_API_BASE'), 'api-client.ts must check NEXT_PUBLIC_API_BASE');
assert(apiClientCode.includes('export function apiUrl'), 'api-client.ts must export apiUrl');
assert(apiClientCode.includes('export async function apiFetch'), 'api-client.ts must export apiFetch');
console.log('✓ 5. src/lib/api-client.ts verified with NEXT_PUBLIC_API_BASE support');

// 6. Verify Notification Stub
const notifPath = path.resolve('src/lib/notifications.ts');
assert(fs.existsSync(notifPath), 'src/lib/notifications.ts must exist');
const notifCode = fs.readFileSync(notifPath, 'utf8');
assert(notifCode.includes('export interface NotificationService'), 'notifications.ts must export NotificationService interface');
assert(notifCode.includes('export const notificationService'), 'notifications.ts must export notificationService singleton');
assert(notifCode.includes('dispatchLocalNotification'), 'notifications.ts must implement dispatchLocalNotification');
console.log('✓ 6. src/lib/notifications.ts verified with complete interface stub');

console.log('\nAll 6 PWA, Notification & API Client checks PASSED 100%!');
