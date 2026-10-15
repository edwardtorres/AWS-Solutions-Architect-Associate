import type { Question } from '../content/types';
import { eligible, type DrawMode } from '../questions/pool';
import type { AttemptKind } from '../save/schema';
import { RULES } from './scoring';

export interface DrawOptions {
  random: () => number;
  /** Question ids from the previous attempt of this kind on this building; avoided when the pool allows. */
  prevIds?: readonly string[];
  /** Times each question has been answered; less-seen questions are preferred. */
  seen?: Readonly<Record<string, number>>;
  /** The building's outline bullets, to spread the draw across them. */
  bullets?: readonly string[];
}

const MODE: Record<AttemptKind, DrawMode> = { startup: 'startup', inspection: 'inspection', placement: 'placement' };

/**
 * Draws the questions for an attempt from one building's live questions (never the mock reserve;
 * placement only from `placement-eligible` ones). Spreads over the building's bullets where it can,
 * avoids the previous attempt's questions, prefers less-seen ones, and for inspections guarantees at
 * least one question at difficulty 2 or higher.
 */
export function drawAttempt(kind: AttemptKind, building: string, bank: readonly Question[], opts: DrawOptions): Question[] {
  const n = RULES[kind].total;
  const prev = new Set(opts.prevIds ?? []);
  const seen = opts.seen ?? {};
  const pool = eligible(bank, MODE[kind]).filter((q) => q.building === building);
  // Rank: not in the previous attempt first, then least seen, then random.
  const rank = new Map<string, number>();
  for (const q of pool) rank.set(q.id, (prev.has(q.id) ? 1_000_000 : 0) + (seen[q.id] ?? 0) * 1000 + opts.random());
  const better = (a: Question, b: Question) => (rank.get(a.id) as number) - (rank.get(b.id) as number);
  const sorted = [...pool].sort(better);
  // Avoiding the previous attempt wins over bullet spread when enough fresh questions exist.
  const fresh = sorted.filter((q) => !prev.has(q.id));
  const spread = fresh.length >= n ? fresh : sorted;

  const picked: Question[] = [];
  const has = (q: Question) => picked.some((p) => p.id === q.id);
  const bullets = [...(opts.bullets ?? [])];
  // Visit bullets in random order so a 2-question start-up check does not always use the first bullets.
  const order = bullets.map((b) => ({ b, r: opts.random() })).sort((x, y) => x.r - y.r).map((x) => x.b);
  for (const b of order) {
    if (picked.length >= n) break;
    const cand = spread.find((q) => !has(q) && q.bullets.includes(b) && !picked.some((p) => p.bullets.includes(b)));
    if (cand) picked.push(cand);
  }
  for (const q of sorted) {
    if (picked.length >= n) break;
    if (!has(q)) picked.push(q);
  }

  if (kind === 'inspection' && !picked.some((q) => q.difficulty >= 2)) {
    const harder = spread.find((q) => !has(q) && q.difficulty >= 2);
    if (harder && picked.length > 0) {
      // Replace the pick whose bullets are best covered by the others, preferring the worst-ranked.
      const idx = [...picked.keys()].reverse().find((i) => (picked[i] as Question).bullets.every((b) => picked.some((p, j) => j !== i && p.bullets.includes(b)))) ?? picked.length - 1;
      picked[idx] = harder;
    }
  }
  // Present in random order.
  return picked.map((q) => ({ q, r: opts.random() })).sort((x, y) => x.r - y.r).map((x) => x.q);
}
