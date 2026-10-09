import type { Question } from '../content/types';

/**
 * Every selection of questions goes through this module. The mock reserve (tag `mock-reserve`) is
 * only reachable with the `mock` mode; no other mode can return one. An ESLint rule and
 * check:content keep the rest of the app from importing question data directly.
 */
export type DrawMode = 'startup' | 'inspection' | 'placement' | 'review' | 'debrief' | 'browse' | 'mock';

export const RESERVE_TAG = 'mock-reserve';
export const PLACEMENT_TAG = 'placement-eligible';

export const isReserve = (q: Question): boolean => q.tags.includes(RESERVE_TAG);

/** Questions a mode may use. */
export function eligible(questions: readonly Question[], mode: DrawMode): Question[] {
  switch (mode) {
    case 'mock':
      return [...questions];
    case 'placement':
      return questions.filter((q) => !isReserve(q) && q.tags.includes(PLACEMENT_TAG));
    default:
      return questions.filter((q) => !isReserve(q));
  }
}

export interface Where {
  building?: string;
  bullet?: string;
  district?: ReadonlySet<string>;
}

/** Draws up to `count` distinct questions for a mode, in random order. */
export function draw(
  questions: readonly Question[],
  mode: DrawMode,
  count: number,
  random: () => number,
  where: Where = {},
): Question[] {
  const pool = eligible(questions, mode).filter(
    (q) => (!where.building || q.building === where.building) && (!where.bullet || q.bullets.includes(where.bullet)),
  );
  const out = [...pool];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = out[i] as Question;
    out[i] = out[j] as Question;
    out[j] = a;
  }
  return out.slice(0, Math.max(0, count));
}

const loaders: Record<string, () => Promise<{ questions: Question[] }>> = {
  square: () => import('./district-square'),
  citadel: () => import('./district-citadel'),
  harbor: () => import('./district-harbor'),
  express: () => import('./district-express'),
  treasury: () => import('./district-treasury'),
};

let all: Promise<Question[]> | null = null;

/** Loads every question lazily (one chunk per district). */
export function loadQuestions(): Promise<Question[]> {
  all ??= Promise.all(Object.values(loaders).map((l) => l())).then((mods) => mods.flatMap((m) => m.questions));
  return all;
}
