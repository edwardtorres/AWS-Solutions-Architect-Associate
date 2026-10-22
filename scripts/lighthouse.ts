/**
 * npx tsx scripts/lighthouse.ts [--runs 3] [--url https://example.org/] [--out docs/lighthouse/local-mobile.json]
 * Runs Lighthouse with its default mobile preset (mobile emulation, simulated throttling) on the production build, served by
 * scripts/serve-prod.ts with the same security headers as CloudFront, or on --url. Prints each run and the median. --out writes
 * the scores and a few metrics only: no local addresses, paths or hosts beyond the target named.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

const ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'] as const;
const METRICS = ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift'] as const;

type Category = (typeof CATEGORIES)[number];
type Metric = (typeof METRICS)[number];

interface RunResult {
  scores: Record<Category, number>;
  metrics: Record<Metric, number>;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** The same lookup as playwright.config.ts: CHROMIUM_PATH, then the pre-installed browser, then Playwright's own. */
function browserPath(): string {
  const fallback = '/opt/pw-browsers/chromium';
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  if (existsSync(fallback) && statSync(fallback).isFile()) return fallback;
  return chromium.executablePath();
}

async function freePort(): Promise<number> {
  return new Promise((ok, fail) => {
    const server = createServer();
    server.on('error', fail);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => {
        if (typeof address === 'object' && address) ok(address.port);
        else fail(new Error('No free port'));
      });
    });
  });
}

async function waitFor(url: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* the server is not listening yet */
    }
    await new Promise((wait) => setTimeout(wait, 200));
  }
  throw new Error('The production server did not start');
}

function startServer(port: number): ChildProcess {
  return spawn('npx', ['tsx', 'scripts/serve-prod.ts', '--port', String(port)], {
    cwd: ROOT,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

async function runOnce(url: string): Promise<RunResult> {
  const chrome = await chromeLauncher.launch({
    chromePath: browserPath(),
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
  });
  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: [...CATEGORIES],
    });
    if (!result) throw new Error('Lighthouse returned no result');
    const { categories, audits } = result.lhr;
    const scores = {} as Record<Category, number>;
    for (const id of CATEGORIES) scores[id] = Math.round((categories[id]?.score ?? 0) * 100);
    const metrics = {} as Record<Metric, number>;
    for (const id of METRICS) metrics[id] = audits[id]?.numericValue ?? 0;
    return { scores, metrics };
  } finally {
    await chrome.kill();
  }
}

async function main(): Promise<void> {
  const runs = Math.max(1, Number(arg('runs') ?? '3'));
  const out = arg('out');
  const target = arg('url');
  let server: ChildProcess | null = null;
  let url: string;
  if (target) {
    url = target;
  } else {
    const port = await freePort();
    server = startServer(port);
    url = `http://127.0.0.1:${port}/`;
    await waitFor(url);
  }
  const results: RunResult[] = [];
  try {
    for (let run = 1; run <= runs; run += 1) {
      const result = await runOnce(url);
      results.push(result);
      const line = CATEGORIES.map((id) => `${id} ${result.scores[id]}`).join(' · ');
      console.log(`run ${run}: ${line}`);
    }
  } finally {
    server?.kill();
  }
  const medians = Object.fromEntries(CATEGORIES.map((id) => [id, median(results.map((r) => r.scores[id]))])) as Record<Category, number>;
  console.log(`median: ${CATEGORIES.map((id) => `${id} ${medians[id]}`).join(' · ')}`);
  if (out) {
    const summary = {
      target: target ? 'live URL' : 'local production build (scripts/serve-prod.ts)',
      formFactor: 'mobile (Lighthouse default preset, simulated throttling)',
      runs: results.map((r) => ({ scores: r.scores, metrics: r.metrics })),
      median: medians,
    };
    const path = resolve(ROOT, out);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(`wrote ${out}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
