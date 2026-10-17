import type { Question } from '../content/types';
import { eligible } from '../questions/pool';
import { DEBRIEF_SIZE, LAB_XP } from '../labs/types';
import type { LabDebrief, LabProgress, Save } from '../save/schema';
import { LOG_CAP, NOTE_CAP } from '../save/schema';
import { addDays, dayDiff, today, type DayKey } from './day';
import { earnedBadges } from './badges';
import type { Ctx } from './engine';
import { recordResult } from './history';
import { isCorrect } from './scoring';
import { longestStreak } from './streak';
import { xpForAnswer } from './xp';

/** What the engine needs to know about a lab (the full lab content loads lazily and is not needed here). */
export interface LabRef {
  id: string;
  bullets: readonly string[];
  /** Step ids that must be ticked before the lab can be marked complete: the cleanup checklist and the verification. */
  required: readonly string[];
}

const iso = (clock: Ctx['clock']): string => clock.now().toISOString();
const empty = (): LabProgress => ({ steps: {}, notes: {} });
export const progressOf = (save: Save, labId: string): LabProgress => save.labs.progress[labId] ?? empty();

function withProgress(save: Save, labId: string, p: LabProgress): Save {
  return { ...save, labs: { ...save.labs, progress: { ...save.labs.progress, [labId]: p } } };
}

export function setStep(save: Save, labId: string, stepId: string, on: boolean): Save {
  const p = progressOf(save, labId);
  const steps = { ...p.steps };
  if (on) steps[stepId] = true;
  else delete steps[stepId];
  return withProgress(save, labId, { ...p, steps });
}

/** An empty note removes it. */
export function setNote(save: Save, labId: string, stepId: string, text: string): Save {
  const p = progressOf(save, labId);
  const notes = { ...p.notes };
  const t = text.slice(0, NOTE_CAP);
  if (t.trim() === '') delete notes[stepId];
  else notes[stepId] = t;
  return withProgress(save, labId, { ...p, notes });
}

export function setAccountCreated(save: Save, day: DayKey | null): Save {
  if (day !== null && !/^\d{4}-\d{2}-\d{2}$/.test(day)) return save;
  return { ...save, labs: { ...save.labs, accountCreated: day } };
}

export type CompleteResult = { ok: true; save: Save; xp: number; newBadges: string[] } | { ok: false; message: string; missing: string[] };

/**
 * Self-reported completion. Needs the cleanup checklist and the verification step ticked, so a lab is never "done" with billable
 * resources left behind. Pays the fixed lab XP once. Never changes a building's state.
 */
export function completeLab(save: Save, lab: LabRef, ctx: Ctx): CompleteResult {
  const p = progressOf(save, lab.id);
  const missing = lab.required.filter((id) => !p.steps[id]);
  if (missing.length > 0) return { ok: false, message: 'Tick the whole cleanup checklist and the verification step first.', missing: [...missing] };
  if (p.completedAt) return { ok: true, save, xp: 0, newBadges: [] };
  const at = iso(ctx.clock);
  let next = withProgress({ ...save, game: { ...save.game, xp: save.game.xp + LAB_XP } }, lab.id, { ...p, completedAt: at });
  const have = new Set(Object.keys(next.game.badges));
  const newBadges = earnedBadges(next, ctx.env, today(ctx.clock)).filter((id) => !have.has(id));
  if (newBadges.length > 0) next = { ...next, game: { ...next.game, badges: { ...next.game.badges, ...Object.fromEntries(newBadges.map((id) => [id, at])) } } };
  return { ok: true, save: next, xp: LAB_XP, newBadges };
}

/** The lab's own bullets decide the pool; live questions only (never the mock reserve). Spreads over bullets, avoids the last debrief, prefers less-seen questions. */
export function drawDebrief(bank: readonly Question[], bullets: readonly string[], opts: { random: () => number; prevIds?: readonly string[]; seen?: Readonly<Record<string, number>> }): Question[] {
  const prev = new Set(opts.prevIds ?? []);
  const seen = opts.seen ?? {};
  const pool = eligible(bank, 'debrief').filter((q) => q.bullets.some((b) => bullets.includes(b)));
  const rank = new Map<string, number>();
  for (const q of pool) rank.set(q.id, (prev.has(q.id) ? 1_000_000 : 0) + (seen[q.id] ?? 0) * 1000 + opts.random());
  const sorted = [...pool].sort((a, b) => (rank.get(a.id) as number) - (rank.get(b.id) as number));
  const picked: Question[] = [];
  const has = (q: Question) => picked.some((p) => p.id === q.id);
  const order = [...bullets].map((b) => ({ b, r: opts.random() })).sort((x, y) => x.r - y.r).map((x) => x.b);
  for (const b of order) {
    if (picked.length >= DEBRIEF_SIZE) break;
    const cand = sorted.find((q) => !has(q) && q.bullets.includes(b) && !picked.some((p) => p.bullets.includes(b)));
    if (cand) picked.push(cand);
  }
  for (const q of sorted) {
    if (picked.length >= DEBRIEF_SIZE) break;
    if (!has(q)) picked.push(q);
  }
  return picked.map((q) => ({ q, r: opts.random() })).sort((x, y) => x.r - y.r).map((x) => x.q);
}

export type DebriefStart = { ok: true; save: Save; debrief: LabDebrief; resumed: boolean } | { ok: false; message: string };

/** Starts the debrief (or resumes an unfinished one). Available once the lab is marked complete. */
export function startDebrief(save: Save, lab: LabRef, bank: readonly Question[], ctx: Ctx, random: () => number): DebriefStart {
  const p = progressOf(save, lab.id);
  if (!p.completedAt) return { ok: false, message: 'Mark the lab complete first.' };
  if (p.debrief && !p.debrief.finishedAt) return { ok: true, save, debrief: p.debrief, resumed: true };
  const picked = drawDebrief(bank, lab.bullets, { random, prevIds: p.debrief?.questionIds, seen: save.game.seen });
  if (picked.length < DEBRIEF_SIZE) return { ok: false, message: 'Not enough questions are available for this debrief yet.' };
  const debrief: LabDebrief = { questionIds: picked.map((q) => q.id), seed: Math.floor(random() * 2 ** 31), startedAt: iso(ctx.clock), answers: {} };
  return { ok: true, save: withProgress(save, lab.id, { ...p, debrief }), debrief, resumed: false };
}

export interface DebriefAnswer {
  save: Save;
  correct: boolean;
  xp: number;
  finished: boolean;
}

/** Full credit only, like every other attempt. Logged as the attempt type `lab`, counted in readiness like an inspection answer, never touching a building. */
export function submitDebriefAnswer(save: Save, labId: string, questionId: string, chosen: readonly number[], ctx: Ctx): DebriefAnswer | null {
  const p = progressOf(save, labId);
  const d = p.debrief;
  const q = ctx.lookup(questionId);
  if (!d || d.finishedAt || !q || !d.questionIds.includes(questionId)) return null;
  const existing = d.answers[questionId];
  if (existing) return { save, correct: existing.correct, xp: existing.xp, finished: false };
  const correct = isCorrect(q, chosen);
  const g = save.game;
  const seenBefore = g.seen[questionId] ?? 0;
  const xp = xpForAnswer(q.difficulty, correct, seenBefore);
  const at = iso(ctx.clock);
  const day = today(ctx.clock);
  const days = { ...g.days, [day]: (g.days[day] ?? 0) + 1 };
  const answers = { ...d.answers, [questionId]: { chosen: [...chosen], correct, xp } };
  const finished = d.questionIds.every((id) => answers[id]);
  const debrief: LabDebrief = { ...d, answers, ...(finished ? { finishedAt: at, correct: Object.values(answers).filter((a) => a.correct).length } : {}) };
  const game = {
    ...g,
    xp: g.xp + xp,
    seen: { ...g.seen, [questionId]: seenBefore + 1 },
    days,
    bestStreak: Math.max(g.bestStreak, longestStreak(days)),
    log: [...g.log, [questionId, correct ? 1 : 0, at, 'lab'] as Save['game']['log'][number]].slice(-LOG_CAP),
    ...recordResult(g, { id: questionId, ok: correct, kind: 'lab', at, domain: ctx.env.domainOf(q.building) }),
  };
  let next = withProgress({ ...save, game }, labId, { ...p, debrief });
  const have = new Set(Object.keys(next.game.badges));
  const newBadges = earnedBadges(next, ctx.env, day).filter((id) => !have.has(id));
  if (newBadges.length > 0) next = { ...next, game: { ...next.game, badges: { ...next.game.badges, ...Object.fromEntries(newBadges.map((id) => [id, at])) } } };
  return { save: next, correct, xp, finished };
}

// ---- Account clock -------------------------------------------------------------------------------------------------

/** Calendar months, clamped to the end of a shorter month (31 Aug + 6 months = 28/29 Feb). */
export function addMonths(day: DayKey, n: number): DayKey {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${String(ny).padStart(4, '0')}-${String(nm).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

/** Length of the Free plan window in calendar months (Free Tier FAQ and Billing guide; the Billing console date is authoritative). */
export const FREE_PLAN_MONTHS = 6;

export interface AccountClock {
  created: DayKey;
  /** The day the 6-month window ends. */
  ends: DayKey;
  daysElapsed: number;
  daysLeft: number;
  /** 0 to 1: share of the window already used. */
  used: number;
  expired: boolean;
}

export function accountClock(created: DayKey | null, todayKey: DayKey): AccountClock | null {
  if (!created) return null;
  const ends = addMonths(created, FREE_PLAN_MONTHS);
  const total = dayDiff(created, ends);
  const daysElapsed = Math.max(0, dayDiff(created, todayKey));
  const daysLeft = Math.max(0, dayDiff(todayKey, ends));
  return { created, ends, daysElapsed, daysLeft, used: Math.min(1, daysElapsed / total), expired: dayDiff(todayKey, ends) <= 0 };
}

export interface ScheduleWeek {
  /** First day of the week block. */
  start: DayKey;
  labs: { id: string; minutes: number }[];
  minutes: number;
}

/**
 * Spreads the remaining labs (recommended order) over the whole weeks left in the window, filling each week up to an even share
 * of the total minutes, never splitting a lab. Returns null when no whole week is left.
 */
export function suggestSchedule(remaining: readonly { id: string; minutes: number }[], todayKey: DayKey, daysLeft: number): ScheduleWeek[] | null {
  const weeks = Math.floor(daysLeft / 7);
  if (weeks < 1 || remaining.length === 0) return weeks < 1 ? null : [];
  const total = remaining.reduce((n, l) => n + l.minutes, 0);
  const share = total / weeks;
  const out: ScheduleWeek[] = Array.from({ length: weeks }, (_, i) => ({ start: addDays(todayKey, i * 7), labs: [], minutes: 0 }));
  let w = 0;
  for (const l of remaining) {
    while (w < weeks - 1 && (out[w] as ScheduleWeek).minutes > 0 && (out[w] as ScheduleWeek).minutes + l.minutes / 2 > share) w += 1;
    const week = out[w] as ScheduleWeek;
    week.labs.push(l);
    week.minutes += l.minutes;
  }
  return out.filter((x) => x.labs.length > 0);
}
