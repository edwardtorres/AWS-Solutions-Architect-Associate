/**
 * npx tsx scripts/check-labs.ts [lab-id-prefix ...] [--no-quotes]
 * Writer's loop for labs: runs the lab checks (and cfn-lint when templates exist) on the named labs only, then fetches the cited
 * pages and verifies every verbatim quote (steps, costs, traps). Without ids it checks every lab found.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUILDINGS } from '../src/data/buildings.ts';
import { BANNED_TERMS } from './banned-terms.ts';
import { checkLabs } from './lib/labChecks.ts';
import { loadLabs, TEMPLATE_DIR } from './lib/loadLabs.ts';
import { loadNotesBundle, loadQuestionsBundle } from './lib/loadNotes.ts';
import { fetchPage, hasText, stripFragment, type PageInfo } from './lib/pageCache.ts';
import { readFileSync } from 'node:fs';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const quotesOn = !process.argv.includes('--no-quotes');

const outline = JSON.parse(readFileSync(join(root, 'scripts/official-outline.json'), 'utf8')) as { domains: { tasks: { bullets: { id: string }[] }[] }[] };
const bulletIds = new Set(outline.domains.flatMap((d) => d.tasks.flatMap((t) => t.bullets.map((b) => b.id))));
const bundle = await loadNotesBundle();
const qb = await loadQuestionsBundle();
const all = await loadLabs();
const labs = args.length === 0 ? all.labs : all.labs.filter((l) => args.some((a) => l.id.startsWith(a)));
if (labs.length === 0) {
  console.error('no labs matched');
  process.exit(1);
}
const problems = checkLabs({ labs, allLabs: all.labs, templates: all.templates, sources: bundle.sources, buildings: BUILDINGS, bulletIds, confuse: bundle.confuse, banned: BANNED_TERMS, debriefPool: qb.questions.filter((q) => !q.tags.includes('mock-reserve')), complete: false });

// Templates of the chosen labs through cfn-lint.
const files = [...new Set(labs.flatMap((l) => l.templates ?? []))];
if (files.length > 0) {
  const local = join(root, '.cache/venv/bin/cfn-lint');
  const lint = existsSync(local) ? local : 'cfn-lint';
  const r = spawnSync(lint, files.map((f) => join(TEMPLATE_DIR, f)), { encoding: 'utf8' });
  if (r.status !== 0) problems.push(`cfn-lint:\n${r.stdout}${r.stderr}`);
}

if (quotesOn) {
  const byId = new Map(bundle.sources.map((s) => [s.id, s]));
  const cites = labs.flatMap((l) => [
    ...l.steps.map((s) => ({ where: `${l.id} step ${s.id}`, src: s.src, quote: s.quote })),
    ...l.costs.map((c) => ({ where: `${l.id} cost ${c.id}`, src: c.src, quote: c.quote })),
    ...l.traps.map((t) => ({ where: `${l.id} trap ${t.pair}`, src: t.src, quote: t.quote })),
    ...(l.gate?.cites ?? []).map((c, i) => ({ where: `${l.id} gate cite ${i + 1}`, src: c.src, quote: c.quote })),
  ]);
  const pages = new Map<string, PageInfo | Error>();
  for (const u of new Set(cites.map((c) => byId.get(c.src)?.url).filter((x): x is string => !!x).map(stripFragment))) {
    try {
      pages.set(u, await fetchPage(u, {}));
    } catch (e) {
      pages.set(u, e as Error);
    }
  }
  for (const c of cites) {
    const src = byId.get(c.src);
    if (!src) continue;
    const page = pages.get(stripFragment(src.url));
    if (!page || page instanceof Error) {
      problems.push(`${c.where}: cannot fetch ${src.url}`);
      continue;
    }
    if (page.status !== 200) problems.push(`${c.where}: ${src.url} returned ${page.status}`);
    const frag = src.url.includes('#') ? decodeURIComponent(src.url.slice(src.url.indexOf('#') + 1)) : '';
    if (frag && !page.ids.includes(frag)) problems.push(`${c.where}: anchor #${frag} not found on the page`);
    if (!hasText(page, c.quote)) problems.push(`${c.where}: quote not found on ${src.id}: "${c.quote.slice(0, 90)}"`);
  }
}

if (problems.length > 0) {
  console.error(`check-labs FAILED (${problems.length}):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`check-labs OK: ${labs.map((l) => l.id).join(', ')}`);
