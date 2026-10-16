import { APP_ID, CORRUPT_KEY, STORAGE_KEY, freshSave, type Save, type StoredState, type UiPrefs } from './schema';
import { migrate } from './migrate';
import type { Question } from '../content/types';
import { systemClock, today as todayKey, type Clock } from '../game/day';
import { DEFAULT_ENV, type GameEnv } from '../game/env';
import { abandonAttempt, addFlag, completeAttempt, markNotesOpened, removeFlag, submitAnswer, type AnswerResult, type AttemptSummary, type Ctx } from '../game/engine';
import type { StartResult } from '../game/start';
import { playPuzzle, type PuzzlePlayResult } from '../game/puzzle';
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

  function persist(save: Save): void {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(save));
    } catch {
      /* quota or blocked storage: progress stays in memory for this session */
    }
  }

  function commit(save: Save): void {
    if (snapshot.readOnly) return;
    const next: Save = { ...save, updatedAt: now() };
    persist(next);
    snapshot = { ...snapshot, save: next };
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
    playPuzzle(play: { id: string; building: string; difficulty: Difficulty; correct: boolean }): PuzzlePlayResult | null {
      const r = playPuzzle(snapshot.save, play, ctxFor());
      if (r) commit(r.save);
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
