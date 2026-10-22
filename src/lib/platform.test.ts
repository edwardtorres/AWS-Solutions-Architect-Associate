import { describe, expect, it } from 'vitest';
import { installContext } from './platform';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPAD_DESKTOP_MODE = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const MAC = IPAD_DESKTOP_MODE;
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';

describe('install context', () => {
  it('recognises an iPhone and an iPad that reports a Mac user agent with touch', () => {
    expect(installContext(IPHONE, 5, false).ios).toBe(true);
    expect(installContext(IPAD_DESKTOP_MODE, 5, false).ios).toBe(true);
  });

  it('does not treat a plain Mac, or Android, as iOS', () => {
    expect(installContext(MAC, 0, false).ios).toBe(false);
    expect(installContext(ANDROID, 5, false).ios).toBe(false);
  });

  it('reports standalone mode so the install steps are not shown again', () => {
    expect(installContext(IPHONE, 5, true)).toEqual({ ios: true, standalone: true });
  });
});
