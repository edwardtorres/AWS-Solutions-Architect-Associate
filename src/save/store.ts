import { APP_ID, CORRUPT_KEY, STORAGE_KEY, freshSave, type Save, type StoredState, type UiPrefs } from './schema';
import { migrate } from './migrate';
import type { Question } from '../content/types';
import { systemClock, today as todayKey, type Clock } from '../game/day';
import { DEFAULT_ENV, type GameEnv } from '../game/env';
import { abandonAttempt, addFlag, completeAttempt, markNotesOpened, removeFlag, submitAnswer, type AnswerResult, type AttemptSummary, type Ctx } from '../game/engine';
import type { StartResult } from '../game/start';
import { playPuzzle, type PuzzlePlayResult } from '../game/puzzle';
import { abandonReview, completeReview, openSession, submitReviewAnswer, type ReviewSummary } from '../game/reviewSession';
import { backfillByBullet } from '../game/weak';
import { discardMock, finishMock, openMock, setMockAnswer, setMockFlag, MOCK_QUESTIONS, type MockOutcome } from '../game/mock';
import type { QMeta } from '../game/readiness';
import { completeLab, setAccountCreated, setAck, setNote, setStep, submitDebriefAnswer, type CompleteResult, type DebriefAnswer, type DebriefStart, type LabRef } from '../game/lab';
import type { Difficulty } from '../content/types';
import type { AttemptKind } from './schema';

/** The subset of the Web Storage API the store uses. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type LoadStatus = 'fresh' | 'ok' | 'migrated' | 'corrupt-recovered' | 'future-readonly' | 'storage-unavailable';

export interface Snapshot {
  save: Save;
  status: LoadStatus;
  /** True when writes are disabled so a newer app's save is never overwritten. */
  readOnly: boolean;
  /** True when the latest write to browser storage failed (for example, storage is full); progress stays in memory. */
  writeFailed?: boolean;
}

export interface StoreOptions {
  knownIds: ReadonlySet<string>;
  storage?: KeyValueStorage | null;
  now?: () => string;
  /** The city the rules apply to; tests pass a synthetic one. */
  env?: GameEnv;
  /** Local-day clock; tests inject a time zone and a fixed time. */
  clock?: Clock;
  /** Random source for attempt draws. */
  random?: () => number;
}

/** window.localStorage can throw on access (private windows, blocked site data). */
export function browserStorage(): KeyValueStorage | null {
  try {
    const s = window.localStorage;
    const probe = `${STORAGE_KEY}:probe`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export interface ImportResult {
  ok: boolean;
  message: string;
}

export function createSaveStore(opts: StoreOptions) {
  const now = opts.now ?? (() => new Date().toISOString());
  const storage = opts.storage ?? null;
  const listeners = new Set<() => void>();
  const env = opts.env ?? DEFAULT_ENV;
  const clock = opts.clock ?? systemClock;
  const random = opts.random ?? Math.random;
  let snapshot: Snapshot = load();
  const ctxFor = (lookup: (id: string) => Question | undefined = () => undefined): Ctx => ({ env, clock, lookup });

  function load(): Snapshot {
    if (!storage) return { save: freshSave(now), status: 'storage-unavailable', readOnly: false };
    let raw: string | null;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch {
      return { save: freshSave(now), status: 'storage-unavailable', readOnly: false };
    }
    if (raw === null) return { save: freshSave(now), status: 'fresh', readOnly: false };
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return recoverCorrupt(raw);
    }
    const result = migrate(parsed, opts.knownIds, now);
    if (result.status === 'future') return { save: freshSave(now), status: 'future-readonly', readOnly: true };
    if (result.status === 'invalid') return recoverCorrupt(raw);
    const next: Snapshot = { save: result.save, status: result.status, readOnly: false };
    if (result.status === 'migrated') persist(next.save);
    return next;
  }

  function recoverCorrupt(raw: string): Snapshot {
    try {
      storage?.setItem(CORRUPT_KEY, raw);
    } catch {
      /* best effort: keep a copy for manual recovery */
    }
    return { save: freshSave(now), status: 'corrupt-recovered', readOnly: false };
  }

  function persist(save: Save): boolean {
    if (!storage) return true;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(save));
      return true;
    } catch {
      /* quota or blocked storage: progress stays in memory for this session and the app says so */
      return false;
    }
  }

  function commit(save: Save): void {
    if (snapshot.readOnly) return;
    const next: Save = { ...save, updatedAt: now() };
    const written = persist(next);
    snapshot = { ...snapshot, save: next, writeFailed: !written };
    for (const l of listeners) l();
  }

  return {
    getSnapshot: (): Snapshot => snapshot,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setBuildingState(id: string, state: StoredState | null): void {
      if (!opts.knownIds.has(id)) return;
      const buildings = { ...snapshot.save.buildings };
      if (state === null) delete buildings[id];
      else buildings[id] = { state, changedAt: now() };
      commit({ ...snapshot.save, buildings });
    },
    markNotesOpened(id: string): void {
      if (!opts.knownIds.has(id)) return;
      const next = markNotesOpened(snapshot.save, id, { clock });
      if (next !== snapshot.save) commit(next);
    },
    /** Starts (or resumes) an attempt. The caller passes the loaded question bank. */
    async startAttempt(kind: AttemptKind, building: string, bank: readonly Question[]): Promise<StartResult> {
      if (snapshot.readOnly) return { ok: false, availability: { ok: false, code: 'wrong-state', message: 'This save is read-only (it is from a newer version of the app).' } };
      // The draw code names the mock-reserve tag, so it loads with the question bank, never in the first chunk.
      const { startAttempt } = await import('../game/start');
      const r = startAttempt(snapshot.save, kind, building, bank, ctxFor(), random);
      if (r.ok && !r.resumed) commit(r.save);
      return r;
    },
    submitAnswer(questionId: string, chosen: readonly number[], lookup: (id: string) => Question | undefined): AnswerResult | null {
      const r = submitAnswer(snapshot.save, questionId, chosen, ctxFor(lookup));
      if (r && r.save !== snapshot.save) commit(r.save);
      return r;
    },
    completeAttempt(): AttemptSummary | null {
      const r = completeAttempt(snapshot.save, ctxFor());
      if (!r) return null;
      commit(r.save);
      return r.summary;
    },
    abandonAttempt(): void {
      const next = abandonAttempt(snapshot.save, ctxFor());
      if (next !== snapshot.save) commit(next);
    },
    /** Records a puzzle play (practice: XP, history and readiness, never a building state). Null while the Workbench is locked. */
    playPuzzle(play: { id: string; building: string; difficulty: Difficulty; correct: boolean; bullets?: readonly string[] }): PuzzlePlayResult | null {
      const r = playPuzzle(snapshot.save, play, ctxFor());
      if (r) commit(r.save);
      return r;
    },
    /** Opens today's review (due questions, then a top-up from the weakest bullets) or resumes the open one. Null when nothing is available. */
    async startReview(bank: readonly Question[]): Promise<{ ok: true; resumed: boolean; due: number; dueTotal: number } | { ok: false; message: string }> {
      if (snapshot.readOnly) return { ok: false, message: 'This save is read-only (it is from a newer version of the app).' };
      const open = snapshot.save.game.review;
      if (open && open.kind === 'review') return { ok: true, resumed: true, due: open.questionIds.length, dueTotal: open.questionIds.length };
      if (open) return { ok: false, message: 'A maintenance set is open. Finish or leave it first.' };
      const { planReview } = await import('../game/reviewDraw');
      const plan = planReview(snapshot.save, bank, todayKey(clock), { env, clock }, random);
      if (plan.remaining === 0) return { ok: false, message: 'Today’s review cap is reached. Come back tomorrow.' };
      if (plan.questions.length === 0) return { ok: false, message: 'Nothing to review yet: answer some questions in inspections first.' };
      commit(openSession(snapshot.save, 'review', null, plan.questions, ctxFor(), random));
      return { ok: true, resumed: false, due: plan.due, dueTotal: plan.dueTotal };
    },
    async startMaintenance(building: string, bank: readonly Question[]): Promise<{ ok: true } | { ok: false; message: string }> {
      if (snapshot.readOnly) return { ok: false, message: 'This save is read-only (it is from a newer version of the app).' };
      if (!opts.knownIds.has(building)) return { ok: false, message: 'Unknown building.' };
      const open = snapshot.save.game.review;
      if (open && open.kind === 'maintenance' && open.building === building) return { ok: true };
      if (open) return { ok: false, message: 'Another review session is open. Finish or leave it first.' };
      const { planMaintenance } = await import('../game/reviewDraw');
      const questions = planMaintenance(snapshot.save, building, bank, random);
      if (questions.length === 0) return { ok: false, message: 'This building has no questions to review yet.' };
      commit(openSession(snapshot.save, 'maintenance', building, questions, ctxFor(), random));
      return { ok: true };
    },
    submitReviewAnswer(questionId: string, chosen: readonly number[], lookup: (id: string) => Question | undefined): { correct: boolean; xp: number } | null {
      const r = submitReviewAnswer(snapshot.save, questionId, chosen, ctxFor(lookup));
      if (r && r.save !== snapshot.save) commit(r.save);
      return r ? { correct: r.correct, xp: r.xp } : null;
    },
    completeReview(): ReviewSummary | null {
      const r = completeReview(snapshot.save, ctxFor());
      if (!r) return null;
      commit(r.save);
      return r.summary;
    },
    abandonReview(): void {
      const next = abandonReview(snapshot.save);
      if (next !== snapshot.save) commit(next);
    },
    /**
     * Draws and opens a mock exam (65 questions, 130 minutes). `short` is the development-only 10-question mock: it never counts.
     * Refused while another mock is open.
     */
    async startMock(bank: readonly Question[], short = false): Promise<{ ok: true } | { ok: false; message: string }> {
      if (snapshot.readOnly) return { ok: false, message: 'This save is read-only (it is from a newer version of the app).' };
      if (snapshot.save.game.mock.active) return { ok: true };
      const { drawMock } = await import('../game/mockDraw');
      const total = short ? 10 : MOCK_QUESTIONS;
      const drawn = drawMock({
        bank,
        history: snapshot.save.game.history,
        seen: snapshot.save.game.seen,
        startDay: todayKey(clock),
        timeZone: clock.timeZone,
        total,
        weights: env.weights,
        domainOf: env.domainOf,
        lastMockIds: snapshot.save.game.mock.history.at(-1)?.questionIds ?? [],
        random,
      });
      if (drawn.questions.length < total) return { ok: false, message: `Only ${drawn.questions.length} questions are available for a mock of ${total}.` };
      commit(openMock(snapshot.save, { questionIds: drawn.questions.map((q) => q.id), reserveUsed: drawn.reserveUsed, seed: Math.floor(random() * 2 ** 31), short }, ctxFor()));
      return { ok: true };
    },
    setMockAnswer(questionId: string, chosen: readonly number[]): void {
      const next = setMockAnswer(snapshot.save, questionId, chosen);
      if (next !== snapshot.save) commit(next);
    },
    setMockFlag(questionId: string, on: boolean): void {
      const next = setMockFlag(snapshot.save, questionId, on);
      if (next !== snapshot.save) commit(next);
    },
    /** Grades the open mock (unanswered questions are wrong) and records every answer. `expired` marks one the timer submitted. */
    finishMock(lookup: (id: string) => Question | undefined, expired: boolean): MockOutcome | null {
      const r = finishMock(snapshot.save, ctxFor(lookup), expired);
      if (!r) return null;
      commit(r.save);
      return r;
    },
    discardMock(): void {
      const next = discardMock(snapshot.save);
      if (next !== snapshot.save) commit(next);
    },
    /** One-time fill of the per-bullet figures from the saved results (saves from before version 5). */
    backfillStats(meta: ReadonlyMap<string, QMeta>): void {
      const next = backfillByBullet(snapshot.save, meta);
      if (next !== snapshot.save) commit(next);
    },
    setLabStep(labId: string, stepId: string, on: boolean): void {
      commit(setStep(snapshot.save, labId, stepId, on));
    },
    setLabAck(labId: string, on: boolean): void {
      commit(setAck(snapshot.save, labId, on));
    },
    setLabNote(labId: string, stepId: string, text: string): void {
      commit(setNote(snapshot.save, labId, stepId, text));
    },
    setLabAccountCreated(day: string | null): void {
      commit(setAccountCreated(snapshot.save, day));
    },
    /** Self-reported completion: needs the cleanup checklist and verification ticked; fixed XP once; never changes a building. */
    completeLab(lab: LabRef): CompleteResult {
      const r = completeLab(snapshot.save, lab, ctxFor());
      if (r.ok && r.save !== snapshot.save) commit(r.save);
      return r;
    },
    async startDebrief(lab: LabRef, bank: readonly Question[]): Promise<DebriefStart> {
      if (snapshot.readOnly) return { ok: false, message: 'This save is read-only (it is from a newer version of the app).' };
      const { startDebrief } = await import('../game/labDebrief');
      const r = startDebrief(snapshot.save, lab, bank, ctxFor(), random);
      if (r.ok && !r.resumed) commit(r.save);
      return r;
    },
    submitDebriefAnswer(labId: string, questionId: string, chosen: readonly number[], lookup: (id: string) => Question | undefined): DebriefAnswer | null {
      const r = submitDebriefAnswer(snapshot.save, labId, questionId, chosen, ctxFor(lookup));
      if (r && r.save !== snapshot.save) commit(r.save);
      return r;
    },
    addFlag(questionId: string, note: string, myAnswer: readonly number[]): void {
      commit(addFlag(snapshot.save, questionId, note, myAnswer, { clock }));
    },
    removeFlag(flagId: string): void {
      commit(removeFlag(snapshot.save, flagId));
    },
    today: (): string => todayKey(clock),
    setUi(patch: Partial<UiPrefs>): void {
      const ui = { ...snapshot.save.ui, ...patch };
      if (ui.lastBuilding !== null && !opts.knownIds.has(ui.lastBuilding)) ui.lastBuilding = null;
      commit({ ...snapshot.save, ui });
    },
    reset(): void {
      snapshot = { save: freshSave(now), status: 'fresh', readOnly: false };
      persist(snapshot.save);
      for (const l of listeners) l();
    },
    exportJson(): string {
      return JSON.stringify({ app: APP_ID, exportedAt: now(), save: snapshot.save }, null, 2);
    },
    /** Accepts an export file (or a bare save), migrates it and replaces the current save. */
    importJson(text: string): ImportResult {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return { ok: false, message: 'That is not valid JSON.' };
      }
      let candidate: unknown = parsed;
      if (typeof parsed === 'object' && parsed !== null && 'app' in parsed) {
        const wrapper = parsed as { app?: unknown; save?: unknown };
        if (wrapper.app !== APP_ID) return { ok: false, message: 'This file is not a Region Builder save.' };
        candidate = wrapper.save;
      }
      const result = migrate(candidate, opts.knownIds, now);
      if (result.status === 'future') {
        return { ok: false, message: `This save is from a newer version of the app (schema ${result.version}). Update the app first.` };
      }
      if (result.status === 'invalid') return { ok: false, message: `Could not read that save: ${result.reason}.` };
      snapshot = { save: result.save, status: snapshot.status === 'future-readonly' ? 'ok' : snapshot.status, readOnly: false };
      persist(snapshot.save);
      for (const l of listeners) l();
      return { ok: true, message: `Imported ${Object.keys(result.save.buildings).length} building(s) of progress.` };
    },
  };
}

export type SaveStore = ReturnType<typeof createSaveStore>;
