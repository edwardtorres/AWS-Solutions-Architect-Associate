/**
 * npx tsx scripts/check-puzzles.ts [type...]
 * Runs the puzzle checks for the given types (default: every type that exists, with minimum counts required only for
 * types named on the command line). Rule and fact quotes are verified against the live pages by `npm run check:links`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BUILDINGS } from '../src/data/buildings.ts';
import { OUTLINE_DOMAINS } from '../src/data/outline.ts';
import { PUZZLE_TYPES, type PuzzleType } from '../src/puzzles/types.ts';
import { BANNED_TERMS } from './banned-terms.ts';
import { loadPuzzles } from './lib/loadPuzzles.ts';
import { loadNotesBundle, loadQuestionsBundle } from './lib/loadNotes.ts';
import { checkPuzzles } from './lib/puzzleChecks.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const json = <T>(f: string) => JSON.parse(readFileSync(`${root}${f}`, 'utf8')) as T;
const args = process.argv.slice(2) as PuzzleType[];
const bundle = await loadNotesBundle();
const qb = await loadQuestionsBundle();
const modules = await loadPuzzles();
const problems = checkPuzzles({
  modules,
  buildings: BUILDINGS,
  bulletIds: new Set(OUTLINE_DOMAINS.flatMap((d) => d.tasks.flatMap((t) => t.bullets.map((b) => b.id)))),
  sources: bundle.sources,
  banned: BANNED_TERMS,
  queue: json('content/needs-verification.json'),
  services: json('scripts/official-services.json'),
  shortNames: json<{ items: { short: string; full: string }[] }>('scripts/official-short-names.json').items,
  postGuide: qb.postGuide,
  require: args.length > 0 ? args : [],
});
for (const t of args) if (!PUZZLE_TYPES.includes(t)) problems.push(`unknown puzzle type ${t}`);
if (problems.length > 0) {
  console.error(`check:puzzles FAILED (${problems.length}):`);
  for (const x of problems) console.error(`  - ${x}`);
  process.exit(1);
}
console.log(`check:puzzles OK: ${[...modules.keys()].join(', ') || 'no puzzle types yet'}; ${[...modules.values()].reduce((n, m) => n + m.scenarios.length, 0)} scenarios`);
