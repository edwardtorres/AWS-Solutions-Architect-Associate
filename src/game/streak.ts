import { addDays, type DayKey } from './day';
import { STREAK_DAY_QUESTIONS } from './scoring';

export interface StreakInfo {
  /** Consecutive counted days ending today, or ending yesterday while today has not counted yet. */
  current: number;
  /** True when today already counts. */
  countedToday: boolean;
}

export const dayCounts = (days: Readonly<Record<string, number>>, day: DayKey): boolean => (days[day] ?? 0) >= STREAK_DAY_QUESTIONS;

export function streakInfo(days: Readonly<Record<string, number>>, today: DayKey): StreakInfo {
  const countedToday = dayCounts(days, today);
  let cursor = countedToday ? today : addDays(today, -1);
  let current = 0;
  while (dayCounts(days, cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return { current, countedToday };
}

/** Longest run of consecutive counted days anywhere in the history. */
export function longestStreak(days: Readonly<Record<string, number>>): number {
  const counted = Object.keys(days).filter((d) => dayCounts(days, d)).sort();
  let best = 0;
  let run = 0;
  let prev: DayKey | null = null;
  for (const d of counted) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}
