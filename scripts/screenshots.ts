/**
 * npm run screenshots
 * Captures the README screenshots from the production build (served with the deploy headers by scripts/serve-prod.ts) at
 * 1440 px and 390 px, into docs/screenshots/. The save is seeded in the browser only; nothing is written to the repository
 * except the PNG files. Run `npm run build` first.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type BrowserContext, type Page } from '@playwright/test';
import { BUILDINGS } from '../src/data/buildings.ts';
import { browserPath } from './lib/browser.ts';

const ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const OUT = resolve(ROOT, 'docs/screenshots');
const STORAGE_KEY = 'saa-region-builder:save';

async function freePort(): Promise<number> {
  return new Promise((ok, fail) => {
    const server = createServer();
    server.on('error', fail);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => (typeof address === 'object' && address ? ok(address.port) : fail(new Error('No free port'))));
    });
  });
}

async function waitFor(url: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not listening yet */
    }
    await new Promise((wait) => setTimeout(wait, 200));
  }
  throw new Error('The production server did not start');
}

/** A few buildings spread across the districts, commissioned in the seeded save so the map shows progress. */
const commissionedIds = (): string[] => BUILDINGS.map((b) => b.id).filter((_, i) => i % 9 === 0).slice(0, 6);

/** The save the screenshots start from. */
function seedSave(): string {
  const now = new Date().toISOString();
  const buildings = Object.fromEntries(commissionedIds().map((id) => [id, { state: 'commissioned', changedAt: now }]));
  return JSON.stringify({
    version: 6,
    updatedAt: now,
    buildings,
    ui: { view: 'map', lastBuilding: null, roads: 'selected', lastExportAt: now },
    game: {},
    labs: {},
  });
}

async function open(context: BrowserContext, baseUrl: string, hash: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(baseUrl);
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, seedSave()] as const);
  await page.goto(`${baseUrl}${hash}`);
  // A hash change does not reload the app, so reload to read the seeded save, then let fonts and the map settle.
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
  return page;
}

async function main(): Promise<void> {
  const port = await freePort();
  const server: ChildProcess = spawn('npx', ['tsx', 'scripts/serve-prod.ts', '--port', String(port)], {
    cwd: ROOT,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  const baseUrl = `http://localhost:${port}/`;
  const browser = await chromium.launch({ executablePath: browserPath() });
  try {
    await waitFor(baseUrl);
    await mkdir(OUT, { recursive: true });
    const notesFor = commissionedIds()[0] ?? BUILDINGS[0]!.id;

    const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const map = await open(desktop, baseUrl, '#/map');
    await map.screenshot({ path: resolve(OUT, 'desktop-map.png') });
    const notes = await open(desktop, baseUrl, `#/notes/${notesFor}`);
    await notes.screenshot({ path: resolve(OUT, 'desktop-notes.png') });
    await desktop.close();

    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const phoneMap = await open(phone, baseUrl, '#/map');
    await phoneMap.screenshot({ path: resolve(OUT, 'phone-map.png') });
    await phoneMap.getByText('Settings', { exact: true }).tap();
    await phoneMap.getByTestId('save-protection').waitFor();
    await phoneMap.getByTestId('save-protection').screenshot({ path: resolve(OUT, 'phone-save-protection.png') });
    await phone.close();
    console.log(`wrote 4 screenshots to ${OUT}`);
  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
