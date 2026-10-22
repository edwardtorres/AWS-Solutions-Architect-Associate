/**
 * npm run check:freshness [-- --update] [-- --paragraphs] [-- --only <substring>]
 * Network. AWS pages publish no reliable "last updated" dates, so each cited page's main content is hashed when it was verified
 * (content/page-hashes.json). This command refetches every cited page, reports each page whose hash changed (or that is
 * unreachable, newly cited or no longer cited) and, for each, the buildings, questions, puzzles and labs that cite it. For a changed
 * page it also shows the text of each cited paragraph before and after the change, from content/page-paragraphs.json: the paragraph
 * around each quote, not the whole page. Exit 1 on any change, 2 when the only failures are network-class (see scripts/lib/network.ts).
 * `--update` rewrites the hash file (and every verifiedAt) and the paragraph store for the pages in scope; do it only after the
 * changes were reviewed and the content fixed. `--paragraphs` stores paragraphs for pages whose hash has not changed, without touching
 * a hash. Kept out of `npm test` and `npm run check` because it needs the network and changes whenever AWS edits a page.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { loadNotesBundle } from './lib/loadNotes.ts';
import { buildCitations } from './lib/citations.ts';
import { quotesByUrl } from './lib/citedQuotes.ts';
import { diffHashes, hashOf, mainText, paragraphChanges, paragraphsFor, scopeHashFile, type HashFile, type PageParagraphs } from './lib/freshness.ts';
import { EXIT_CHANGED, EXIT_NETWORK, isNetworkFailure } from './lib/network.ts';

/** Longest paragraph report printed in one run, so the issue body stays within GitHub's limit. */
const REPORT_LIMIT = 50_000;

const update = process.argv.includes('--update');
const paragraphsOnly = process.argv.includes('--paragraphs');
const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : undefined;
const file = new URL('../content/page-hashes.json', import.meta.url);
const storeFile = new URL('../content/page-paragraphs.json', import.meta.url);

const stored: HashFile = (() => {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as HashFile;
  } catch {
    return { generated: '', pages: {} };
  }
})();
const store: { generated: string; pages: Record<string, PageParagraphs> } = (() => {
  try {
    return JSON.parse(readFileSync(storeFile, 'utf8')) as typeof store;
  } catch {
    return { generated: '', pages: {} };
  }
})();

const { sources } = await loadNotesBundle();
const byUrl = new Map<string, string[]>();
for (const s of sources) {
  const u = s.url.split('#')[0] as string;
  byUrl.set(u, [...(byUrl.get(u) ?? []), s.id]);
}
const cited = await quotesByUrl();
const urls = [...byUrl.keys()].filter((u) => !only || u.includes(only));

interface Fetched {
  hash: string;
  para: PageParagraphs;
}

async function fetchPage(url: string): Promise<Fetched | Error> {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'saa-region-builder-freshness-check' } });
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const text = mainText(html);
      if (text.length < 200) throw new Error('the page has no main content');
      return { hash: hashOf(text), para: paragraphsFor(html, (cited.get(url) ?? []).map((q) => q.text)) };
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  return last instanceof Error ? last : new Error(String(last));
}

const fresh = new Map<string, Fetched | Error>();
let next = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    for (;;) {
      const i = next++;
      if (i >= urls.length) return;
      fresh.set(urls[i] as string, await fetchPage(urls[i] as string));
    }
  }),
);

/** Sorted, compact JSON, so the store diffs cleanly when a page changes. */
function writeStore(pages: Record<string, PageParagraphs>, generated: string): void {
  const sorted = Object.fromEntries(Object.keys(pages).sort().map((url) => [url, pages[url]]));
  writeFileSync(storeFile, JSON.stringify({ generated, pages: sorted }) + '\n');
}

const today = new Date().toISOString().slice(0, 10);
if (update) {
  const bad = [...fresh].filter(([, v]) => v instanceof Error) as [string, Error][];
  if (bad.length > 0) {
    console.error(`Not updating: ${bad.length} page(s) unreachable:\n${bad.map(([u, e]) => `  ${u}: ${e.message}`).join('\n')}`);
    process.exit(bad.every(([, e]) => isNetworkFailure(e)) ? EXIT_NETWORK : EXIT_CHANGED);
  }
  const pages: HashFile['pages'] = only ? { ...stored.pages } : {};
  for (const [url, v] of fresh) pages[url] = { hash: (v as Fetched).hash, verifiedAt: today, sources: byUrl.get(url) ?? [] };
  writeFileSync(file, JSON.stringify({ generated: today, pages }, null, 1) + '\n');
  const paragraphs: Record<string, PageParagraphs> = only ? { ...store.pages } : {};
  for (const [url, v] of fresh) paragraphs[url] = (v as Fetched).para;
  writeStore(paragraphs, today);
  console.log(`Wrote ${fresh.size} page hash(es) and paragraph set(s) (verifiedAt ${today}) to content/page-hashes.json and content/page-paragraphs.json. Run \`npm run gen:meta\` to refresh the building dates.`);
  process.exit(0);
}

if (paragraphsOnly) {
  const paragraphs: Record<string, PageParagraphs> = { ...store.pages };
  for (const url of Object.keys(paragraphs)) if (!byUrl.has(url)) delete paragraphs[url];
  const skipped: string[] = [];
  let stored_ = 0;
  for (const [url, v] of fresh) {
    if (v instanceof Error || stored.pages[url]?.hash !== v.hash) {
      skipped.push(url);
      continue;
    }
    paragraphs[url] = v.para;
    stored_ += 1;
  }
  writeStore(paragraphs, today);
  console.log(`Stored paragraphs for ${stored_} page(s). Left alone: ${skipped.length} page(s) that changed or could not be read (review them, then run --update --only).`);
  process.exit(0);
}

// A page that could not be reached for network reasons is a warning, not a change: it is left out of the comparison.
const unreachable = [...fresh].flatMap(([url, v]) => (v instanceof Error && isNetworkFailure(v) ? [[url, v.message] as const] : []));
const freshHash = new Map<string, string | Error>();
for (const [url, v] of fresh) if (!(v instanceof Error && isNetworkFailure(v))) freshHash.set(url, v instanceof Error ? v : v.hash);
const inScope = (url: string) => !only || url.includes(only);
const changes = diffHashes(only ? scopeHashFile(stored, inScope) : stored, freshHash, new Set(urls));
if (changes.length === 0 && unreachable.length === 0) {
  console.log(`check:freshness OK: ${fresh.size} pages unchanged since their hashes were stored (${stored.generated}).`);
  process.exit(0);
}
if (changes.length === 0) {
  console.error(`check:freshness: network warning, not a change. ${unreachable.length} page(s) could not be reached:`);
  for (const [url, message] of unreachable) console.error(`  ${url}: ${message}`);
  process.exit(EXIT_NETWORK);
}

const cites = await buildCitations();
console.log(`check:freshness: ${changes.length} change(s) among ${fresh.size} pages (hashes from ${stored.generated}):\n`);
let reported = 0;
let cut = false;
for (const c of changes) {
  console.log(`- [${c.kind}] ${c.url}\n    ${c.detail}`);
  const ids = byUrl.get(c.url) ?? stored.pages[c.url]?.sources ?? [];
  const agg = { buildings: new Set<string>(), questions: new Set<string>(), puzzles: new Set<string>(), labs: new Set<string>(), other: new Set<string>() };
  for (const id of ids) {
    const x = cites.get(id);
    if (!x) continue;
    for (const k of Object.keys(agg) as (keyof typeof agg)[]) for (const v of x[k]) agg[k].add(v);
  }
  console.log(`    sources: ${ids.join(', ') || '(none)'}`);
  for (const [k, set] of Object.entries(agg)) if (set.size) console.log(`    ${k} (${set.size}): ${[...set].slice(0, 12).join(', ')}${set.size > 12 ? ', …' : ''}`);
  if (c.kind === 'changed') {
    const lines = paragraphChanges(cited.get(c.url) ?? [], store.pages[c.url], (fresh.get(c.url) as Fetched | undefined)?.para);
    for (const line of lines) {
      if (reported + line.length > REPORT_LIMIT) {
        cut = true;
        break;
      }
      reported += line.length;
      console.log(line);
    }
    if (cut) {
      console.log(`    (the paragraph report stops here: it passed ${REPORT_LIMIT.toLocaleString('en-US')} characters)`);
      break;
    }
  }
}
if (unreachable.length > 0) console.error(`(${unreachable.length} other page(s) could not be reached: a network warning, not counted here.)`);
process.exit(EXIT_CHANGED);
