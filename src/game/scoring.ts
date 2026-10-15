export { isCorrect } from '../questions/present';

/** Pass rules per attempt type: how many questions, how many must be right. */
export const RULES = {
  startup: { total: 2, need: 2 },
  inspection: { total: 5, need: 4 },
  placement: { total: 5, need: 5 },
} as const;

/** A second failed inspection on one building in one local day locks it until the next local day. */
export const INSPECTION_FAILS_BEFORE_LOCK = 2;
/** Questions that must be answered in a local day for it to count towards the streak. */
export const STREAK_DAY_QUESTIONS = 10;
