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

/** One browser read of the page. `settled` is false when the list was still changing when it was read. */
export interface Render extends Snapshot {
  settled: boolean;
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

/** The part of the page's text that holds the offers. */
export function sectionOf(text: string): string {
  const start = text.indexOf('Explore our offers');
  const end = text.search(/\nFAQs\n/);
  return text.slice(start < 0 ? 0 : start, end < 0 ? undefined : end);
}

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

/** One line per change, so two diffs can be compared change by change. */
function signatures(d: Diff): Map<string, Offer | { name: string; from: string; to: string }> {
  const key = (name: string) => name.toLowerCase();
  const out = new Map<string, Offer | { name: string; from: string; to: string }>();
  for (const o of d.added) out.set(`added|${key(o.name)}|${o.label}`, o);
  for (const o of d.removed) out.set(`removed|${key(o.name)}|${o.label}`, o);
  for (const c of d.changed) out.set(`changed|${key(c.name)}|${c.to}`, c);
  return out;
}

export interface Confirmed {
  /** Changes that both renders report in the same way. Only these count. */
  diff: Diff;
  /** Names of offers the two renders disagree about. They are reported as an unstable read and not counted. */
  unstable: string[];
}

/** Counts a change only when two consecutive renders report it the same way. */
export function confirmDiffs(first: Diff, second: Diff): Confirmed {
  const a = signatures(first);
  const b = signatures(second);
  const agreed = (kind: string) => [...a].filter(([sig]) => sig.startsWith(`${kind}|`) && b.has(sig)).map(([, v]) => v);
  const diff: Diff = {
    added: agreed('added') as Offer[],
    removed: agreed('removed') as Offer[],
    changed: agreed('changed') as Diff['changed'],
  };
  // A change only one render reports is disputed: it is named, and not counted.
  const disputed = [...a].filter(([sig]) => !b.has(sig)).concat([...b].filter(([sig]) => !a.has(sig)));
  const unstable = [...new Set(disputed.map(([, v]) => (v as { name: string }).name))];
  return { diff, unstable };
}

/**
 * The offers to keep as the snapshot once two renders are compared. An offer both renders report the same way takes that
 * report (an addition, a relabel, or a removal when both renders lack it). An offer the renders disagree about keeps its
 * snapshot entry, unchanged, and is returned in `unstable`.
 */
export function mergeConfirmed(snapshot: readonly Offer[], first: readonly Offer[], second: readonly Offer[]): { offers: Offer[]; unstable: string[] } {
  // The page can show the same card twice (identical copies), so each name keeps all its copies and they are compared as a set.
  const group = (list: readonly Offer[]) => {
    const m = new Map<string, Offer[]>();
    for (const o of list) m.set(o.name.toLowerCase(), [...(m.get(o.name.toLowerCase()) ?? []), o]);
    return m;
  };
  const shape = (list: readonly Offer[]) => list.map((o) => `${o.label}|${o.category}`).sort().join('\n');
  const a = group(first);
  const b = group(second);
  const s = group(snapshot);
  const offers: Offer[] = [];
  const unstable: string[] = [];
  for (const k of new Set([...a.keys(), ...b.keys(), ...s.keys()])) {
    const la = a.get(k) ?? [];
    const lb = b.get(k) ?? [];
    if (la.length > 0 && lb.length > 0 && shape(la) === shape(lb)) {
      offers.push(...la);
      continue;
    }
    if (la.length === 0 && lb.length === 0) continue; // absent from both renders: a confirmed removal
    unstable.push((la[0] ?? lb[0] ?? s.get(k)?.[0])?.name ?? k);
    offers.push(...(s.get(k) ?? []));
  }
  return { offers, unstable };
}

/** Renders the Free Tier page with Chromium, clicks every "Show N more" button, and waits until the list stops changing. */
export async function renderOffers(): Promise<Render> {
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
    // Settled: no "Show N more" button is left and the number of offers is the same on two reads three seconds apart.
    let previous = -1;
    let settled = false;
    let section = '';
    for (let i = 0; i < 12; i += 1) {
      const more = page.getByText(/^Show \d+ more$/).first();
      if ((await more.count()) > 0) {
        await more.click({ timeout: 10_000 });
        await page.waitForTimeout(500);
        continue;
      }
      section = sectionOf(await page.evaluate(() => document.body.innerText));
      const count = parseOffers(section).length;
      if (count === previous) {
        settled = true;
        break;
      }
      previous = count;
      await page.waitForTimeout(3000);
    }
    if (!section) section = sectionOf(await page.evaluate(() => document.body.innerText));
    return { capturedAt: new Date().toISOString().slice(0, 10), url: FREE_URL, total: totalOf(section), offers: parseOffers(section), settled };
  } finally {
    await browser.close();
  }
}
