import { describe, expect, it } from 'vitest';
import type { Citers } from './citations';
import { diffHashes, hashOf, mainText, scopeHashFile, type HashFile } from './freshness';
import { buildingDates, buildVerifiedSource } from './verifiedMeta';

const page = (banner: string, body: string, footer = 'Privacy | Terms') =>
  `<html><body><header>${banner}</header><nav>Docs Home</nav><main><h1>Title</h1><p>${body}</p><p>${'More filler text about the service so that the main region is long enough to count as the page. '.repeat(4)}</p></main><footer>${footer}</footer></body></html>`;

describe('main content hash', () => {
  it('ignores banners, navigation and footers but not the content', () => {
    const a = mainText(page('re:Invent 2026 register now', 'A queue holds up to 120,000 in-flight messages.'));
    const b = mainText(page('Gartner named AWS a leader', 'A queue holds up to 120,000 in-flight messages.', 'Different footer'));
    const c = mainText(page('re:Invent 2026 register now', 'A queue holds up to 3,000 in-flight messages.'));
    expect(hashOf(a)).toBe(hashOf(b));
    expect(hashOf(a)).not.toBe(hashOf(c));
  });
  it('ignores whitespace and typographic quotes', () => {
    const a = mainText(page('x', 'It’s  a “test”.'));
    const b = mainText(page('x', 'It\'s a "test".'));
    expect(hashOf(a)).toBe(hashOf(b));
  });
});

describe('diffHashes', () => {
  const stored: HashFile = { generated: '2026-10-19', pages: { 'https://a': { hash: 'h1', verifiedAt: '2026-10-19', sources: ['a'] }, 'https://b': { hash: 'h2', verifiedAt: '2026-10-19', sources: ['b'] }, 'https://gone': { hash: 'h3', verifiedAt: '2026-10-19', sources: ['g'] } } };
  it('reports changed, unreachable, added and removed pages and nothing for unchanged ones', () => {
    const fresh = new Map<string, string | Error>([['https://a', 'h1'], ['https://b', 'h9'], ['https://new', 'h4']]);
    const out = diffHashes(stored, fresh, new Set(['https://a', 'https://b', 'https://new']));
    expect(out.map((c) => `${c.kind}:${c.url}`).sort()).toEqual(['added:https://new', 'changed:https://b', 'removed:https://gone']);
    const down = diffHashes(stored, new Map<string, string | Error>([['https://a', new Error('HTTP 404')], ['https://b', 'h2']]), new Set(['https://a', 'https://b', 'https://gone']));
    expect(down.map((c) => c.kind)).toEqual(['unreachable']);
  });
});

describe('building check dates', () => {
  const c = (...b: string[]): Citers => ({ buildings: new Set(b), questions: new Set(), puzzles: new Set(), labs: new Set(), other: new Set() });
  const hashes: HashFile = { generated: '2026-10-19', pages: { 'https://a': { hash: 'x', verifiedAt: '2026-10-19', sources: ['sa'] }, 'https://b': { hash: 'y', verifiedAt: '2026-09-01', sources: ['sb'] } } };
  const urls = new Map([['sa', 'https://a'], ['sb', 'https://b'], ['sc', 'https://c']]);
  it('uses the oldest date among cited pages, and no date when a cited page has none', () => {
    const cites = new Map([['sa', c('one', 'two')], ['sb', c('one')], ['sc', c('three')]]);
    const out = buildingDates(hashes, cites, ['one', 'two', 'three', 'four'], urls);
    expect(out).toEqual({ one: '2026-09-01', two: '2026-10-19' });
    expect(buildVerifiedSource(out, '2026-10-19')).toContain("'one': '2026-09-01'");
  });
});

describe('a scoped run judges only the pages it asked about', () => {
  const stored: HashFile = {
    generated: '2026-10-01',
    pages: {
      'https://docs.aws.amazon.com/a.html': { hash: 'aaa', verifiedAt: '2026-10-01', sources: ['a'] },
      'https://docs.aws.amazon.com/b.html': { hash: 'bbb', verifiedAt: '2026-10-01', sources: ['b'] },
    },
  };
  const cited = new Set(['https://docs.aws.amazon.com/a.html']);

  it('keeps only the stored pages in scope', () => {
    const scoped = scopeHashFile(stored, (url) => url.endsWith('/a.html'));
    expect(Object.keys(scoped.pages)).toEqual(['https://docs.aws.amazon.com/a.html']);
    expect(scoped.generated).toBe(stored.generated);
  });

  it('does not report an out-of-scope page as removed', () => {
    const fresh = new Map([['https://docs.aws.amazon.com/a.html', 'aaa']]);
    const scoped = scopeHashFile(stored, (url) => url.endsWith('/a.html'));
    expect(diffHashes(scoped, fresh, cited)).toEqual([]);
  });

  it('still reports an in-scope change', () => {
    const fresh = new Map([['https://docs.aws.amazon.com/a.html', 'zzz']]);
    const scoped = scopeHashFile(stored, (url) => url.endsWith('/a.html'));
    expect(diffHashes(scoped, fresh, cited).map((c) => c.kind)).toEqual(['changed']);
  });
});
