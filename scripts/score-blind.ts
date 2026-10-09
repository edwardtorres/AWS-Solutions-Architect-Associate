/**
 * npx tsx scripts/score-blind.ts <district|building>
 * Compares the blind reviewer's picks (docs/reviews/<district>/blind-<building>.json, as
 * [{id, picks:["A","C"], ambiguous?:boolean, note?:string}]) with the keys.
 * Lists every disagreement, ambiguity flag and missing answer; exits 1 if any exist.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BUILDINGS } from '../src/data/buildings.ts';
import { loadQuestionsBundle } from './lib/loadNotes.ts';

interface Pick {
  id: string;
  picks: string[];
  ambiguous?: boolean;
  note?: string;
}

const root = fileURLToPath(new URL('../', import.meta.url));

async function main() {
  const arg = process.argv[2];
  if (!arg) throw new Error('usage: score-blind.ts <district|building>');
  const { questions } = await loadQuestionsBundle();
  const ids = BUILDINGS.some((b) => b.district === arg) ? BUILDINGS.filter((b) => b.district === arg).map((b) => b.id) : [arg];
  let total = 0;
  let agree = 0;
  const disputed: { id: string; why: string; note?: string }[] = [];
  for (const building of ids) {
    const list = questions.filter((q) => q.building === building);
    if (list.length === 0) continue;
    const district = BUILDINGS.find((b) => b.id === building)?.district as string;
    const file = `${root}docs/reviews/${district}/blind-${building}.json`;
    if (!existsSync(file)) {
      for (const q of list) disputed.push({ id: q.id, why: 'no blind answer' });
      total += list.length;
      continue;
    }
    const picks = new Map((JSON.parse(readFileSync(file, 'utf8')) as Pick[]).map((p) => [p.id, p]));
    const maps = new Map((JSON.parse(readFileSync(`${root}.cache/blind/${building}.map.json`, 'utf8')) as { id: string; labels: Record<string, number> }[]).map((m) => [m.id, m.labels]));
    for (const q of list) {
      total += 1;
      const p = picks.get(q.id);
      const labels = maps.get(q.id);
      if (!p || !labels) {
        disputed.push({ id: q.id, why: 'no blind answer' });
        continue;
      }
      const chosen = new Set(p.picks.map((l) => labels[l]));
      const keyed = q.options.flatMap((o, i) => (o.correct ? [i] : []));
      const same = chosen.size === keyed.length && keyed.every((i) => chosen.has(i));
      if (same && !p.ambiguous) agree += 1;
      else disputed.push({ id: q.id, why: same ? 'flagged ambiguous' : 'different answer', ...(p.note ? { note: p.note } : {}) });
    }
  }
  console.log(`blind review ${arg}: ${agree} of ${total} agree and are unambiguous; ${disputed.length} to resolve`);
  for (const d of disputed) console.log(`  - ${d.id}: ${d.why}${d.note ? ` (${d.note})` : ''}`);
  writeFileSync(`${root}.cache/blind/score-${arg}.json`, `${JSON.stringify({ total, agree, disputed }, null, 1)}\n`);
  if (disputed.length > 0) process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
