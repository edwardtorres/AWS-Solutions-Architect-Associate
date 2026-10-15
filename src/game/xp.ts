import type { Difficulty } from '../content/types';

/** XP for a correct answer the first time a question is answered. */
export const XP_BY_DIFFICULTY: Record<Difficulty, number> = { 1: 10, 2: 20, 3: 40 };
/** Any later answer to the same question earns a quarter (rounded). */
export const REPEAT_FACTOR = 0.25;
/** Paid once per building when it is commissioned. */
export const COMMISSION_BONUS = 50;

export function xpForAnswer(difficulty: Difficulty, correct: boolean, timesSeenBefore: number): number {
  if (!correct) return 0;
  const base = XP_BY_DIFFICULTY[difficulty];
  return timesSeenBefore > 0 ? Math.round(base * REPEAT_FACTOR) : base;
}
