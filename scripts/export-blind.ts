/**
 * npx tsx scripts/export-blind.ts <district|building> [more...]
 * Writes a keyless copy of the questions for the blind reviewer: stem, the number to choose and the options
 * in a seeded shuffled order labelled A, B, C... plus a private label map used only by score-blind.ts.
 *   .cache/blind/<building>.json       (give this to the reviewer)
 *   .cache/blind/<building>.map.json   (never give this to the reviewer)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BUILDINGS } from '../src/data/buildings.ts';
import { mulberry32, shuffle } from '../src/lib/shuffle.ts';
import { loadQuestionsBundle } from './lib/loadNotes.ts';

const LABELS = 'ABCDEFGH';
const out = fileURLToPath(new URL('../.cache/blind/', import.meta.url));

function seedOf(id: string): number {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) throw new Error('usage: export-blind.ts <district|building>...');
  const { questions } = await loadQuestionsBundle();
  mkdirSync(out, { recursive: true });
  const wanted = new Set(args.flatMap((a) => (BUILDINGS.some((b) => b.district === a) ? BUILDINGS.filter((b) => b.district === a).map((b) => b.id) : [a])));
  for (const id of wanted) {
    const list = questions.filter((q) => q.building === id);
    if (list.length === 0) continue;
    const view = list.map((q) => {
      const order = shuffle(q.options.map((_, i) => i), mulberry32(seedOf(q.id)));
      return {
        q: { id: q.id, choose: q.select, stem: q.stem, options: order.map((i, n) => ({ label: LABELS[n], text: q.options[i]?.text })) },
        map: { id: q.id, labels: Object.fromEntries(order.map((i, n) => [LABELS[n] as string, i])) },
      };
    });
    writeFileSync(`${out}${id}.json`, `${JSON.stringify(view.map((v) => v.q), null, 1)}\n`);
    writeFileSync(`${out}${id}.map.json`, `${JSON.stringify(view.map((v) => v.map))}\n`);
    console.log(`${id}: ${list.length} questions -> .cache/blind/${id}.json`);
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
