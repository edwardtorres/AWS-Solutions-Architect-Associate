import type { Question } from '../content/types';
import type { ReviewSession, Save } from '../save/schema';
import { applyAnswer, awardBadges } from './answer';
import { today } from './day';
import type { Ctx } from './engine';
import { isCorrect } from './scoring';

export interface ReviewSummary {
  kind: ReviewSession['kind'];
  building: string | null;
  correct: number;
  total: number;
  xp: number;
  newBadges: string[];
}

/** Opens a review or maintenance session over the given questions (drawn by `src/game/reviewDraw.ts`). */
export function openSession(save: Save, kind: ReviewSession['kind'], building: string | null, questions: readonly Question[], ctx: Ctx, random: () => number): Save {
  const at = ctx.clock.now().toISOString();
  const session: ReviewSession = { id: `${kind}-${building ?? 'daily'}-${at}`, kind, building, questionIds: questions.map((q) => q.id), seed: Math.floor(random() * 2 ** 31), startedAt: at, day: today(ctx.clock), answers: {} };
  return { ...save, game: { ...save.game, review: session } };
}

/**
 * Records one answer in the open session. Full credit only. The answer is logged as the attempt type `review` (counted in readiness,
 * XP with the repeat rule, streak credit) and never changes a building. Daily review answers count against the daily cap.
 */
export function submitReviewAnswer(save: Save, questionId: string, chosen: readonly number[], ctx: Ctx): { save: Save; correct: boolean; xp: number } | null {
  const s = save.game.review;
  const q = ctx.lookup(questionId);
  if (!s || !q || !s.questionIds.includes(questionId)) return null;
  const existing = s.answers[questionId];
  if (existing) return { save, correct: existing.correct, xp: existing.xp };
  const correct = isCorrect(q, chosen);
  const { game, xp } = applyAnswer(save.game, q, correct, 'review', ctx);
  const day = today(ctx.clock);
  const reviewDay = s.kind === 'review' ? { day, done: (save.game.reviewDay.day === day ? save.game.reviewDay.done : 0) + 1 } : save.game.reviewDay;
  return { save: { ...save, game: { ...game, reviewDay, review: { ...s, answers: { ...s.answers, [questionId]: { chosen: [...chosen], correct, xp } } } } }, correct, xp };
}

/** Finishes the session once every question is answered. Nothing about any building changes. */
export function completeReview(save: Save, ctx: Ctx): { save: Save; summary: ReviewSummary } | null {
  const s = save.game.review;
  if (!s || s.questionIds.some((id) => !s.answers[id])) return null;
  const answers = s.questionIds.map((id) => s.answers[id]);
  const summary = { kind: s.kind, building: s.building, correct: answers.filter((a) => a?.correct).length, total: s.questionIds.length, xp: answers.reduce((n, a) => n + (a?.xp ?? 0), 0) };
  const closed: Save = { ...save, game: { ...save.game, review: null } };
  const { save: next, newBadges } = awardBadges(closed, ctx);
  return { save: next, summary: { ...summary, newBadges } };
}

/** Leaves a session. Answers already given keep their XP and stay in the history; the unanswered questions simply stay due. */
export function abandonReview(save: Save): Save {
  return save.game.review ? { ...save, game: { ...save.game, review: null } } : save;
}
