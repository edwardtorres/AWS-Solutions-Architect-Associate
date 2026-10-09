/**
 * npx tsx scripts/rebalance-slots.ts <district|building>... [--dry]
 * Rewrites only the numeric `slot:` / `slots:` literals in content/questions so that the authored
 * position of the correct options is evenly spread (multiple choice cycles 0-3; multiple response
 * cycles through the possible position sets). Question wording is never touched.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BUILDINGS } from '../src/data/buildings.ts';
import { loadQuestionsBundle } from './lib/loadNotes.ts';

function combos(n: number, k: number): number[][] {
  const out: number[][] = [];
  const rec = (start: number, cur: number[]) => {
    if (cur.length === k) {
      out.push([...cur]);
      return;
    }
    for (let i = start; i < n; i += 1) rec(i + 1, [...cur, i]);
  };
  rec(0, []);
  return out;
}

async function main() {
  const dry = process.argv.includes('--dry');
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (args.length === 0) throw new Error('usage: rebalance-slots.ts <district|building>... [--dry]');
  const { questions } = await loadQuestionsBundle();
  const byId = new Map(BUILDINGS.map((b) => [b.id, b]));
  const wanted = new Set(args.flatMap((a) => (BUILDINGS.some((b) => b.district === a) ? BUILDINGS.filter((b) => b.district === a).map((b) => b.id) : [a])));
  const list = questions.filter((q) => wanted.has(q.building)).sort((a, b) => a.id.localeCompare(b.id));
  const root = fileURLToPath(new URL('../content/questions/', import.meta.url));
  let mcN = 0;
  let mrN = 0;
  const edits = new Map<string, string>();
  for (const q of list) {
    const district = byId.get(q.building)?.district as string;
    const file = `${root}${district}/${q.building}.ts`;
    let text = edits.get(file) ?? readFileSync(file, 'utf8');
    const start = text.indexOf(`id: '${q.id}'`);
    if (start < 0) throw new Error(`${q.id} not found in ${file}`);
    const next = text.indexOf("id: '", start + 5);
    const end = next < 0 ? text.length : next;
    const block = text.slice(start, end);
    let replaced: string;
    if (q.format === 'mc') {
      replaced = block.replace(/\bslot:\s*\d+/, `slot: ${mcN % 4}`);
      mcN += 1;
    } else {
      const all = combos(q.options.length, q.select);
      const pick = all[(mrN * 7 + Math.floor(mrN / all.length)) % all.length] as number[];
      replaced = block.replace(/\bslots:\s*\[[^\]]*\]/, `slots: [${pick.join(', ')}]`);
      mrN += 1;
    }
    if (replaced === block && !/\bslots?:/.test(block)) throw new Error(`${q.id}: no slot literal found`);
    text = text.slice(0, start) + replaced + text.slice(end);
    edits.set(file, text);
  }
  if (!dry) for (const [file, text] of edits) writeFileSync(file, text);
  console.log(`${dry ? 'would rewrite' : 'rewrote'} slots for ${mcN} multiple-choice and ${mrN} multiple-response questions in ${edits.size} files`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
