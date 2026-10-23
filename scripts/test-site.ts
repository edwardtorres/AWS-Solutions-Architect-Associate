/** Verify the portfolio build, including Pages-style index redirects and offline isolation. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium } from '@playwright/test';
import { browserPath } from './lib/browser';
import { SECURITY_HEADERS } from './lib/securityHeaders';

const base = '/apps/region-builder/';
const liveUrl = process.env.SITE_URL;
if (liveUrl && new URL(liveUrl).pathname !== base) throw new Error(`SITE_URL must end in ${base}`);
const root = resolve('dist');
const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
assert.equal(JSON.parse(await readFile(resolve(root, 'manifest.webmanifest'), 'utf8')).scope, base, 'Run npm run build:site first');
const server = createServer((req, res) => {
  void (async () => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (path === `${base}index.html`) {
      res.writeHead(308, { Location: base });
      res.end();
      return;
    }
    if (!path.startsWith(base)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<!doctype html><title>Portfolio</title><h1>Portfolio</h1>');
      return;
    }
    const relative = decodeURIComponent(path.slice(base.length)) || 'index.html';
    const file = resolve(root, relative);
    if (!file.startsWith(root + sep)) { res.writeHead(400); res.end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/html' });
      res.end(await readFile(resolve(root, '404.html')));
    }
  })().catch((err: unknown) => { console.error(err); res.end(); });
});
if (!liveUrl) await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
const address = server.address();
if (!liveUrl) assert(address && typeof address === 'object');
const origin = liveUrl ? new URL(liveUrl).origin : `http://127.0.0.1:${(address as { port: number }).port}`;
const browser = await chromium.launch({ executablePath: browserPath() });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (/Content Security Policy|Refused to (load|execute|apply)/.test(m.text())) errors.push(m.text()); });
    await page.goto(origin + base);
    await page.getByRole('heading', { name: 'City map', exact: true }).waitFor({ state: 'attached' });
    const manifest = await (await page.request.get(origin + base + 'manifest.webmanifest')).json();
    assert.equal(manifest.start_url, base);
    assert(manifest.icons.every((i: { src: string }) => i.src.startsWith(base)));
    assert.equal(await page.locator('link[rel="apple-touch-icon"]').getAttribute('href'), base + 'icons/apple-touch-icon.png');
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.ready).scope), origin + base);
    await context.setOffline(true);
    await page.reload();
    await page.getByRole('heading', { name: 'City map', exact: true }).waitFor({ state: 'attached' });
    await page.goto(origin + base + '#/notes/town-charter');
    await page.getByRole('heading', { name: 'Town Charter', exact: true }).waitFor();
    await page.goto(origin + base + '#/mock');
    await page.getByRole('heading', { name: /Mock exam/i }).first().waitFor();
    await context.setOffline(false);
    const missing = await page.request.get(origin + base + 'missing-file.html');
    assert.equal(missing.status(), 404);
    assert((await missing.text()).includes(`href="${base}#/map"`));
    await page.goto(origin + '/');
    await page.getByRole('heading', { level: 1 }).waitFor();
    assert.equal(await page.evaluate(() => navigator.serviceWorker.controller), null);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`test:site OK at ${width}px: scoped assets, manifest, worker, offline map/notes/mock, Pages redirect, 404 and portfolio isolation`);
  }
} finally {
  await browser.close();
  if (server.listening) await new Promise<void>((done, fail) => server.close((e) => e ? fail(e) : done()));
}
