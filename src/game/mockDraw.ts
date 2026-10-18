import type { Question } from '../content/types';
import { eligible, isReserve } from '../questions/pool';
import type { ItemHistory } from '../save/schema';
import { localDay, type DayKey } from './day';
import { answeredRecently, quotas } from './mock';

// Names the mock-reserve tag through the question pool, so it loads with the question bank, never in the first chunk.

export interface DrawInput {
  bank: readonly Question[];
  history: Readonly<Record<string, ItemHistory>>;
  seen: Readonly<Record<string, number>>;
  startDay: DayKey;
  timeZone?: string;
  total: number;
  weights: Readonly<Record<number, number>>;
  /** Domain number 1 to 4 for a building, or null for a Foundation (Foundations are never drawn). */
  domainOf: (building: string) => number | null;
  /** Question ids of the previous mock (avoided where the pool allows). */
  lastMockIds: readonly string[];
  random: () => number;
}

export interface Drawn {
  questions: Question[];
  reserveUsed: number;
  /** Per domain: how many came from the reserve and how many from live questions. */
  perDomain: Record<number, { reserve: number; live: number }>;
}

function shuffled<T>(list: readonly T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** Round-robin over the bullets (random order each pass), taking each bullet's best-ranked candidate, until `n` are chosen. */
function spread(candidates: readonly Question[], n: number, rank: (q: Question) => number, random: () => number, already: ReadonlySet<string>): Question[] {
  const picked: Question[] = [];
  const taken = new Set(already);
  const byBullet = new Map<string, Question[]>();
  for (const q of candidates) for (const b of q.bullets) (byBullet.get(b) ?? byBullet.set(b, []).get(b)!).push(q);
  for (const list of byBullet.values()) list.sort((a, b) => rank(a) - rank(b));
  const bullets = shuffled([...byBullet.keys()], random);
  for (let pass = 0; picked.length < n && pass < 400; pass += 1) {
    let added = false;
    for (const b of bullets) {
      if (picked.length >= n) break;
      const next = (byBullet.get(b) ?? []).find((q) => !taken.has(q.id));
      if (next) {
        picked.push(next);
        taken.add(next.id);
        added = true;
      }
    }
    if (!added) break;
  }
  return picked;
}

/**
 * Draws a mock. Exact domain weights (largest remainder). Never a post-guide question (the pool's `mock` mode). Inside a domain the
 * reserve questions nobody has answered come first (so the first two mocks are fresh, and any reserve left after that goes next),
 * then live questions; both phases avoid the last mock's questions, prefer ones not answered in the last 14 days, then the least
 * seen, and spread round-robin across the domain's bullets. A domain short of reserve is completed from live questions, so the weights hold.
 */
export function drawMock(input: DrawInput): Drawn {
  const pool = eligible(input.bank, 'mock').filter((q) => input.domainOf(q.building) !== null);
  const last = new Set(input.lastMockIds);
  const rank = (q: Question): number => (last.has(q.id) ? 4_000_000 : 0) + (answeredRecently(input.history[q.id], input.startDay, input.timeZone) ? 1_000_000 : 0) + (input.seen[q.id] ?? 0) * 1000 + input.random();
  const quota = quotas(input.total, input.weights);
  const questions: Question[] = [];
  const perDomain: Drawn['perDomain'] = {};
  for (const d of Object.keys(quota).map(Number)) {
    const inDomain = pool.filter((q) => input.domainOf(q.building) === d);
    const reserve = inDomain.filter((q) => isReserve(q) && !input.history[q.id]);
    const live = inDomain.filter((q) => !isReserve(q));
    const n = quota[d] as number;
    const fromReserve = spread(reserve, n, rank, input.random, new Set());
    const fromLive = spread(live, n - fromReserve.length, rank, input.random, new Set(fromReserve.map((q) => q.id)));
    perDomain[d] = { reserve: fromReserve.length, live: fromLive.length };
    questions.push(...fromReserve, ...fromLive);
  }
  const reserveUsed = questions.filter(isReserve).length;
  return { questions: shuffled(questions, input.random), reserveUsed, perDomain };
}

export { localDay };
