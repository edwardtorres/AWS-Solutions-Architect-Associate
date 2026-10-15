import type { Save } from '../save/schema';
import { type DayKey } from './day';
import type { GameEnv } from './env';
import { stateOf } from './lifecycle';
import { longestStreak, streakInfo } from './streak';

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
}

export const BADGES: readonly BadgeDef[] = [
  { id: 'district-citadel', name: 'Citadel Secured', description: 'Every building in The Citadel is commissioned.' },
  { id: 'district-harbor', name: 'Harbor Master', description: 'Every building in Harbor & Levees is commissioned.' },
  { id: 'district-express', name: 'Express Operator', description: 'Every building in the Express Quarter is commissioned.' },
  { id: 'district-treasury', name: 'Treasurer', description: 'Every building in The Treasury is commissioned.' },
  { id: 'foundations', name: 'Cornerstone', description: 'All Foundations in Founders’ Square are commissioned.' },
  { id: 'portfolio', name: 'Portfolio Proven', description: 'Every portfolio building is placed or commissioned.' },
  { id: 'flawless', name: 'Flawless Inspection', description: 'Pass an inspection with all 5 questions right.' },
  { id: 'streak-7', name: 'Week of Work', description: 'A 7-day streak (10 questions a day).' },
  { id: 'streak-30', name: 'Month of Mortar', description: 'A 30-day streak (10 questions a day).' },
  { id: 'whole-city', name: 'Region Complete', description: 'Every building in the city is commissioned.' },
];

export const BADGE_BY_ID: ReadonlyMap<string, BadgeDef> = new Map(BADGES.map((b) => [b.id, b]));

export interface BadgeContext {
  /** True when the attempt that just finished was an inspection passed 5 of 5. */
  flawlessInspection?: boolean;
}

/** Badge ids that should be held now. Earned badges are never revoked, so callers add only the new ones. */
export function earnedBadges(save: Save, env: GameEnv, today: DayKey, ctx: BadgeContext = {}): string[] {
  const done = (id: string) => stateOf(save, id, env) === 'commissioned';
  const allIn = (ids: readonly string[]) => ids.length > 0 && ids.every(done);
  const out: string[] = [];
  for (const d of ['citadel', 'harbor', 'express', 'treasury']) {
    if (allIn(env.buildingIds.filter((b) => env.districtOf(b) === d))) out.push(`district-${d}`);
  }
  if (allIn(env.buildingIds.filter((b) => env.districtOf(b) === 'square'))) out.push('foundations');
  if (allIn([...env.portfolio])) out.push('portfolio');
  if (ctx.flawlessInspection) out.push('flawless');
  const streak = Math.max(streakInfo(save.game.days, today).current, longestStreak(save.game.days), save.game.bestStreak);
  if (streak >= 7) out.push('streak-7');
  if (streak >= 30) out.push('streak-30');
  if (allIn(env.buildingIds)) out.push('whole-city');
  return out;
}
