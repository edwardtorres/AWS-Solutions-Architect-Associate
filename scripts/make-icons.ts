/**
 * npx tsx scripts/make-icons.ts
 * Renders the app icons from the favicon design with Chromium (already a dev dependency through Playwright), so no image
 * library is needed. Writes public/icons/*.png. Run it again only when the artwork changes.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const out = fileURLToPath(new URL('../public/icons/', import.meta.url));
const NAVY = '#0b1a2b';
const AMBER = '#f5b942';
/** The favicon glyph in a 32-unit box (see index.html). */
const GLYPH = `<path d="M6 22h20M9 22v-8l7-5 7 5v8" fill="none" stroke="${AMBER}" stroke-width="2.2" stroke-linejoin="round"/>`;

const ICONS: { file: string; size: number; svg: string }[] = [
  // Any-purpose icons keep the favicon's rounded tile.
  { file: 'icon-192.png', size: 192, svg: `<rect width="32" height="32" rx="7" fill="${NAVY}"/>${GLYPH}` },
  { file: 'icon-512.png', size: 512, svg: `<rect width="32" height="32" rx="7" fill="${NAVY}"/>${GLYPH}` },
  // Maskable icons are full-bleed; the glyph sits inside the central 80% safe zone.
  {
    file: 'maskable-512.png',
    size: 512,
    svg: `<rect width="32" height="32" fill="${NAVY}"/><g transform="translate(3.2 3.2) scale(0.8)">${GLYPH}</g>`,
  },
  // iOS masks the square itself, so the apple-touch icon is full-bleed too.
  { file: 'apple-touch-icon.png', size: 180, svg: `<rect width="32" height="32" fill="${NAVY}"/>${GLYPH}` },
];

async function main(): Promise<void> {
  mkdirSync(out, { recursive: true });
  const executablePath = process.env.CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await chromium.launch({ executablePath });
  try {
    for (const icon of ICONS) {
      const page = await browser.newPage({ viewport: { width: icon.size, height: icon.size }, deviceScaleFactor: 1 });
      await page.setContent(
        `<!doctype html><html><body style="margin:0;background:transparent"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${icon.size}" height="${icon.size}">${icon.svg}</svg></body></html>`,
      );
      await page.screenshot({ path: `${out}${icon.file}`, omitBackground: true, type: 'png' });
      await page.close();
      console.log(`wrote public/icons/${icon.file} (${icon.size}px)`);
    }
  } finally {
    await browser.close();
  }
}

await main();
