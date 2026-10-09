/**
 * npx tsx scripts/check-building.ts <building>...
 * Runs the question checks for the given buildings only (writers use this while working):
 * every per-question rule, the 3-per-bullet and 8-per-building minimums, placement counts and near-duplicates.
 * Bank-wide balance for the building's questions is listed as "balance" so the writer can adjust slots.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BUILDINGS } from '../src/data/buildings.ts';
import { BANNED_TERMS } from './banned-terms.ts';
import { loadNotesBundle, loadQuestionsBundle } from './lib/loadNotes.ts';
import type { QueueEntry } from './lib/contentChecks.ts';
import { checkQuestions } from './lib/questionChecks.ts';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const readJson = <T>(p: string): T => JSON.parse(readFileSync(here(p), 'utf8')) as T;

async function main() {
  const ids = process.argv.slice(2);
  if (ids.length === 0) throw new Error('usage: check-building.ts <building>...');
  const outline = readJson<{ domains: { tasks: { bullets: { id: string }[] }[] }[] }>('./official-outline.json');
  const bulletIds = new Set(outline.domains.flatMap((d) => d.tasks.flatMap((t) => t.bullets.map((b) => b.id))));
  const bundle = await loadNotesBundle();
  const qb = await loadQuestionsBundle();
  const mine = BUILDINGS.filter((b) => ids.includes(b.id));
  if (mine.length !== ids.length) throw new Error(`unknown building in ${ids.join(', ')}`);
  const own = qb.questions.filter((q) => ids.includes(q.building));
  const problems = checkQuestions({
    questions: own,
    buildings: mine,
    bulletIds,
    sources: bundle.sources,
    confuse: bundle.confuse,
    queue: readJson<QueueEntry[]>('../content/needs-verification.json'),
    banned: BANNED_TERMS,
    services: readJson('./official-services.json'),
    shortNames: readJson<{ items: { short: string; full: string }[] }>('./official-short-names.json').items,
    era: qb.era,
    scope: new Set(mine.map((b) => b.district)),
  });
  const live = own.filter((q) => !q.tags.includes('mock-reserve'));
  console.log(`${ids.join(', ')}: ${own.length} questions (${live.length} live, ${own.length - live.length} reserve), ${own.filter((q) => q.format === 'mr').length} multiple response`);
  if (problems.length > 0) {
    for (const p of problems) console.log(`  - ${p}`);
    process.exit(1);
  }
  console.log('  OK');
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
