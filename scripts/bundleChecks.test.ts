import { describe, expect, it } from 'vitest';
import { checkBundle, type BundleFile } from './lib/bundleChecks.ts';

const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'";
const good = (): BundleFile[] => [
  {
    path: 'index.html',
    content: `<head><meta http-equiv="Content-Security-Policy" content="${CSP}"><script type="module" src="/assets/a.js"></script><link rel="stylesheet" href="/assets/a.css"></head>`,
  },
  { path: 'assets/a.js', content: 'console.log("app")' },
  { path: 'assets/b.js', content: '' },
  { path: 'assets/c.js', content: '' },
  { path: 'assets/d.js', content: '' },
  { path: 'assets/a.css', content: '@font-face{src:url(/assets/f.woff2)}' },
  { path: 'assets/f.woff2', content: '' },
];

describe('check:bundle', () => {
  it('passes a clean bundle', () => {
    expect(checkBundle(good())).toEqual([]);
  });
  it('fails when a dev hook marker ships', () => {
    const f = good();
    f[1] = { path: 'assets/a.js', content: 'window.__saaDev = {}' };
    expect(checkBundle(f).join()).toMatch(/__saaDev/);
  });
  it('fails on an external origin', () => {
    const f = good();
    f[1] = { path: 'assets/a.js', content: 'fetch("https://cdn.example.com/x.js")' };
    expect(checkBundle(f).join()).toMatch(/cdn\.example\.com/);
  });
  it('fails on a remote font or stylesheet', () => {
    const f = good();
    f[5] = { path: 'assets/a.css', content: '@import url("https://fonts.googleapis.com/css2?family=Inter");' };
    expect(checkBundle(f).join()).toMatch(/fonts\.googleapis\.com/);
  });
  it('fails without a CSP or with unsafe-inline', () => {
    const f = good();
    f[0] = { path: 'index.html', content: '<head></head>' };
    expect(checkBundle(f).join()).toMatch(/no Content-Security-Policy/);
    f[0] = { path: 'index.html', content: `<head><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'"></head>` };
    expect(checkBundle(f).join()).toMatch(/unsafe-inline/);
  });
  it('fails on inline scripts, missing fonts, unsplit code and source maps', () => {
    const f = good();
    f[0] = { path: 'index.html', content: `${(f[0] as BundleFile).content}<script>alert(1)</script>` };
    expect(checkBundle(f).join()).toMatch(/inline script/);
    expect(checkBundle(good().filter((x) => !x.path.endsWith('.woff2'))).join()).toMatch(/self-hosted font/);
    expect(checkBundle(good().slice(0, 3).concat(good().slice(5))).join()).toMatch(/separate chunks/);
    expect(checkBundle([...good(), { path: 'assets/a.js.map', content: '' }]).join()).toMatch(/source maps/);
  });
});
