import { existsSync, statSync } from 'node:fs';

export const FREE_URL = 'https://aws.amazon.com/free/';

export interface Offer {
  name: string;
  category: string;
  /** The label on the card, verbatim ("Available on both plans", "Paid plan exclusive", ...). */
  label: string;
  /** The card's one-line description, verbatim (lets a reviewer see that an alias is the same service, not a neighbour). */
  description?: string;
}

export interface Snapshot {
  capturedAt: string;
  url: string;
  /** The "Displaying 1-N (total)" figure on the page. */
  total: number | null;
  offers: Offer[];
}

const LABEL = /\bplans?\b/i;

/**
 * Parses the text of the offers section. The page lists each offer as: category, label, name, description, "Learn more".
 * Pure so it can be tested on a fixture.
 */
export function parseOffers(text: string): Offer[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const out: Offer[] = [];
  let chunk: string[] = [];
  for (const line of lines) {
    if (/^learn more$/i.test(line)) {
      if (chunk.length >= 3) {
        const li = chunk.findIndex((l) => LABEL.test(l) && l.length < 60);
        if (li >= 1 && chunk[li + 1]) out.push({ category: chunk[li - 1] as string, label: chunk[li] as string, name: chunk[li + 1] as string, description: chunk.slice(li + 2).join(' ') });
      }
      chunk = [];
    } else chunk.push(line);
  }
  return out;
}

export const totalOf = (text: string): number | null => {
  const m = /Displaying\s+\d+\s*[-–]\s*\d+\s*\((\d+)\)/.exec(text);
  return m ? Number(m[1]) : null;
};

export interface Diff {
  added: Offer[];
  removed: Offer[];
  changed: { name: string; from: string; to: string }[];
}

export function diffOffers(before: readonly Offer[], after: readonly Offer[]): Diff {
  const key = (o: Offer) => o.name.toLowerCase();
  const b = new Map(before.map((o) => [key(o), o]));
  const a = new Map(after.map((o) => [key(o), o]));
  return {
    added: [...a.values()].filter((o) => !b.has(key(o))),
    removed: [...b.values()].filter((o) => !a.has(key(o))),
    changed: [...a.values()].flatMap((o) => (b.has(key(o)) && b.get(key(o))?.label !== o.label ? [{ name: o.name, from: b.get(key(o))?.label ?? '', to: o.label }] : [])),
  };
}

export const isEmptyDiff = (d: Diff): boolean => d.added.length + d.removed.length + d.changed.length === 0;

/** Renders the Free Tier page with Chromium, clicks every "Show N more" button and returns the offers. Needs Playwright's Chromium. */
export async function renderOffers(): Promise<Snapshot> {
  const { chromium } = await import('@playwright/test');
  const fallback = '/opt/pw-browsers/chromium';
  const executablePath = process.env.CHROMIUM_PATH ?? (existsSync(fallback) && statSync(fallback).isFile() ? fallback : undefined);
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
  const browser = await chromium.launch({ executablePath, proxy });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(FREE_URL, { waitUntil: 'networkidle', timeout: 90_000 });
    // The offer list fills in after the network goes quiet; reading the page before the first button appears gives only the first 8 cards.
    await page.getByText(/^Show \d+ more$/).first().waitFor({ timeout: 30_000 });
    // The button can vanish for a moment while the list re-renders, so it only counts as gone after a second look.
    for (let i = 0; i < 80; i += 1) {
      const more = page.getByText(/^Show \d+ more$/).first();
      if ((await more.count()) === 0) {
        await page.waitForTimeout(1500);
        if ((await more.count()) === 0) break;
      }
      await more.click({ timeout: 10_000 });
      await page.waitForTimeout(500);
    }
    const text = await page.evaluate(() => document.body.innerText);
    const start = text.indexOf('Explore our offers');
    const end = text.search(/\nFAQs\n/);
    const section = text.slice(start < 0 ? 0 : start, end < 0 ? undefined : end);
    return { capturedAt: new Date().toISOString().slice(0, 10), url: FREE_URL, total: totalOf(section), offers: parseOffers(section) };
  } finally {
    await browser.close();
  }
}
