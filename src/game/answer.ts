import type { Question } from '../content/types';
import type { GameState, LogKind, Save } from '../save/schema';
import { LOG_CAP } from '../save/schema';
import { earnedBadges } from './badges';
import { today } from './day';
import type { Ctx } from './engine';
import { recordResult, trapPairs } from './history';
import { longestStreak } from './streak';
import { xpForAnswer } from './xp';

/**
 * The bookkeeping every answered question shares (XP with the repeat rule, seen count, the day count for streaks, the audit log, the
 * per-item history, the readiness lists, the per-bullet, trap and maintenance figures). The caller stores the answer itself.
 */
export function applyAnswer(g: GameState, q: Question, correct: boolean, kind: LogKind, ctx: Pick<Ctx, 'env' | 'clock'>): { game: GameState; xp: number } {
  const seenBefore = g.seen[q.id] ?? 0;
  const xp = xpForAnswer(q.difficulty, correct, seenBefore);
  const at = ctx.clock.now().toISOString();
  const day = today(ctx.clock);
  const days = { ...g.days, [day]: (g.days[day] ?? 0) + 1 };
  const game: GameState = {
    ...g,
    xp: g.xp + xp,
    seen: { ...g.seen, [q.id]: seenBefore + 1 },
    days,
    bestStreak: Math.max(g.bestStreak, longestStreak(days)),
    log: [...g.log, [q.id, correct ? 1 : 0, at, kind] as GameState['log'][number]].slice(-LOG_CAP),
    ...recordResult(g, { id: q.id, ok: correct, kind, at, domain: ctx.env.domainOf(q.building), bullets: q.bullets, traps: trapPairs(q.tags), building: q.building }),
  };
  return { game, xp };
}

/** Awards any badge the save now qualifies for and returns the ids that are new. */
export function awardBadges(save: Save, ctx: Pick<Ctx, 'env' | 'clock'>): { save: Save; newBadges: string[] } {
  const at = ctx.clock.now().toISOString();
  const have = new Set(Object.keys(save.game.badges));
  const newBadges = earnedBadges(save, ctx.env, today(ctx.clock)).filter((id) => !have.has(id));
  if (newBadges.length === 0) return { save, newBadges };
  return { save: { ...save, game: { ...save.game, badges: { ...save.game.badges, ...Object.fromEntries(newBadges.map((id) => [id, at])) } } }, newBadges };
}
