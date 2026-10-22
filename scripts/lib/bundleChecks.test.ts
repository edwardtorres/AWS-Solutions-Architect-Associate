import { describe, expect, it } from 'vitest';
import { checkBundle } from './bundleChecks';

const html = '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; object-src \'none\'; base-uri \'self\'"></head><body></body></html>';

describe('external origins in the bundle', () => {
  it('allows the one Workbox console-warning URL and nothing else', () => {
    const ok = checkBundle([
      { path: 'index.html', content: html },
      { path: 'workbox-x.js', content: 'console.warn(`Learn more at https://bit.ly/wb-precache`)' },
    ]);
    expect(ok.filter((p) => p.includes('external origin'))).toEqual([]);
    const bad = checkBundle([
      { path: 'index.html', content: html },
      { path: 'app.js', content: 'fetch("https://bit.ly/other")' },
    ]);
    expect(bad).toContain('app.js references external origin bit.ly');
  });
});
