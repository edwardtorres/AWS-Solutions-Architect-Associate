/** Publish only the scoped production build into the existing portfolio. */
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import process from 'node:process';
import console from 'node:console';

const portfolio = process.argv[2];
if (!portfolio || !existsSync(join(portfolio, 'work.html')) || !existsSync(join(portfolio, '_headers'))) {
  throw new Error('Usage: npm run copy:site -- <portfolio checkout> (must contain work.html and _headers)');
}
const html = readFileSync('dist/index.html', 'utf8');
const manifest = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8'));
if (!html.includes('/apps/region-builder/assets/') || manifest.scope !== '/apps/region-builder/') {
  throw new Error('Run npm run build:site before copying; this build must be scoped to /apps/region-builder/.');
}
const target = resolve(portfolio, 'apps/region-builder');
mkdirSync(target, { recursive: true });
// Retain previous hashed chunks so an already-open tab can still load lazy features during an update.
cpSync('dist', target, { recursive: true });
console.log(`Copied the scoped Region Builder build to ${target}`);
