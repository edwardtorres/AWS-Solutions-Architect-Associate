/**
 * npm run check:links [-- --fresh] [-- --no-quotes]
 * Network check over content/sources.ts: every cited URL answers 200 (after redirects, reported),
 * every #anchor exists, and every verbatim quote appears on the page it cites.
 * Page text is cached in .cache/ (git-ignored); --fresh refetches.
 */
import { loadNotesBundle } from './lib/loadNotes.ts';
import { everyBlock } from './lib/notesChecks.ts';
import { fetchPage, hasText, stripFragment, type PageInfo } from './lib/pageCache.ts';

const fresh = process.argv.includes('--fresh');
const quotesOn = !process.argv.includes('--no-quotes');

async function pool<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i] as T);
      }
    }),
  );
  return out;
}

/** Nearest sentence on the page by shared words, to make a failing quote easy to repair. */
function closest(page: PageInfo, quote: string): string {
  const words = new Set(quote.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);
  if (words.size === 0 || !page.display) return '';
  let best = '';
  let bestScore = 0;
  for (const sentence of page.display.split(/(?<=[.!?])\s+/)) {
    const sw = new Set(sentence.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);
    let hit = 0;
    for (const w of words) if (sw.has(w)) hit += 1;
    const score = hit / words.size;
    if (score > bestScore && sentence.length < 600) {
      bestScore = score;
      best = sentence;
    }
  }
  return bestScore >= 0.4 ? `\n      closest: "${best.slice(0, 300)}"` : '';
}

async function main() {
  const bundle = await loadNotesBundle();
  const problems: string[] = [];
  const warnings: string[] = [];
  const urls = [...new Set(bundle.sources.map((s) => stripFragment(s.url)))];
  const pages = new Map<string, PageInfo | Error>();
  await pool(urls, 5, async (u) => {
    try {
      pages.set(u, await fetchPage(u, { fresh }));
    } catch (e) {
      pages.set(u, e as Error);
    }
  });

  for (const s of bundle.sources) {
    const page = pages.get(stripFragment(s.url));
    if (!page || page instanceof Error) {
      problems.push(`${s.id}: unreachable ${s.url} (${page instanceof Error ? page.message : 'no response'})`);
      continue;
    }
    if (page.status !== 200) problems.push(`${s.id}: ${s.url} returned ${page.status}`);
    if (page.metaRefresh) problems.push(`${s.id}: ${s.url} is a redirect stub (${page.metaRefresh})`);
    if (stripFragment(page.finalUrl) !== stripFragment(s.url)) warnings.push(`${s.id}: redirects to ${page.finalUrl}`);
    const frag = s.url.includes('#') ? decodeURIComponent(s.url.slice(s.url.indexOf('#') + 1)) : '';
    if (frag && !page.ids.includes(frag)) problems.push(`${s.id}: anchor #${frag} not found on ${stripFragment(s.url)}`);
  }

  let quoteCount = 0;
  if (quotesOn) {
    const byId = new Map(bundle.sources.map((s) => [s.id, s]));
    for (const { where, block } of everyBlock(bundle)) {
      for (const q of block.quotes ?? []) {
        quoteCount += 1;
        const src = byId.get(q.src);
        if (!src) continue;
        const page = pages.get(stripFragment(src.url));
        if (!page || page instanceof Error) continue;
        if (!hasText(page, q.text)) problems.push(`${where}: quote not found on ${src.id}: "${q.text.slice(0, 90)}"${closest(page, q.text)}`);
      }
    }
  }

  for (const w of warnings) console.warn(`  note: ${w}`);
  if (problems.length > 0) {
    console.error(`check:links FAILED (${problems.length}):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`check:links OK: ${bundle.sources.length} sources, ${urls.length} pages, ${quoteCount} quotes verified, ${warnings.length} redirect note(s)`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
