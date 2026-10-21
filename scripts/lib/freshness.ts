import { createHash } from 'node:crypto';
import * as cheerio from 'cheerio';

/**
 * The text of a page's main content, for hashing. AWS and Microsoft pages wrap their navigation, banners, feedback widgets and
 * footers around one main region; only that region counts, so a changed promotional banner or a new "re:Invent" strip does not
 * report a change. Whitespace and quote characters are normalised.
 */
export function mainText(html: string): string {
  const $ = cheerio.load(html);
  $('script,style,noscript,nav,header,footer,aside,form,button,svg,iframe,[role=navigation],[role=banner],[role=contentinfo],[aria-hidden=true],.feedback,#feedback,[class*=breadcrumb],[class*=feedback],[class*=cookie],[id*=cookie],[class*=toc],[id*=toc]').remove();
  const region = ['main', '#main-content', '[role=main]', 'article', '#content'].map((s) => $(s).first()).find((el) => el.length > 0 && el.text().trim().length > 200);
  const text = (region ?? $('body')).text();
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
