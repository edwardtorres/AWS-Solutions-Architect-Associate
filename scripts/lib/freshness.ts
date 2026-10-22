import { createHash } from 'node:crypto';
import * as cheerio from 'cheerio';
import { normalise } from './notesChecks.ts';

/**
 * The text of a page's main content, for hashing. AWS and Microsoft pages wrap their navigation, banners, feedback widgets and
 * footers around one main region; only that region counts, so a changed promotional banner or a new "re:Invent" strip does not
 * report a change. Whitespace and quote characters are normalised.
 */
/** The page's main region with navigation, banners, feedback widgets and footers removed. Shared by the hash and the paragraphs. */
export function mainScope(html: string) {
  const $ = cheerio.load(html);
  const region = ['main', '#main-content', '[role=main]', 'article', '#content'].map((s) => $(s).first()).find((el) => el.length > 0 && el.text().trim().length > 200);
  const scope = region ?? $('body');
  scope.find('script,style,noscript,nav,header,footer,aside,form,button,svg,iframe,[role=navigation],[role=banner],[role=contentinfo],[aria-hidden=true],.feedback,#feedback,[class*=breadcrumb],[class*=feedback]').remove();
  return { $, scope };
}

export function mainText(html: string): string {
  const { scope } = mainScope(html);
  const text = scope.text();
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export const hashOf = (text: string): string => createHash('sha256').update(text).digest('hex').slice(0, 20);

export interface PageHash {
  hash: string;
  verifiedAt: string;
  /** Source ids that point at this page. */
  sources: string[];
}
export interface HashFile {
  generated: string;
  pages: Record<string, PageHash>;
}

export interface Change {
  url: string;
  kind: 'changed' | 'unreachable' | 'added' | 'removed';
  detail: string;
}

/** Compares stored hashes with fresh ones (url -> hash, or an error string). Pure so it can be tested. */
export function diffHashes(stored: HashFile, fresh: ReadonlyMap<string, string | Error>, currentUrls: ReadonlySet<string>): Change[] {
  const out: Change[] = [];
  for (const [url, rec] of Object.entries(stored.pages)) {
    if (!currentUrls.has(url)) {
      out.push({ url, kind: 'removed', detail: 'no longer cited' });
      continue;
    }
    const f = fresh.get(url);
    if (f === undefined) continue;
    if (f instanceof Error) out.push({ url, kind: 'unreachable', detail: f.message });
    else if (f !== rec.hash) out.push({ url, kind: 'changed', detail: `${rec.hash} -> ${f} (verified ${rec.verifiedAt})` });
  }
  for (const url of currentUrls) if (!(url in stored.pages)) out.push({ url, kind: 'added', detail: 'cited but not in the hash file' });
  return out;
}

/**
 * The stored hashes a scoped run (`--only`) compares. Pages outside the scope are left out, so they are not reported as
 * removed: a scoped run only judges the pages it asked about.
 */
export function scopeHashFile(stored: HashFile, inScope: (url: string) => boolean): HashFile {
  return { ...stored, pages: Object.fromEntries(Object.entries(stored.pages).filter(([url]) => inScope(url))) };
}

/** A short key for a quote: the first ten hex characters of the SHA-1 of its normalised text. */
export const quoteKey = (quote: string): string => createHash('sha1').update(normalise(quote)).digest('hex').slice(0, 10);

/**
 * The paragraphs of a page that hold cited quotes. `t` holds each distinct paragraph once (display text, original case); `q` maps
 * a quote key to its paragraph's index. The paragraph is the smallest block element whose text contains the quote. A quote that
 * no single block contains is left out, so it is reported as not located.
 */
export interface PageParagraphs {
  t: string[];
  q: Record<string, number>;
}

const BLOCKS = 'p,li,td,th,dd,dt,h1,h2,h3,h4,h5,h6,blockquote,pre,figcaption';

export function paragraphsFor(html: string, quotes: readonly string[]): PageParagraphs {
  const { $, scope } = mainScope(html);
  const blocks = scope
    .find(BLOCKS)
    .toArray()
    .map((el) => $(el).text().replace(/\s+/g, ' ').trim())
    .filter((text) => text.length > 0);
  const normalised = blocks.map((text) => normalise(text));
  const t: string[] = [];
  const at = new Map<string, number>();
  const q: Record<string, number> = {};
  for (const quote of quotes) {
    const want = normalise(quote);
    let best = -1;
    normalised.forEach((text, n) => {
      if (text.includes(want) && (best < 0 || text.length < (normalised[best] as string).length)) best = n;
    });
    if (best < 0) continue;
    const text = blocks[best] as string;
    let i = at.get(text);
    if (i === undefined) {
      i = t.length;
      t.push(text);
      at.set(text, i);
    }
    q[quoteKey(quote)] = i;
  }
  return { t, q };
}

/**
 * The paragraphs that changed for one page: for each cited quote, the stored paragraph and the fresh one. A paragraph shared by
 * several quotes is reported once, with every place that cites it. A quote no longer on the page is reported as such.
 */
export function paragraphChanges(quotes: readonly { where: string; text: string }[], before: PageParagraphs | undefined, after: PageParagraphs | undefined): string[] {
  if (!before) return ['    (no stored paragraphs for this page yet: run `npm run check:freshness -- --paragraphs` once the change is reviewed)'];
  const textOf = (set: PageParagraphs | undefined, quote: string): string | undefined => {
    if (!set) return undefined;
    const i = set.q[quoteKey(quote)];
    return i === undefined ? undefined : set.t[i];
  };
  const pairOf = (quote: string) => `${textOf(before, quote) ?? ''}\u0000${textOf(after, quote) ?? ''}`;
  const out: string[] = [];
  const done = new Set<string>();
  for (const quote of quotes) {
    const was = textOf(before, quote.text);
    const now = textOf(after, quote.text);
    if (was === now) continue;
    const pair = pairOf(quote.text);
    if (done.has(pair)) continue;
    done.add(pair);
    const cites = quotes.filter((x) => pairOf(x.text) === pair).map((x) => x.where);
    out.push(`    paragraph cited by ${[...new Set(cites)].join(', ')}`);
    out.push(`      was: ${was ?? '(not located on the stored page)'}`);
    out.push(`      now: ${now ?? '(not located on the page now: the quote may have been removed or reworded)'}`);
  }
  return out;
}
