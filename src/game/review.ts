import type { ItemHistory } from '../save/schema';
import { addDays, localDay, type DayKey } from './day';

/**
 * Spaced review (recorded in CLAUDE.md). A question's next review day is the local day of its last answer plus an interval:
 * a miss comes back the next day; a run of correct answers spaces it out. Everything is computed from `game.history`, never from the capped log.
 */
export const INTERVALS = [1, 2, 4, 7, 14, 30] as const;
/** Review answers per local day (due questions first, then a top-up from the weakest bullets). */
export const DAILY_CAP = 25;
/** Questions in a maintenance set. */
export const MAINT_SET = 5;

/** Days until the next review: 1 after a miss; otherwise by the current run of correct answers (1, 2, 4, 7, 14, then 30 for every longer run). */
export function intervalDays(h: Pick<ItemHistory, 'lastOk' | 'streak'>): number {
  if (h.lastOk === 0 || h.streak <= 0) return INTERVALS[0];
  return INTERVALS[Math.min(h.streak, INTERVALS.length) - 1] as number;
}

export const isPuzzleId = (id: string): boolean => id.startsWith('puzzle-');

/** The local day an item is due: the day of its last answer in the player's zone plus its interval. */
export function dueDay(h: ItemHistory, timeZone?: string): DayKey {
  return addDays(localDay(new Date(h.last), timeZone), intervalDays(h));
}

export interface DueItem {
  id: string;
  due: DayKey;
  /** Days past the due day (0 = due today). */
  overdue: number;
  streak: number;
}

const dayNumber = (d: DayKey): number => {
  const [y, m, dd] = d.split('-').map(Number) as [number, number, number];
  return Math.round(Date.UTC(y, m - 1, dd) / 86_400_000);
};

/**
 * The questions due on or before `today`, most overdue first, then the lower correct run. Only ids `eligible` accepts are listed
 * (the caller passes the live, non-reserve questions of the loaded bank); puzzle ids are never reviewed.
 */
export function dueQueue(history: Readonly<Record<string, ItemHistory>>, eligible: (id: string) => boolean, today: DayKey, timeZone?: string): DueItem[] {
  const out: DueItem[] = [];
  for (const [id, h] of Object.entries(history)) {
    if (isPuzzleId(id) || !eligible(id)) continue;
    const due = dueDay(h, timeZone);
    if (dayNumber(due) <= dayNumber(today)) out.push({ id, due, overdue: dayNumber(today) - dayNumber(due), streak: h.streak });
  }
  return out.sort((a, b) => b.overdue - a.overdue || a.streak - b.streak || (a.id < b.id ? -1 : 1));
}

/** How many review answers are left today under the cap. */
export function remainingToday(reviewDay: { day: string; done: number }, today: DayKey): number {
  return Math.max(0, DAILY_CAP - (reviewDay.day === today ? reviewDay.done : 0));
}
