import type { Difficulty } from '../content/types';
import type { Save } from '../save/schema';
import { LOG_CAP } from '../save/schema';
import { today } from './day';
import { earnedBadges } from './badges';
import type { Ctx } from './engine';
import { recordResult } from './history';
import { stateOf } from './lifecycle';
import { longestStreak } from './streak';
import { xpForAnswer } from './xp';

export type WorkbenchAvailability = { ok: true } | { ok: false; message: string };

/** A building's Workbench opens once the building is surveyed (any state except planned). */
export function workbenchAvailability(save: Save, building: string, ctx: Pick<Ctx, 'env'>): WorkbenchAvailability {
  if (!ctx.env.buildingIds.includes(building)) return { ok: false, message: 'Unknown building.' };
  if (stateOf(save, building, ctx.env) === 'planned') return { ok: false, message: 'The Workbench opens once this building is surveyed: commission its prerequisite roads first.' };
  return { ok: true };
}

export interface PuzzlePlayResult {
  save: Save;
  xp: number;
  newBadges: string[];
}

/**
 * Records one puzzle play. Puzzles are practice: they earn XP like a question (a repeat earns a quarter), count towards
 * the daily streak, are logged with the attempt type `puzzle` and feed readiness (subject to the per-domain cap of 8 puzzle
 * plays in a window), but they never change a building's state. Returns null when the Workbench is not available.
 */
export function playPuzzle(save: Save, play: { id: string; building: string; difficulty: Difficulty; correct: boolean }, ctx: Ctx): PuzzlePlayResult | null {
  if (!workbenchAvailability(save, play.building, ctx).ok) return null;
  const g = save.game;
  const at = ctx.clock.now().toISOString();
  const day = today(ctx.clock);
  const seenBefore = g.seen[play.id] ?? 0;
  const xp = xpForAnswer(play.difficulty, play.correct, seenBefore);
  const days = { ...g.days, [day]: (g.days[day] ?? 0) + 1 };
  const game = {
    ...g,
    xp: g.xp + xp,
    seen: { ...g.seen, [play.id]: seenBefore + 1 },
    days,
    bestStreak: Math.max(g.bestStreak, longestStreak(days)),
    log: [...g.log, [play.id, play.correct ? 1 : 0, at, 'puzzle'] as Save['game']['log'][number]].slice(-LOG_CAP),
    ...recordResult(g, { id: play.id, ok: play.correct, kind: 'puzzle', at, domain: ctx.env.domainOf(play.building) }),
  };
  let next: Save = { ...save, game };
  const have = new Set(Object.keys(next.game.badges));
  const newBadges = earnedBadges(next, ctx.env, day).filter((id) => !have.has(id));
  if (newBadges.length > 0) next = { ...next, game: { ...next.game, badges: { ...next.game.badges, ...Object.fromEntries(newBadges.map((id) => [id, at])) } } };
  return { save: next, xp, newBadges };
}
