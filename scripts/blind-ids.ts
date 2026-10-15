/**
 * npx tsx scripts/blind-ids.ts export   -> .cache/blind/post-guide${tag}.json (give to the reviewer) and .map.json (never)
 * npx tsx scripts/blind-ids.ts score    -> compares docs/reviews/post-guide/blind.json with the keys
 * The question ids come from docs/reviews/post-guide/ids.txt (the post-guide rewrites).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mulberry32, shuffle } from '../src/lib/shuffle.ts';
import { loadQuestionsBundle } from './lib/loadNotes.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const LABELS = 'ABCDEFGH';
const seedOf = (id: string) => [...id].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;

const tag = process.argv[3] ?? '';
const ids = readFileSync(`${root}docs/reviews/post-guide/ids${tag}.txt`, 'utf8').split('\n').filter(Boolean);
const { questions } = await loadQuestionsBundle();
const list = ids.map((id) => questions.find((q) => q.id === id)).filter((q) => q !== undefined);

if (process.argv[2] === 'export') {
  mkdirSync(`${root}.cache/blind/`, { recursive: true });
  const view = list.map((q) => {
    const order = shuffle(q.options.map((_, i) => i), mulberry32(seedOf(q.id)));
    return {
      q: { id: q.id, choose: q.select, stem: q.stem, options: order.map((i, n) => ({ label: LABELS[n], text: q.options[i]?.text })) },
      map: { id: q.id, labels: Object.fromEntries(order.map((i, n) => [LABELS[n] as string, i])) },
    };
  });
  writeFileSync(`${root}.cache/blind/post-guide${tag}.json`, `${JSON.stringify(view.map((v) => v.q), null, 1)}\n`);
  writeFileSync(`${root}.cache/blind/post-guide${tag}.map.json`, `${JSON.stringify(view.map((v) => v.map))}\n`);
  console.log(`${list.length} questions -> .cache/blind/post-guide${tag}.json`);
} else {
  const picks = new Map((JSON.parse(readFileSync(`${root}docs/reviews/post-guide/blind${tag}.json`, 'utf8')) as { id: string; picks: string[]; ambiguous?: boolean; note?: string }[]).map((p) => [p.id, p]));
  const maps = new Map((JSON.parse(readFileSync(`${root}.cache/blind/post-guide${tag}.map.json`, 'utf8')) as { id: string; labels: Record<string, number> }[]).map((m) => [m.id, m.labels]));
  let agree = 0;
  const disputed: string[] = [];
  for (const q of list) {
    const p = picks.get(q.id);
    const labels = maps.get(q.id);
    if (!p || !labels) { disputed.push(`${q.id}: no blind answer`); continue; }
    const chosen = new Set(p.picks.map((l) => labels[l]));
    const keyed = q.options.flatMap((o, i) => (o.correct ? [i] : []));
    const same = chosen.size === keyed.length && keyed.every((i) => chosen.has(i));
    if (same && !p.ambiguous) agree += 1;
    else disputed.push(`${q.id}: ${same ? 'flagged ambiguous' : 'different answer'}${p.note ? ` (${p.note})` : ''}`);
  }
  console.log(`post-guide blind review: ${agree} of ${list.length} agree and are unambiguous; ${disputed.length} to resolve`);
  for (const d of disputed) console.log(`  - ${d}`);
  if (disputed.length > 0) process.exit(1);
}
