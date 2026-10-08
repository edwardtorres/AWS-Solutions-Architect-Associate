/**
 * npm run test:layout
 * Builds nothing: run `npm run build` first. Serves dist/ with `vite preview` (so the production CSP
 * applies) and drives it with Chromium at phone (390 px, touch) and desktop widths.
 * Set SCREENSHOT_DIR to keep screenshots (default: none). Set CHROMIUM_PATH to use a specific browser.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { BUILDINGS } from '../src/data/buildings.ts';
import { FAMILIES } from '../src/data/families.ts';
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';

const PORT = 4173;
const BASE = `http://localhost:${PORT}/`;
const SHOTS = process.env.SCREENSHOT_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const failures: string[] = [];
let checks = 0;
function check(ok: boolean, label: string, detail = ''): void {
  checks += 1;
  if (!ok) failures.push(`${label}${detail ? `: ${detail}` : ''}`);
}

async function startServer(): Promise<() => void> {
  const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', 'localhost'], { stdio: 'ignore' });
  const deadline = Date.now() + 30_000;
  for (;;) {
    try {
      const res = await fetch(BASE);
      if (res.ok) break;
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) {
      proc.kill();
      throw new Error('vite preview did not start');
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return () => {
    proc.kill();
  };
}

function browserPath(): string | undefined {
  const fromEnv = process.env.CHROMIUM_PATH;
  if (fromEnv) return fromEnv;
  const fallback = '/opt/pw-browsers/chromium';
  return existsSync(fallback) && statSync(fallback).isFile() ? fallback : undefined;
}

const V1 = (extra: Record<string, unknown>) =>
  JSON.stringify({ version: 1, updatedAt: '2026-01-01T00:00:00.000Z', buildings: {}, ui: { view: 'map', lastBuilding: null, roads: 'selected' }, ...extra });

async function newPage(browser: Browser, opts: { mobile: boolean; save?: string }): Promise<{ page: Page; ctx: BrowserContext; errors: string[] }> {
  const ctx = await browser.newContext(
    opts.mobile
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
      : { viewport: { width: 1280, height: 800 } },
  );
  if (opts.save !== undefined) {
    const save = opts.save;
    await ctx.addInitScript((s) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('saa-region-builder:save', s);
        sessionStorage.setItem('seeded', '1');
      }
    }, save);
  }
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return { page, ctx, errors };
}

async function overflow(page: Page): Promise<{ doc: number; win: number; body: number }> {
  return page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    win: window.innerWidth,
    body: document.body.scrollWidth,
  }));
}

async function shot(page: Page, name: string): Promise<void> {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
}

async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const els = document.querySelectorAll<HTMLElement>('button, a[href], input:not([type=file]), select, textarea, summary');
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (el.closest('[inert]') || el.classList.contains('skip-link')) return;
      const tooShort = r.height < 43.5;
      const tooNarrow = el.tagName === 'BUTTON' && r.width < 43.5;
      if (tooShort || tooNarrow) out.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 40)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    });
    return out;
  });
}

async function phone(browser: Browser): Promise<void> {
  const save = V1({
    buildings: {
      'safe-harbor-account': { state: 'commissioned', changedAt: '2026-01-01T00:00:00.000Z' },
      'pillar-plaza': { state: 'commissioned', changedAt: '2026-01-01T00:00:00.000Z' },
      'identity-keep': { state: 'under_construction', changedAt: '2026-01-01T00:00:00.000Z' },
    },
  });
  const { page, ctx, errors } = await newPage(browser, { mobile: true, save });
  await page.goto(BASE);
  await page.waitForSelector('.building');

  const o = await overflow(page);
  check(o.doc <= o.win && o.body <= o.win, '390px map has no page-level sideways scroll', JSON.stringify(o));
  check((await page.locator('.building').count()) === BUILDINGS.length, `${BUILDINGS.length} buildings render`);
  check((await page.locator('section[data-district]').count()) === 5, '5 district sections (square + 4)');
  const states = await page.$$eval('.building', (els) => new Set(els.map((e) => e.getAttribute('data-state'))).size);
  check(states === 4, 'all four building states are visible', `saw ${states}`);
  check((await page.locator('[data-building="identity-keep"]').getAttribute('data-state')) === 'under_construction', 'stored progress shows as under construction');
  check((await page.locator('[data-building="ledger-office"]').getAttribute('data-state')) === 'surveyed', 'prerequisites commissioned makes a building surveyed');
  check((await page.locator('[data-building="gatehouse"]').getAttribute('data-state')) === 'planned', 'unmet prerequisites keep a building planned');
  check((await smallTargets(page)).length === 0, 'map targets are at least 44px', (await smallTargets(page)).slice(0, 5).join('; '));
  await shot(page, 'phone-map');

  // Tap a building: bottom sheet opens, no sideways scroll, Esc/close works.
  await page.locator('[data-building="gatehouse"]').scrollIntoViewIfNeeded();
  await page.locator('[data-building="gatehouse"]').tap();
  await page.waitForSelector('dialog[open]');
  check(page.url().endsWith('#/map/gatehouse'), 'tap opens the panel and updates the hash', page.url());
  const dlg = await page.evaluate(() => {
    const d = document.querySelector('dialog[open]') as HTMLElement;
    const r = d.getBoundingClientRect();
    return { w: Math.round(r.width), scrollW: d.scrollWidth, clientW: d.clientWidth, left: Math.round(r.left), right: Math.round(r.right), vw: window.innerWidth };
  });
  check(dlg.scrollW <= dlg.clientW && dlg.left >= 0 && dlg.right <= dlg.vw, 'panel fits 390px with no sideways scroll', JSON.stringify(dlg));
  check((await page.locator('dialog[open] h2').innerText()) === 'Gatehouse', 'panel shows the themed name');
  check((await page.locator('dialog[open]').innerText()).includes('Designing VPC architectures with security components'), 'panel lists the verbatim bullets');
  check((await page.locator('dialog[open]').innerText()).includes('Open the study notes'), 'panel links to the study notes');
  check((await smallTargets(page)).length === 0, 'panel targets are at least 44px', (await smallTargets(page)).slice(0, 5).join('; '));
  await shot(page, 'phone-panel');
  // Follow a prerequisite road inside the panel.
  await page.locator('dialog[open] a', { hasText: "Grid Planning Office" }).first().tap();
  await page.waitForFunction(() => document.querySelector('dialog[open] h2')?.textContent === 'Grid Planning Office');
  check(true, 'panel links follow prerequisite roads');
  await page.locator('dialog[open] button[aria-label="Close building details"]').tap();
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  check(page.url().endsWith('#/map'), 'closing returns to the map');

  // Atlas.
  await page.locator('a[href="#/atlas"]').tap();
  await page.waitForSelector('#family-storage');
  const oa = await overflow(page);
  check(oa.doc <= oa.win && oa.body <= oa.win, '390px atlas has no page-level sideways scroll', JSON.stringify(oa));
  check((await page.locator('section[id^="family-"]').count()) === FAMILIES.length, `atlas shows ${FAMILIES.length} service families`);
  check((await smallTargets(page)).length === 0, 'atlas targets are at least 44px', (await smallTargets(page)).slice(0, 5).join('; '));
  await shot(page, 'phone-atlas');
  await page.locator('#family-storage a', { hasText: 'Cold Cellar' }).first().tap();
  await page.waitForSelector('dialog[open]');
  check(page.url().endsWith('#/atlas/cold-cellar'), 'atlas building opens the same panel');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));

  // Save menu: export triggers a download of valid JSON.
  await page.locator('a[href="#/map"]').tap();
  await page.locator('summary', { hasText: 'Save and backup' }).tap();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export backup' }).tap()]);
  const stream = await download.createReadStream();
  const text = await new Promise<string>((resolve) => {
    let s = '';
    stream.on('data', (c: Buffer) => {
      s += c.toString();
    });
    stream.on('end', () => {
      resolve(s);
    });
  });
  const exported = JSON.parse(text) as { app: string; save: { version: number; buildings: Record<string, unknown> } };
  check(exported.app === 'saa-region-builder' && exported.save.version === 1 && Object.keys(exported.save.buildings).length === 3, 'export downloads a valid v1 backup');

  check(errors.length === 0, 'no console errors, warnings or CSP violations on phone', errors.slice(0, 3).join(' | '));
  await ctx.close();
}

async function notesPages(browser: Browser): Promise<void> {
  const { page, ctx, errors } = await newPage(browser, { mobile: true });
  const routes: [string, string][] = [
    ['#/notes/gatehouse', 'Gatehouse'],
    ['#/notes/embassy-row', 'Embassy Row'],
    ['#/notes/surveyors-grid', "Surveyor's Grid"],
    ['#/glossary', 'Glossary'],
    ['#/confuse', 'Don’t confuse'],
  ];
  for (const [hash, heading] of routes) {
    await page.goto(`${BASE}${hash}`);
    await page.waitForFunction((h) => [...document.querySelectorAll('h2')].some((e) => e.textContent?.startsWith(h)), heading);
    await page.waitForSelector('#sources-h');
    const o = await overflow(page);
    check(o.doc <= o.win && o.body <= o.win, `390px ${hash} has no page-level sideways scroll`, JSON.stringify(o));
    const small = await smallTargets(page);
    check(small.length === 0, `${hash} targets are at least 44px`, small.slice(0, 5).join('; '));
    const wide = await page.evaluate(() => [...document.querySelectorAll('pre')].filter((p) => p.scrollWidth > p.clientWidth + 1).length);
    check(wide === 0, `${hash} code blocks wrap instead of scrolling sideways`, String(wide));
    const markers = await page.locator('sup').count();
    check(markers > 0, `${hash} shows citation markers`, String(markers));
  }
  await page.goto(`${BASE}#/notes/gatehouse`);
  await page.waitForSelector('#sources-h');
  await shot(page, 'phone-notes');
  const href = await page.locator('#sources-h ~ ol a').first().getAttribute('href');
  check(!!href && /^https:\/\/(docs\.aws\.amazon\.com|aws\.amazon\.com|learn\.microsoft\.com)\//.test(href), 'source links point at allowed sites', String(href));
  check(errors.length === 0, 'no console errors on notes pages', errors.slice(0, 3).join(' | '));
  await ctx.close();
}

async function keyboard(browser: Browser): Promise<void> {
  const { page, ctx, errors } = await newPage(browser, { mobile: false });
  await page.goto(BASE);
  await page.waitForSelector('.building');
  // Tab to the first building (skip link, nav links, district buttons come first).
  let focused = '';
  for (let i = 0; i < 40 && !focused.startsWith('building:'); i += 1) {
    await page.keyboard.press('Tab');
    focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el?.classList.contains('building') ? `building:${el.dataset.building}` : (el?.tagName ?? '');
    });
  }
  check(focused === 'building:pillar-plaza', 'Tab reaches the first building', focused);
  await page.keyboard.press('Enter');
  await page.waitForSelector('dialog[open]');
  const inside = await page.evaluate(() => document.querySelector('dialog[open]')?.contains(document.activeElement) ?? false);
  check(inside, 'focus moves into the panel on Enter');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  check(page.url().endsWith('#/map'), 'Escape closes the panel');
  const back = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.building ?? '');
  check(back === 'pillar-plaza', 'focus returns to the building after closing', back);
  // Space also activates a building.
  await page.keyboard.press('Space');
  await page.waitForSelector('dialog[open]');
  check(true, 'Space opens a building too');
  await page.keyboard.press('Escape');
  check(errors.length === 0, 'no console errors on keyboard run', errors.slice(0, 3).join(' | '));
  await ctx.close();
}

async function desktop(browser: Browser): Promise<void> {
  const { page, ctx, errors } = await newPage(browser, { mobile: false });
  await page.goto(`${BASE}#/map/gatehouse`);
  await page.waitForSelector('dialog[open]');
  check((await page.locator('dialog[open] h2').innerText()) === 'Gatehouse', 'deep link opens the panel on load');
  const rect = await page.evaluate(() => {
    const r = (document.querySelector('dialog[open]') as HTMLElement).getBoundingClientRect();
    return { left: Math.round(r.left), width: Math.round(r.width), vw: window.innerWidth };
  });
  check(rect.left > 300 && rect.width <= 520, 'desktop panel is a right-hand side panel', JSON.stringify(rect));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  const o = await overflow(page);
  check(o.doc <= o.win && o.body <= o.win, '1280px map has no sideways scroll', JSON.stringify(o));

  await page.locator('[data-building="gatehouse"]').hover();
  await page.waitForFunction(() => document.querySelectorAll('svg[aria-hidden] path').length > 0);
  const paths = await page.locator('svg[aria-hidden] path').count();
  check(paths >= 3, 'hovering a building draws its roads', `paths=${paths}`);
  await shot(page, 'desktop-map-hover');

  await page.getByRole('button', { name: 'Show all roads' }).click();
  await page.waitForFunction(() => document.querySelectorAll('svg[aria-hidden] path').length > 50);
  check(true, 'all-roads toggle draws every road');
  await shot(page, 'desktop-map-all-roads');
  await page.getByRole('button', { name: 'Showing all roads' }).click();

  await page.locator('[data-building="cold-cellar"]').click();
  await page.waitForSelector('dialog[open]');
  await shot(page, 'desktop-panel');
  await page.keyboard.press('Escape');
  check(errors.length === 0, 'no console errors on desktop', errors.slice(0, 3).join(' | '));
  await ctx.close();
}

async function saves(browser: Browser): Promise<void> {
  const future = JSON.stringify({ version: 99, mystery: true });
  const a = await newPage(browser, { mobile: false, save: future });
  await a.page.goto(BASE);
  await a.page.waitForSelector('.building');
  check((await a.page.locator('[role=status]').first().innerText()).includes('newer version'), 'future-version save shows a read-only notice');
  await a.page.locator('[data-building="pillar-plaza"]').click();
  await a.page.keyboard.press('Escape');
  const kept = await a.page.evaluate(() => localStorage.getItem('saa-region-builder:save'));
  check(kept === future, 'future-version save is never overwritten');
  await a.ctx.close();

  const b = await newPage(browser, { mobile: false, save: '{broken' });
  await b.page.goto(BASE);
  await b.page.waitForSelector('.building');
  check((await b.page.locator('[role=status]').first().innerText()).includes('could not be read'), 'corrupt save shows a recovery notice');
  const copy = await b.page.evaluate(() => localStorage.getItem('saa-region-builder:save:corrupt'));
  check(copy === '{broken', 'corrupt save is kept for recovery');
  await b.ctx.close();
}

async function main(): Promise<void> {
  const stop = await startServer();
  const browser = await chromium.launch({ executablePath: browserPath() });
  try {
    await phone(browser);
    await notesPages(browser);
    await keyboard(browser);
    await desktop(browser);
    await saves(browser);
  } finally {
    await browser.close();
    stop();
  }
  if (failures.length > 0) {
    console.error(`test:layout FAILED (${failures.length} of ${checks} checks):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`test:layout OK: ${checks} checks at 390px (touch) and 1280px (keyboard/mouse)`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
