import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import { normalise } from './notesChecks.ts';

const cacheDir = fileURLToPath(new URL('../../.cache/pages', import.meta.url));

export interface PageInfo {
  url: string;
  finalUrl: string;
  status: number;
  /** HTML ids and anchor names on the page. */
  ids: string[];
  /** Normalised visible text. */
  text: string;
  /** Normalised text of the raw markup with tags stripped (catches text embedded in page data). */
  rawText: string;
  metaRefresh: string | null;
  fetchedAt: string;
}

const key = (url: string) => createHash('sha1').update(url).digest('hex');

export function stripFragment(url: string): string {
  const i = url.indexOf('#');
  return i === -1 ? url : url.slice(0, i);
}

export async function fetchPage(url: string, opts: { fresh?: boolean } = {}): Promise<PageInfo> {
  const clean = stripFragment(url);
  mkdirSync(cacheDir, { recursive: true });
  const file = join(cacheDir, `${key(clean)}.json`);
  if (!opts.fresh && existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')) as PageInfo;
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(clean, { redirect: 'follow', headers: { 'user-agent': 'saa-region-builder-link-check' } });
      const html = await res.text();
      const $ = cheerio.load(html);
      const ids = new Set<string>();
      $('[id]').each((_, el) => {
        ids.add($(el).attr('id') as string);
      });
      $('a[name]').each((_, el) => {
        ids.add($(el).attr('name') as string);
      });
      const refresh = $('meta[http-equiv="refresh" i]').attr('content') ?? null;
      $('script,style,noscript').remove();
      const info: PageInfo = {
        url: clean,
        finalUrl: res.url,
        status: res.status,
        ids: [...ids],
        text: normalise($('body').text()),
        rawText: normalise(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')),
        metaRefresh: refresh,
        fetchedAt: new Date().toISOString(),
      };
      writeFileSync(file, JSON.stringify(info));
      return info;
    } catch (e) {
      lastError = e;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw new Error(`could not fetch ${clean}: ${String(lastError)}`);
}

export function hasText(page: PageInfo, quote: string): boolean {
  const q = normalise(quote);
  return page.text.includes(q) || page.rawText.includes(q);
}
