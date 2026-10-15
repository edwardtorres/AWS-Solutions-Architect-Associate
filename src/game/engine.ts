import type { Question } from '../content/types';
import type { AttemptKind, Flag, Save } from '../save/schema';
import { LOG_CAP } from '../save/schema';
import { today, type Clock } from './day';
import type { GameEnv } from './env';
import { stateOf } from './lifecycle';
import { isCorrect, RULES } from './scoring';
import { earnedBadges } from './badges';
import { COMMISSION_BONUS, xpForAnswer } from './xp';
import { longestStreak } from './streak';

/** Everything the pure functions need besides the save. */
export interface Ctx {
  env: GameEnv;
  clock: Clock;
  /** Looks a question up in the (lazily loaded) bank. */
  lookup: (id: string) => Question | undefined;
}

const iso = (clock: Clock): string => clock.now().toISOString();

/** Marks a building's notes as opened (needed before its start-up check). Keeps the first time. */
export function markNotesOpened(save: Save, id: string, ctx: Pick<Ctx, 'clock'>): Save {
  if (save.game.notesOpened[id]) return save;
  return { ...save, game: { ...save.game, notesOpened: { ...save.game.notesOpened, [id]: iso(ctx.clock) } } };
}

export interface AnswerResult {
  save: Save;
  correct: boolean;
  xp: number;
}

/** Records one answer in the active attempt: full credit only, XP, seen count, day count and the compact log. */
export function submitAnswer(save: Save, questionId: string, chosen: readonly number[], ctx: Ctx): AnswerResult | null {
  const a = save.game.active;
  const q = ctx.lookup(questionId);
  if (!a || !q || !a.questionIds.includes(questionId)) return null;
  const existing = a.answers[questionId];
  if (existing) return { save, correct: existing.correct, xp: existing.xp };
  const correct = isCorrect(q, chosen);
  const seenBefore = save.game.seen[questionId] ?? 0;
  const xp = xpForAnswer(q.difficulty, correct, seenBefore);
  const at = iso(ctx.clock);
  const day = today(ctx.clock);
  const g = save.game;
  const days = { ...g.days, [day]: (g.days[day] ?? 0) + 1 };
  const log = [...g.log, [questionId, correct ? 1 : 0, at, a.kind] as const].slice(-LOG_CAP) as Save['game']['log'];
  const game = {
    ...g,
    xp: g.xp + xp,
    seen: { ...g.seen, [questionId]: seenBefore + 1 },
    days,
    bestStreak: Math.max(g.bestStreak, longestStreak(days)),
    log,
    active: { ...a, answers: { ...a.answers, [questionId]: { chosen: [...chosen], correct, xp } } },
  };
  return { save: { ...save, game }, correct, xp };
}

export interface AttemptSummary {
  kind: AttemptKind;
  building: string;
  correct: number;
  total: number;
  need: number;
  passed: boolean;
  xpFromAnswers: number;
  /** One-time commissioning bonus paid by this attempt. */
  bonus: number;
  /** The building became commissioned. */
  commissioned: boolean;
  /** The building moved to under construction. */
  started: boolean;
  /** An inspection failure that locked the building until the next local day. */
  locked: boolean;
  newBadges: string[];
}

function commission(save: Save, id: string, via: 'inspection' | 'placement', at: string): { save: Save; bonus: number } {
  const paid = save.game.bonus[id] === true;
  const buildings = { ...save.buildings, [id]: { state: 'commissioned' as const, changedAt: at, via } };
  const game = paid ? save.game : { ...save.game, xp: save.game.xp + COMMISSION_BONUS, bonus: { ...save.game.bonus, [id]: true as const } };
  return { save: { ...save, buildings, game }, bonus: paid ? 0 : COMMISSION_BONUS };
}

/** Finishes the active attempt once every question is answered; applies pass/fail consequences. */
export function completeAttempt(save: Save, ctx: Ctx): { save: Save; summary: AttemptSummary } | null {
  const a = save.game.active;
  if (!a || a.questionIds.some((id) => !a.answers[id])) return null;
  const rule = RULES[a.kind];
  const answers = a.questionIds.map((id) => a.answers[id]);
  const correct = answers.filter((x) => x?.correct).length;
  const passed = correct >= rule.need;
  const xpFromAnswers = answers.reduce((n, x) => n + (x?.xp ?? 0), 0);
  const at = iso(ctx.clock);
  const day = today(ctx.clock);
  let next: Save = { ...save, game: { ...save.game, active: null } };
  let bonus = 0;
  let commissioned = false;
  let started = false;
  let locked = false;

  if (a.kind === 'startup') {
    next = { ...next, game: { ...next.game, startups: { ...next.game.startups, [a.building]: { prevIds: a.questionIds } } } };
    if (passed && stateOf(next, a.building, ctx.env) === 'surveyed') {
      next = { ...next, buildings: { ...next.buildings, [a.building]: { state: 'under_construction', changedAt: at } } };
      started = true;
    }
  } else if (a.kind === 'inspection') {
    const old = next.game.inspections[a.building];
    const fails = !passed ? (old && old.day === day ? old.fails + 1 : 1) : old && old.day === day ? old.fails : 0;
    next = { ...next, game: { ...next.game, inspections: { ...next.game.inspections, [a.building]: { day: passed ? (old?.day ?? day) : day, fails, prevIds: a.questionIds } } } };
    if (passed) {
      const r = commission(next, a.building, 'inspection', at);
      next = r.save;
      bonus = r.bonus;
      commissioned = true;
    } else {
      locked = fails >= 2;
    }
  } else if (passed) {
    const r = commission(next, a.building, 'placement', at);
    next = r.save;
    bonus = r.bonus;
    commissioned = true;
  }

  const flawless = a.kind === 'inspection' && correct === rule.total;
  const have = new Set(Object.keys(next.game.badges));
  const newBadges = earnedBadges(next, ctx.env, day, { flawlessInspection: flawless }).filter((id) => !have.has(id));
  if (newBadges.length > 0) {
    next = { ...next, game: { ...next.game, badges: { ...next.game.badges, ...Object.fromEntries(newBadges.map((id) => [id, at])) } } };
  }
  return { save: next, summary: { kind: a.kind, building: a.building, correct, total: rule.total, need: rule.need, passed, xpFromAnswers, bonus, commissioned, started, locked, newBadges } };
}

/**
 * Leaves the active attempt. An unfinished inspection counts as failed (so it cannot be dodged by walking
 * away from a question); a placement attempt was already counted when it started; a start-up check is free.
 */
export function abandonAttempt(save: Save, ctx: Ctx): Save {
  const a = save.game.active;
  if (!a) return save;
  let next: Save = { ...save, game: { ...save.game, active: null } };
  if (a.kind === 'inspection') {
    const day = today(ctx.clock);
    const old = next.game.inspections[a.building];
    const fails = old && old.day === day ? old.fails + 1 : 1;
    next = { ...next, game: { ...next.game, inspections: { ...next.game.inspections, [a.building]: { day, fails, prevIds: a.questionIds } } } };
  }
  return next;
}

export function addFlag(save: Save, questionId: string, note: string, myAnswer: readonly number[], ctx: Pick<Ctx, 'clock'>): Save {
  const at = iso(ctx.clock);
  const flag: Flag = { id: `${questionId}@${at}`, questionId, note: note.trim().slice(0, 500), myAnswer: [...myAnswer], at };
  return { ...save, game: { ...save.game, flags: [...save.game.flags, flag] } };
}

export function removeFlag(save: Save, flagId: string): Save {
  return { ...save, game: { ...save.game, flags: save.game.flags.filter((f) => f.id !== flagId) } };
}
