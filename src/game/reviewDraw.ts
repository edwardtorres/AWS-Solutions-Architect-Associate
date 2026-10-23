import type { Question } from '../content/types';
import { eligible } from '../questions/pool';
import type { Save } from '../save/schema';
import { localDay, type DayKey } from './day';
import type { Ctx } from './engine';
import { dueQueue, MAINT_SET, remainingToday } from './review';
import { rankBullets } from './weak';

// Names the mock-reserve tag through the question pool, so it loads with the question bank, never in the first chunk.

/** Live (non-reserve) questions by id. */
export function liveIndex(bank: readonly Question[]): Map<string, Question> {
  return new Map(eligible(bank, 'review').map((q) => [q.id, q]));
}

export interface ReviewPlan {
  questions: Question[];
  /** How many of them are due now (the rest are a top-up from the weakest bullets). */
  due: number;
  dueTotal: number;
  remaining: number;
}

function shuffled<T>(list: readonly T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/**
 * Today's review: the due questions (most overdue first) up to what is left of the daily cap; when fewer are due, the rest is topped
 * up from the weakest bullets, one question per bullet per pass, least-seen first, skipping what was answered today. Mock-reserve
 * questions are never included.
 */
export function planReview(save: Save, bank: readonly Question[], today: DayKey, ctx: Pick<Ctx, 'env' | 'clock'>, random: () => number): ReviewPlan {
  const live = liveIndex(bank);
  const remaining = remainingToday(save.game.reviewDay, today);
  const queue = dueQueue(save.game.history, (id) => live.has(id), today, ctx.clock.timeZone);
  const chosen = queue.slice(0, remaining).map((d) => live.get(d.id) as Question);
  if (chosen.length < remaining) {
    const taken = new Set(queue.map((d) => d.id));
    const answeredToday = new Set(Object.entries(save.game.history).filter(([, h]) => localDay(new Date(h.last), ctx.clock.timeZone) === today).map(([id]) => id));
    const all = ctx.env.buildingIds.flatMap((b) => ctx.env.bulletsOf(b));
    const ranked = rankBullets(save.game.byBullet, all);
    // Bullets with any data come first (weakest first); with no data at all, every bullet in a random order.
    const withData = ranked.filter((s) => s.n > 0).map((s) => s.bullet);
    const order = withData.length > 0 ? withData : shuffled(all, random);
    const pool = new Map<string, Question[]>();
    for (const q of live.values()) {
      if (taken.has(q.id) || answeredToday.has(q.id)) continue;
      for (const b of q.bullets) (pool.get(b) ?? pool.set(b, []).get(b)!).push(q);
    }
    // Shuffle once, then use stable sorting for ties. Randomness inside a comparator is not transitive.
    for (const [bullet, list] of pool) pool.set(bullet, shuffled(list, random).sort((a, b) => (save.game.seen[a.id] ?? 0) - (save.game.seen[b.id] ?? 0)));
    const have = new Set(chosen.map((q) => q.id));
    for (let pass = 0; chosen.length < remaining && pass < 50; pass += 1) {
      let added = false;
      for (const b of order) {
        if (chosen.length >= remaining) break;
        const next = (pool.get(b) ?? []).find((q) => !have.has(q.id));
        if (next) {
          chosen.push(next);
          have.add(next.id);
          added = true;
        }
      }
      if (!added) break;
    }
  }
  return { questions: chosen, due: Math.min(queue.length, remaining), dueTotal: queue.length, remaining };
}

/** Five questions for a building: its live questions, recent misses first, then the least accurate, then the least seen. */
export function planMaintenance(save: Save, building: string, bank: readonly Question[], random: () => number): Question[] {
  const pool = [...liveIndex(bank).values()].filter((q) => q.building === building);
  const rank = (q: Question): number => {
    const h = save.game.history[q.id];
    if (!h) return 3;
    if (h.lastOk === 0) return 0;
    return h.ok / h.n < 1 ? 1 : 2;
  };
  const priority = (q: Question) => {
    const h = save.game.history[q.id];
    return rank(q) === 0 ? -Date.parse(h!.last) : rank(q) === 1 ? h!.ok / h!.n : (save.game.seen[q.id] ?? 0);
  };
  // Compare categories separately so large seen counts can never override a recent miss or accuracy.
  return shuffled(pool, random).sort((a, b) => rank(a) - rank(b) || priority(a) - priority(b)).slice(0, MAINT_SET);
}
