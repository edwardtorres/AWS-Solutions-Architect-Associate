/**
 * npx tsx scripts/capture-save.ts <out.json>
 * Drives the production preview (run `npm run build` first) through a real play session in Chromium and writes
 * the resulting localStorage save to <out.json>. Used once to capture a genuine v2 save as a migration fixture.
 */
import { spawn } from 'node:child_process';
import { existsSync, statSync, writeFileSync } from 'node:fs';
import { chromium, expect } from '@playwright/test';
import { answerAll, pickChain, pickPortfolio } from '../e2e/helpers.ts';

const out = process.argv[2];
if (!out) throw new Error('usage: capture-save.ts <out.json>');
const PORT = 4177;
const BASE = `http://localhost:${PORT}/`;
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', 'localhost'], { stdio: 'ignore' });
for (let i = 0; i < 120; i += 1) {
  try {
    if ((await fetch(BASE)).ok) break;
  } catch {
    /* not up yet */
  }
  await new Promise((r) => setTimeout(r, 250));
}
const fallback = '/opt/pw-browsers/chromium';
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync(fallback) && statSync(fallback).isFile() ? fallback : undefined);
const browser = await chromium.launch({ executablePath });
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, hasTouch: true });
  const page = await ctx.newPage();
  const go = async (hash: string) => {
    await page.goto(`${BASE}#/map`);
    await page.goto(`${BASE}${hash}`);
  };
  await page.goto(BASE);
  const { start, dependent } = pickChain();
  const notes = async (id: string) => {
    await go(`#/notes/${id}`);
    await expect(page.locator('article h2').first()).toBeVisible();
  };
  const startup = async (id: string, rights: boolean[]) => {
    await go(`#/startup/${id}`);
    await page.getByRole('button', { name: /Begin start-up check/i }).click();
    await answerAll(page, 2, rights);
  };
  const inspect = async (id: string, rights: boolean[]) => {
    await go(`#/inspect/${id}`);
    await page.getByRole('button', { name: /Begin inspection/i }).click();
    await answerAll(page, 5, rights);
  };
  await notes(start);
  await startup(start, [true, false]);
  await startup(start, [true, true]);
  await inspect(start, [true, false, true, false, true]);
  await inspect(start, [true, true, true, true, false]);
  await notes(dependent);
  await startup(dependent, [true, true]);
  await inspect(dependent, [false, false, false, true, true]);
  await go(`#/place/${pickPortfolio()}`);
  await page.getByRole('button', { name: /Begin placement check/i }).click();
  await answerAll(page, 5, [true, true, true, true, false]);
  await page.getByTestId('result-card').first().getByRole('button', { name: 'Flag this question' }).click();
  await page.getByLabel(/What is wrong or unclear/).fill('Wording check');
  await page.getByRole('button', { name: 'Save flag' }).click();
  const raw = await page.evaluate(() => localStorage.getItem('saa-region-builder:save'));
  if (!raw) throw new Error('no save');
  writeFileSync(out, `${JSON.stringify(JSON.parse(raw), null, 1)}\n`);
  console.log(`saved ${out}: ${(JSON.parse(raw) as { game: { log: unknown[] } }).game.log.length} log entries`);
} finally {
  await browser.close();
  proc.kill();
}
