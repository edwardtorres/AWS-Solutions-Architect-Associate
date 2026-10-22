import { expect, test, type Page } from '@playwright/test';
import { axeClean, noSidewaysScroll } from './helpers';

/**
 * The production build as a server sends it (scripts/serve-prod.ts): the deploy headers, the static 404 page, the service
 * worker, and a visit that works offline after the first load.
 */
const seed = () => JSON.stringify({ version: 6, updatedAt: '2026-01-01T00:00:00.000Z', buildings: {}, ui: { view: 'map', lastBuilding: null, roads: 'selected', lastExportAt: null }, game: {}, labs: {} });

async function open(page: Page, hash = '/#/map'): Promise<void> {
  await page.goto('/');
  await page.evaluate((s) => {
    localStorage.setItem('saa-region-builder:save', s);
  }, seed());
  await page.goto(hash);
  await page.reload();
}

test('the page is sent with the security headers, and the CSP raises no violations', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (msg) => {
    if (/Content Security Policy|Refused to (load|execute|connect|apply)/.test(msg.text())) violations.push(msg.text());
  });
  page.on('pageerror', (err) => violations.push(err.message));
  const response = await page.request.get('/');
  const headers = response.headers();
  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['strict-transport-security']).toBe('max-age=31536000');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toContain('camera=()');
  await open(page);
  await expect(page.locator('h2', { hasText: 'City map' })).toBeAttached();
  expect(violations).toEqual([]);
});

test('an unknown page explains itself, and a missing file gets the static 404 page', async ({ page }) => {
  await open(page, '/#/no-such-page');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Go to the city map' })).toHaveAttribute('href', '#/map');
  await axeClean(page, 'not-found page');
  await noSidewaysScroll(page);
  const missing = await page.request.get('/no-such-file.html');
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain('Page not found');
});

test('the app installs its service worker on the first visit and opens offline afterwards', async ({ page, context }) => {
  await open(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // The first load was not controlled; a reload is served by the worker.
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null), { timeout: 15_000 })
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('h2', { hasText: 'City map' })).toBeAttached();
  await expect(page.locator('#main')).toBeVisible();
  await context.setOffline(false);
});

test('the manifest links the home-screen icons and the page declares the apple touch icon', async ({ page }) => {
  await open(page);
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBe('/manifest.webmanifest');
  const manifest = (await (await page.request.get('/manifest.webmanifest')).json()) as { display: string; icons: { src: string }[] };
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.map((i) => i.src)).toEqual(expect.arrayContaining(['/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png']));
  const apple = await page.request.get('/icons/apple-touch-icon.png');
  expect(apple.status()).toBe(200);
});
