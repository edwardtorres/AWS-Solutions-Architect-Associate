import type { Question } from '../content/types';
import type { ItemHistory, MockActive, MockRecord, Save } from '../save/schema';
import { MOCK_HISTORY_CAP } from '../save/schema';
import { applyAnswer, awardBadges } from './answer';
import { dayDiff, localDay, type DayKey } from './day';
import type { Ctx } from './engine';
import { trapPairs } from './history';
import { isCorrect } from './scoring';

/**
 * The mock exam (recorded in CLAUDE.md): the real exam's length and time, every question scored. Rules here are pure; the draw,
 * which names the mock-reserve tag, lives in `mockDraw.ts` and loads with the question bank.
 */
export const MOCK_QUESTIONS = 65;
export const MOCK_MINUTES = 130;
export const MOCK_MS = MOCK_MINUTES * 60_000;
/** A mock only counts if at least this share of its questions were not answered in the FRESH_DAYS before it started. */
export const FRESH_SHARE = 0.5;
export const FRESH_DAYS = 14;
/** "Ready to book": the two most recent counting mocks each reach this overall score and this score in every domain. */
export const READY_OVERALL = 0.8;
export const READY_DOMAIN = 0.7;
export const READY_MOCKS = 2;

export const AWS_PRACTICE_PAGE = 'https://aws.amazon.com/certification/certified-solutions-architect-associate/';

/** Questions per domain for `total` questions, by the largest-remainder method on the exam weights (19 / 17 / 16 / 13 for 65). Ties go to the heavier domain. */
export function quotas(total: number, weights: Readonly<Record<number, number>>): Record<number, number> {
  const domains = Object.keys(weights).map(Number).sort((a, b) => a - b);
  const sum = domains.reduce((n, d) => n + (weights[d] as number), 0);
  const exact = domains.map((d) => ({ d, x: (total * (weights[d] as number)) / sum }));
  const out: Record<number, number> = Object.fromEntries(exact.map((e) => [e.d, Math.floor(e.x)]));
  let left = total - Object.values(out).reduce((n, v) => n + v, 0);
  for (const e of [...exact].sort((a, b) => b.x - Math.floor(b.x) - (a.x - Math.floor(a.x)) || (weights[b.d] as number) - (weights[a.d] as number))) {
    if (left <= 0) break;
    out[e.d] = (out[e.d] as number) + 1;
    left -= 1;
  }
  return out;
}

/** Was the question answered within FRESH_DAYS calendar days before the start day? */
export function answeredRecently(h: ItemHistory | undefined, startDay: DayKey, timeZone?: string): boolean {
  if (!h) return false;
  const d = dayDiff(localDay(new Date(h.last), timeZone), startDay);
  return d <= FRESH_DAYS;
}

export interface Freshness {
  fresh: number;
  total: number;
  counts: boolean;
}

/** How many questions are new to the player in the 14 days before the start, and whether that is enough for the mock to count. */
export function freshness(questionIds: readonly string[], history: Readonly<Record<string, ItemHistory>>, startDay: DayKey, timeZone?: string): Freshness {
  const fresh = questionIds.filter((id) => !answeredRecently(history[id], startDay, timeZone)).length;
  return { fresh, total: questionIds.length, counts: questionIds.length > 0 && fresh / questionIds.length >= FRESH_SHARE };
}

export const pctText = (n: number, d: number): string => (d === 0 ? '0%' : `${Math.round((n / d) * 100)}%`);

/** Why a mock did or did not count towards "ready to book". */
export function freshnessReason(m: Pick<MockRecord | MockActive, 'fresh' | 'counts' | 'short'> & { total?: number; questionIds?: readonly string[] }): string {
  const total = m.total ?? m.questionIds?.length ?? 0;
  if (m.short) return 'This short practice mock (development only) never counts.';
  const share = `${m.fresh} of ${total} questions (${pctText(m.fresh, total)}) were new to you in the ${FRESH_DAYS} days before it started`;
  return m.counts
    ? `It counts: ${share}, and at least ${Math.round(FRESH_SHARE * 100)}% must be.`
    : `It did not count: only ${share}, and at least ${Math.round(FRESH_SHARE * 100)}% must be. Review or retake questions less often before a mock, or wait until more have gone ${FRESH_DAYS} days unseen.`;
}

export function remainingMs(a: Pick<MockActive, 'startedAt' | 'durationMs'>, now: Date): number {
  return Math.max(0, Date.parse(a.startedAt) + a.durationMs - now.getTime());
}
export const isExpired = (a: Pick<MockActive, 'startedAt' | 'durationMs'>, now: Date): boolean => remainingMs(a, now) <= 0;

export function clockText(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ---- During the mock: nothing is graded, nothing is shown --------------------------------------------------------------------

export function setMockAnswer(save: Save, questionId: string, chosen: readonly number[]): Save {
  const m = save.game.mock.active;
  if (!m || !m.questionIds.includes(questionId)) return save;
  const answers = { ...m.answers };
  if (chosen.length === 0) delete answers[questionId];
  else answers[questionId] = [...chosen];
  return { ...save, game: { ...save.game, mock: { ...save.game.mock, active: { ...m, answers } } } };
}

export function setMockFlag(save: Save, questionId: string, on: boolean): Save {
  const m = save.game.mock.active;
  if (!m || !m.questionIds.includes(questionId)) return save;
  const flags = on ? [...new Set([...m.flags, questionId])] : m.flags.filter((f) => f !== questionId);
  return { ...save, game: { ...save.game, mock: { ...save.game.mock, active: { ...m, flags } } } };
}

/** Opens a mock from a draw (see `mockDraw.ts`). */
export function openMock(save: Save, drawn: { questionIds: string[]; reserveUsed: number; seed: number; short: boolean }, ctx: Ctx): Save {
  const startedAt = ctx.clock.now().toISOString();
  const f = freshness(drawn.questionIds, save.game.history, localDay(ctx.clock.now(), ctx.clock.timeZone), ctx.clock.timeZone);
  const active: MockActive = {
    id: `mock-${startedAt}`,
    startedAt,
    durationMs: MOCK_MS,
    short: drawn.short,
    questionIds: drawn.questionIds,
    seed: drawn.seed,
    answers: {},
    flags: [],
    fresh: f.fresh,
    counts: !drawn.short && f.counts,
    reserveUsed: drawn.reserveUsed,
  };
  return { ...save, game: { ...save.game, mock: { ...save.game.mock, started: save.game.mock.started + 1, active } } };
}

// ---- Submitting: every question is graded, unanswered ones are wrong ------------------------------------------------------

export interface MockOutcome {
  save: Save;
  record: MockRecord;
  newBadges: string[];
  xp: number;
}

/**
 * Grades the open mock. Full credit only (a multiple-response question needs exactly the keyed set); an unanswered question is wrong.
 * Every question is recorded as a counted `mock` answer (XP with the repeat rule, readiness, per-bullet, trap and maintenance figures)
 * and no building changes. `expired` marks a mock the timer submitted.
 */
export function finishMock(save: Save, ctx: Ctx, expired: boolean): MockOutcome | null {
  const m = save.game.mock.active;
  if (!m) return null;
  let game = save.game;
  let xp = 0;
  let correctCount = 0;
  const domains: Record<string, [number, number]> = {};
  const trapMisses: Record<string, number> = {};
  const finishedAt = ctx.clock.now().toISOString();
  for (const id of m.questionIds) {
    const q: Question | undefined = ctx.lookup(id);
    if (!q) continue;
    const chosen = m.answers[id] ?? [];
    const correct = chosen.length > 0 && isCorrect(q, chosen);
    const applied = applyAnswer(game, q, correct, 'mock', ctx);
    game = applied.game;
    xp += applied.xp;
    if (correct) correctCount += 1;
    const d = ctx.env.domainOf(q.building);
    if (d !== null) {
      const cur = domains[String(d)] ?? [0, 0];
      domains[String(d)] = [cur[0] + (correct ? 1 : 0), cur[1] + 1];
    }
    if (!correct) for (const t of trapPairs(q.tags)) trapMisses[t] = (trapMisses[t] ?? 0) + 1;
  }
  const record: MockRecord = {
    id: m.id,
    startedAt: m.startedAt,
    finishedAt,
    short: m.short,
    expired,
    total: m.questionIds.length,
    correct: correctCount,
    domains,
    questionIds: m.questionIds,
    seed: m.seed,
    chosen: m.answers,
    flags: m.flags,
    fresh: m.fresh,
    counts: m.counts,
    reserveUsed: m.reserveUsed,
    trapMisses,
  };
  const closed: Save = { ...save, game: { ...game, mock: { ...game.mock, active: null, history: [...game.mock.history, record].slice(-MOCK_HISTORY_CAP) } } };
  const { save: next, newBadges } = awardBadges(closed, ctx);
  return { save: next, record, newBadges, xp };
}

/** Throws the open mock away without grading it (nothing is recorded). */
export function discardMock(save: Save): Save {
  return save.game.mock.active ? { ...save, game: { ...save.game, mock: { ...save.game.mock, active: null } } } : save;
}

// ---- Results -------------------------------------------------------------------------------------------------------------

export const scoreOf = (m: Pick<MockRecord, 'correct' | 'total'>): number => (m.total === 0 ? 0 : m.correct / m.total);

export interface ReadyStatus {
  ready: boolean;
  /** The counting mocks considered, newest last (at most READY_MOCKS). */
  considered: MockRecord[];
  /** What is still missing, in plain words. */
  reason: string;
}

const domainsOk = (m: MockRecord): boolean => ['1', '2', '3', '4'].every((d) => (m.domains[d]?.[1] ?? 0) > 0 && (m.domains[d] as [number, number])[0] / (m.domains[d] as [number, number])[1] >= READY_DOMAIN);

/**
 * Ready to book: the two most recent mocks that counted (full-length, fresh enough) each scored at least 80% overall with every
 * domain at least 70%. It is a study signal, not a prediction: 720 is a scaled score and scoring is compensatory.
 */
export function readyToBook(history: readonly MockRecord[]): ReadyStatus {
  const counting = history.filter((m) => !m.short && m.counts);
  const considered = counting.slice(-READY_MOCKS);
  if (considered.length < READY_MOCKS) {
    return { ready: false, considered, reason: `You need ${READY_MOCKS} mocks that count; you have ${counting.length}. A mock counts when at least ${Math.round(FRESH_SHARE * 100)}% of its questions were new to you in the ${FRESH_DAYS} days before it started.` };
  }
  const lowOverall = considered.filter((m) => scoreOf(m) < READY_OVERALL);
  if (lowOverall.length > 0) return { ready: false, considered, reason: `Each of the last ${READY_MOCKS} counting mocks must score at least ${Math.round(READY_OVERALL * 100)}% overall; ${lowOverall.length} did not.` };
  if (!considered.every(domainsOk)) return { ready: false, considered, reason: `Every domain must reach at least ${Math.round(READY_DOMAIN * 100)}% in each of the last ${READY_MOCKS} counting mocks.` };
  return { ready: true, considered, reason: `The last ${READY_MOCKS} counting mocks each scored at least ${Math.round(READY_OVERALL * 100)}% overall with every domain at least ${Math.round(READY_DOMAIN * 100)}%.` };
}
