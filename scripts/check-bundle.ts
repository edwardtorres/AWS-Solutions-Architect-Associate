/**
 * Proves the production bundle has no dev hooks, no external origins, a strict CSP,
 * self-hosted fonts and split chunks. Run after `npm run build`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkBundle, type BundleFile } from './lib/bundleChecks.ts';

const dist = process.argv[2] ?? fileURLToPath(new URL('../dist', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

if (!existsSync(dist)) {
  console.error('check:bundle FAILED: dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

const files: BundleFile[] = walk(dist).map((p) => ({
  path: relative(dist, p).split('\\').join('/'),
  content: /\.(woff2?|png|jpg|ico)$/.test(p) ? '' : readFileSync(p, 'utf8'),
}));
const problems = checkBundle(files);
// The cited paragraphs (content/page-paragraphs.json) serve the content checks only. Sample multi-sentence paragraphs (a single
// sentence can be quoted in a note, so it proves nothing) and fail if any appears in the build.
const store = JSON.parse(readFileSync(new URL('../content/page-paragraphs.json', import.meta.url), 'utf8')) as { pages: Record<string, { t: string[] }> };
const long = Object.values(store.pages).flatMap((page) => page.t).filter((t) => t.length >= 200 && (t.match(/\. /g) ?? []).length >= 2);
const step = Math.max(1, Math.floor(long.length / 40));
const sampled = long.filter((_, i) => i % step === 0).slice(0, 40);
for (const t of sampled) if (files.some((f) => f.content.includes(t))) problems.push(`a cited paragraph from content/page-paragraphs.json is in the build: "${t.slice(0, 80)}…"`);
if (problems.length > 0) {
  console.error(`check:bundle FAILED (${problems.length}):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`check:bundle OK: ${files.length} files, dev hooks absent, no external origins, strict CSP, local fonts, split chunks, ${sampled.length} cited paragraphs absent`);
