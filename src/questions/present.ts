import type { Question, QuestionOption } from '../content/types';
import { renderRandom, shuffle } from '../lib/rng';

export interface PresentedOption {
  /** Index in the authored order, used for grading. */
  index: number;
  option: QuestionOption;
}

export interface Presented {
  question: Question;
  options: PresentedOption[];
}

/** Options are shuffled every time a question is shown. */
export function present(question: Question, random: () => number = renderRandom()): Presented {
  const options = shuffle(
    question.options.map((option, index) => ({ index, option })),
    random,
  );
  return { question, options };
}

/** Multiple response is all or nothing: the chosen set must equal the correct set. */
export function isCorrect(question: Question, chosen: readonly number[]): boolean {
  const right = question.options.flatMap((o, i) => (o.correct ? [i] : []));
  const set = new Set(chosen);
  return set.size === right.length && right.every((i) => set.has(i));
}
