/**
 * npx tsx scripts/questions-stats.ts [--md]
 * Counts for the audit: per bullet, building and domain (with shares), format and difficulty mix,
 * answer-position distributions, placement-eligible and mock-reserve counts, trap tags.
 */
import { BUILDINGS } from '../src/data/buildings.ts';
import { loadQuestionsBundle } from './lib/loadNotes.ts';

const pct = (n: number, d: number) => (d === 0 ? '0.0%' : `${((n / d) * 100).toFixed(1)}%`);

async function main() {
  const { questions } = await loadQuestionsBundle();
  const byB = new Map(BUILDINGS.map((b) => [b.id, b]));
  const live = questions.filter((q) => !q.tags.includes('mock-reserve'));
  const reserve = questions.filter((q) => q.tags.includes('mock-reserve'));
  const domain = (q: (typeof questions)[number]) => byB.get(q.building)?.district ?? '?';
  const out: string[] = [];

  out.push(`Total ${questions.length}: ${live.length} live, ${reserve.length} mock-reserve`);
  out.push('', '## Domains (Foundations excluded from shares)');
  const dq = questions.filter((q) => domain(q) !== 'square');
  for (const d of ['citadel', 'harbor', 'express', 'treasury']) {
    const all = dq.filter((q) => domain(q) === d);
    const lv = all.filter((q) => !q.tags.includes('mock-reserve'));
    out.push(`${d}: ${all.length} total (${pct(all.length, dq.length)}), ${lv.length} live (${pct(lv.length, dq.filter((q) => !q.tags.includes('mock-reserve')).length)}), ${all.length - lv.length} reserve (${pct(all.length - lv.length, reserve.length)})`);
  }
  out.push(`square (Foundations): ${questions.filter((q) => domain(q) === 'square').length}`);

  out.push('', '## Buildings (live / reserve / placement-eligible)');
  for (const b of BUILDINGS) {
    const l = live.filter((q) => q.building === b.id);
    out.push(`${b.district}/${b.id}: ${l.length} / ${reserve.filter((q) => q.building === b.id).length} / ${l.filter((q) => q.tags.includes('placement-eligible')).length}${b.portfolio ? ' (portfolio)' : ''}`);
  }

  out.push('', '## Bullets (live)');
  for (const b of BUILDINGS) for (const id of b.bullets) out.push(`${id} (${b.id}): ${live.filter((q) => q.bullets.includes(id)).length}`);

  const mc = questions.filter((q) => q.format === 'mc');
  const mr = questions.filter((q) => q.format === 'mr');
  out.push('', '## Mix', `multiple choice ${mc.length} (${pct(mc.length, questions.length)}), multiple response ${mr.length} (${pct(mr.length, questions.length)})`);
  for (const d of [1, 2, 3]) out.push(`difficulty ${d}: ${questions.filter((q) => q.difficulty === d).length} (${pct(questions.filter((q) => q.difficulty === d).length, questions.length)})`);

  out.push('', '## Answer positions');
  for (const scope of ['all', 'citadel', 'harbor', 'express', 'treasury', 'square']) {
    const m = mc.filter((q) => scope === 'all' || domain(q) === scope);
    if (m.length === 0) continue;
    const pos = [0, 1, 2, 3].map((i) => m.filter((q) => q.options[i]?.correct).length);
    const longest = m.filter((q) => {
      const max = Math.max(...q.options.map((o) => o.text.length));
      const top = q.options.filter((o) => o.text.length === max);
      return top.length === 1 && top[0]?.correct;
    }).length;
    out.push(`MC ${scope} (${m.length}): ${pos.map((n, i) => `opt${i + 1} ${pct(n, m.length)}`).join(', ')}; strictly longest correct ${pct(longest, m.length)}`);
    const r = mr.filter((q) => scope === 'all' || domain(q) === scope);
    if (r.length > 0) {
      const cells = [0, 1, 2, 3, 4, 5].map((i) => {
        const have = r.filter((q) => q.options.length > i);
        return have.length === 0 ? null : `opt${i + 1} ${pct(have.filter((q) => q.options[i]?.correct).length, have.length)} of ${have.length}`;
      });
      out.push(`MR ${scope} (${r.length}): ${cells.filter(Boolean).join(', ')}`);
    }
  }

  out.push('', '## Tags');
  out.push(`placement-eligible: ${questions.filter((q) => q.tags.includes('placement-eligible')).length}`);
  const traps = new Map<string, number>();
  for (const q of questions) for (const t of q.tags) if (t.startsWith('trap:')) traps.set(t, (traps.get(t) ?? 0) + 1);
  out.push(`trap tags: ${[...traps].sort().map(([k, v]) => `${k.slice(5)} ${v}`).join(', ')}`);
  console.log(out.join('\n'));
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
