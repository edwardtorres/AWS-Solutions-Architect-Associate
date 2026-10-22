import { BUILDING_BY_ID, DISTRICT_BY_ID } from '../data';
import { COUNTED_KINDS, nextHistory, pruneRecent } from '../game/history';
import { BULLET_WINDOW, CURRENT_VERSION, LOG_CAP, MAINT_WINDOW, MOCK_HISTORY_CAP, NOTE_CAP, freshGame, freshLabs, freshSave, type MockActive, type MockRecord, type MockState, type ReviewSession, type ActiveAnswer, type ActiveAttempt, type LabDebrief, type LabProgress, type LabsState, type AttemptKind, type GameState, type ItemHistory, type LogEntry, type LogKind, type RecentEntry, type Save, type StoredState, type UiPrefs } from './schema';

type Migration = (old: Record<string, unknown>) => Record<string, unknown>;

/**
 * migrations[n] upgrades a version-n save to version n+1. Add one entry per schema bump
 * and never edit an old one. Version 0 is the unversioned pre-release shape
 * `{ buildings: { [id]: "commissioned" | "under_construction" } }`.
 */
export const MIGRATIONS: Record<number, Migration> = {
  0: (old) => {
    const legacy = (old.buildings ?? {}) as Record<string, unknown>;
    const buildings: Record<string, unknown> = {};
    const at = new Date(0).toISOString();
    for (const [id, state] of Object.entries(legacy)) {
      if (state === 'commissioned' || state === 'under_construction') buildings[id] = { state, changedAt: at };
    }
    return { version: 1, updatedAt: at, buildings, ui: {} };
  },
  // Version 2 adds the game block (notes, inspections, placement, XP, streaks, badges, flags, answer log).
  1: (old) => ({ ...old, version: 2, game: {} }),
  // Version 3 adds the per-item answer history and the per-domain recent lists, built from the answer log (the only
  // record a v2 save has), so scheduling and readiness no longer depend on a log that trimming can shorten.
  2: (old) => {
    const game = isObject(old.game) ? old.game : {};
    const log = Array.isArray(game.log) ? game.log : [];
    const history: Record<string, ItemHistory> = {};
    const recent: Record<string, RecentEntry[]> = {};
    for (const e of log) {
      if (!Array.isArray(e) || e.length !== 4) continue;
      const [id, ok, at, kind] = e as unknown[];
      if (!isStr(id) || (ok !== 0 && ok !== 1) || !isStr(at) || !KINDS.includes(kind as LogKind)) continue;
      history[id] = nextHistory(history[id], ok === 1, kind as LogKind, at);
      const domain = domainOfItem(id);
      if (domain !== null && COUNTED_KINDS.has(kind as LogKind)) (recent[String(domain)] ??= []).push([id, ok, kind as LogKind]);
    }
    for (const k of Object.keys(recent)) recent[k] = pruneRecent(recent[k] as RecentEntry[]);
    return { ...old, version: 3, game: { ...game, history, recent } };
  },
  // Version 4 adds the labs block (step ticks, problem notes, completion, debriefs, the lab account's creation date).
  3: (old) => ({ ...old, version: 4, labs: {} }),
  // Version 5 adds the review, bullet, maintenance and trap stores, the review session, the mock state and the lab acknowledgement.
  // Nothing is derived here: the per-bullet figures are backfilled once from `recent` when the Weak Spots page first loads.
  4: (old) => ({ ...old, version: 5 }),
  // Version 6 adds ui.lastExportAt (the date of the last backup export) for the backup reminder. Nothing else changes.
  5: (old) => ({ ...old, version: 6, ui: { ...(old.ui && typeof old.ui === 'object' ? old.ui : {}), lastExportAt: null } }),
};

/** Question ids are `<building>-NNN`; the exam domain follows from the building. Foundations and unknown ids have none. */
export function domainOfItem(id: string): number | null {
  const building = BUILDING_BY_ID.get(id.replace(/-\d{3,}$/, ''));
  return building ? DISTRICT_BY_ID[building.district].domain : null;
}

export type MigrateResult =
  | { status: 'ok' | 'migrated'; save: Save }
  | { status: 'future'; version: number }
  | { status: 'invalid'; reason: string };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function versionOf(raw: Record<string, unknown>): number | null {
  if (!('version' in raw)) return 0;
  const v = raw.version;
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : null;
}

/** Upgrades any recognised version to the current schema, then validates it. */
export function migrate(value: unknown, knownIds: ReadonlySet<string>, now: () => string): MigrateResult {
  if (!isObject(value)) return { status: 'invalid', reason: 'save is not an object' };
  let current: Record<string, unknown> = value;
  const startVersion = versionOf(current);
  if (startVersion === null) return { status: 'invalid', reason: 'save has an invalid version' };
  if (startVersion > CURRENT_VERSION) return { status: 'future', version: startVersion };
  for (let v = startVersion; v < CURRENT_VERSION; v += 1) {
    const step = MIGRATIONS[v];
    if (!step) return { status: 'invalid', reason: `no migration from version ${v}` };
    current = step(current);
  }
  return { status: startVersion === CURRENT_VERSION ? 'ok' : 'migrated', save: sanitize(current, knownIds, now) };
}

/** Coerces a version-current save into the exact shape the app expects, pruning unknown ids. */
export function sanitize(raw: Record<string, unknown>, knownIds: ReadonlySet<string>, now: () => string): Save {
  const base = freshSave(now);
  const buildings: Save['buildings'] = {};
  if (isObject(raw.buildings)) {
    for (const [id, entry] of Object.entries(raw.buildings)) {
      if (!knownIds.has(id) || !isObject(entry)) continue;
      const state = entry.state;
      if (state !== 'commissioned' && state !== 'under_construction') continue;
      buildings[id] = {
        state: state as StoredState,
        changedAt: typeof entry.changedAt === 'string' ? entry.changedAt : base.updatedAt,
        ...(state === 'commissioned' && (entry.via === 'inspection' || entry.via === 'placement') ? { via: entry.via } : {}),
      };
    }
  }
  const ui: UiPrefs = { ...base.ui };
  if (isObject(raw.ui)) {
    if (raw.ui.view === 'map' || raw.ui.view === 'atlas') ui.view = raw.ui.view;
    if (raw.ui.roads === 'selected' || raw.ui.roads === 'all') ui.roads = raw.ui.roads;
    if (typeof raw.ui.lastBuilding === 'string' && knownIds.has(raw.ui.lastBuilding)) ui.lastBuilding = raw.ui.lastBuilding;
    if (typeof raw.ui.lastExportAt === 'string' && !Number.isNaN(Date.parse(raw.ui.lastExportAt))) ui.lastExportAt = raw.ui.lastExportAt;
  }
  return {
    version: 6,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : base.updatedAt,
    buildings,
    ui,
    game: sanitizeGame(raw.game, knownIds, now),
    labs: sanitizeLabs(raw.labs),
  };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const KINDS: readonly LogKind[] = ['startup', 'inspection', 'placement', 'review', 'puzzle', 'lab', 'mock'];
const ATTEMPTS: readonly AttemptKind[] = ['startup', 'inspection', 'placement'];
const isStr = (v: unknown): v is string => typeof v === 'string';
const num = (v: unknown, min = 0): number => (typeof v === 'number' && Number.isFinite(v) && v >= min ? v : min);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter(isStr) : []);
const ints = (v: unknown): number[] => (Array.isArray(v) ? v.filter((x): x is number => Number.isInteger(x) && x >= 0 && x < 12) : []);

function recordOf<T>(v: unknown, keep: (k: string, x: unknown) => T | null): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isObject(v)) return out;
  for (const [k, x] of Object.entries(v)) {
    const r = keep(k, x);
    if (r !== null) out[k] = r;
  }
  return out;
}

/** Validates the game block field by field; anything malformed falls back to its empty value. */
export function sanitizeGame(raw: unknown, knownIds: ReadonlySet<string>, now: () => string): GameState {
  const base = freshGame();
  if (!isObject(raw)) return base;
  const known = (k: string) => knownIds.has(k);
  const game: GameState = {
    notesOpened: recordOf(raw.notesOpened, (k, x) => (known(k) && isStr(x) ? x : null)),
    startups: recordOf(raw.startups, (k, x) => (known(k) && isObject(x) ? { prevIds: strings(x.prevIds) } : null)),
    inspections: recordOf(raw.inspections, (k, x) =>
      known(k) && isObject(x) && isStr(x.day) && DAY.test(x.day) ? { day: x.day, fails: Math.floor(num(x.fails)), prevIds: strings(x.prevIds) } : null,
    ),
    placements: recordOf(raw.placements, (k, x) => (known(k) && isObject(x) && isStr(x.lastStartDay) && DAY.test(x.lastStartDay) ? { lastStartDay: x.lastStartDay } : null)),
    active: sanitizeActive(raw.active, knownIds),
    xp: Math.floor(num(raw.xp)),
    seen: recordOf(raw.seen, (_k, x) => (typeof x === 'number' && x >= 1 ? Math.floor(x) : null)),
    days: recordOf(raw.days, (k, x) => (DAY.test(k) && typeof x === 'number' && x >= 1 ? Math.floor(x) : null)),
    bestStreak: Math.floor(num(raw.bestStreak)),
    badges: recordOf(raw.badges, (_k, x) => (isStr(x) ? x : null)),
    bonus: recordOf(raw.bonus, (k, x) => (known(k) && x === true ? (true as const) : null)),
    flags: [],
    log: [],
    history: recordOf(raw.history, (_k, x) =>
      isObject(x) && typeof x.n === 'number' && x.n >= 1 && (x.lastOk === 0 || x.lastOk === 1) && isStr(x.last) && KINDS.includes(x.lastKind as LogKind)
        ? { n: Math.floor(x.n), ok: Math.min(Math.floor(num(x.ok)), Math.floor(x.n)), streak: Math.min(Math.floor(num(x.streak)), Math.floor(x.n)), last: x.last, lastOk: x.lastOk, lastKind: x.lastKind as LogKind }
        : null,
    ),
    recent: {},
    byBullet: recordOf(raw.byBullet, (k, x) => (BULLET_ID.test(k) && isStr(x) && /^[01]+$/.test(x) ? x.slice(-BULLET_WINDOW) : null)),
    maint: recordOf(raw.maint, (k, x) => (known(k) && isStr(x) && /^[01]+$/.test(x) ? x.slice(-MAINT_WINDOW) : null)),
    traps: recordOf(raw.traps, (k, x) => (/^[a-z0-9-]{1,60}$/.test(k) && isObject(x) && typeof x.n === 'number' && x.n >= 1 ? { n: Math.floor(x.n), miss: Math.min(Math.floor(num(x.miss)), Math.floor(x.n)) } : null)),
    reviewDay: isObject(raw.reviewDay) && isStr(raw.reviewDay.day) && DAY.test(raw.reviewDay.day) ? { day: raw.reviewDay.day, done: Math.floor(num(raw.reviewDay.done)) } : { day: '', done: 0 },
    review: sanitizeReview(raw.review, knownIds),
    mock: sanitizeMock(raw.mock),
    statsBackfilled: raw.statsBackfilled === true,
  };
  if (isObject(raw.recent)) {
    for (const d of ['1', '2', '3', '4']) {
      const list = raw.recent[d];
      if (!Array.isArray(list)) continue;
      const out: RecentEntry[] = [];
      for (const e of list) {
        if (!Array.isArray(e) || e.length !== 3) continue;
        const [id, ok, kind] = e as unknown[];
        if (isStr(id) && (ok === 0 || ok === 1) && COUNTED_KINDS.has(kind as LogKind)) out.push([id, ok, kind as LogKind]);
      }
      if (out.length > 0) game.recent[d] = pruneRecent(out);
    }
  }
  if (Array.isArray(raw.flags)) {
    for (const f of raw.flags) {
      if (!isObject(f) || !isStr(f.id) || !isStr(f.questionId)) continue;
      game.flags.push({ id: f.id, questionId: f.questionId, note: isStr(f.note) ? f.note.slice(0, 2000) : '', myAnswer: ints(f.myAnswer), at: isStr(f.at) ? f.at : now() });
    }
  }
  if (Array.isArray(raw.log)) {
    for (const e of raw.log) {
      if (!Array.isArray(e) || e.length !== 4) continue;
      const [q, ok, at, kind] = e as unknown[];
      if (isStr(q) && (ok === 0 || ok === 1) && isStr(at) && KINDS.includes(kind as LogKind)) game.log.push([q, ok, at, kind as LogKind] as LogEntry);
    }
    if (game.log.length > LOG_CAP) game.log = game.log.slice(game.log.length - LOG_CAP);
  }
  return game;
}

const BULLET_ID = /^\d\.\d-[KS]\d+$/;
const ID = /^[A-Za-z0-9._:@-]{1,80}$/;

function answersOf(raw: unknown, questionIds: readonly string[]): Record<string, ActiveAnswer> {
  return recordOf(raw, (k, x) => (questionIds.includes(k) && isObject(x) && typeof x.correct === 'boolean' ? { chosen: ints(x.chosen), correct: x.correct, xp: Math.floor(num(x.xp)) } : null));
}

function sanitizeReview(raw: unknown, knownIds: ReadonlySet<string>): ReviewSession | null {
  if (!isObject(raw) || !isStr(raw.id) || (raw.kind !== 'review' && raw.kind !== 'maintenance')) return null;
  const building = isStr(raw.building) && knownIds.has(raw.building) ? raw.building : null;
  if (raw.kind === 'maintenance' && building === null) return null;
  const questionIds = strings(raw.questionIds);
  if (questionIds.length === 0 || !isStr(raw.startedAt) || !isStr(raw.day) || !DAY.test(raw.day)) return null;
  return { id: raw.id, kind: raw.kind, building, questionIds, seed: Math.floor(num(raw.seed)), startedAt: raw.startedAt, day: raw.day, answers: answersOf(raw.answers, questionIds) };
}

const chosenOf = (v: unknown, questionIds: readonly string[]): Record<string, number[]> => recordOf(v, (k, x) => (questionIds.includes(k) && Array.isArray(x) ? ints(x) : null));

function sanitizeMockActive(raw: unknown): MockActive | null {
  if (!isObject(raw) || !isStr(raw.id) || !isStr(raw.startedAt) || Number.isNaN(Date.parse(raw.startedAt))) return null;
  const questionIds = strings(raw.questionIds);
  if (questionIds.length === 0 || typeof raw.durationMs !== 'number' || raw.durationMs <= 0) return null;
  return {
    id: raw.id,
    startedAt: raw.startedAt,
    durationMs: Math.floor(raw.durationMs),
    short: raw.short === true,
    questionIds,
    seed: Math.floor(num(raw.seed)),
    answers: chosenOf(raw.answers, questionIds),
    flags: strings(raw.flags).filter((f) => questionIds.includes(f)),
    fresh: Math.min(Math.floor(num(raw.fresh)), questionIds.length),
    counts: raw.counts === true,
    reserveUsed: Math.min(Math.floor(num(raw.reserveUsed)), questionIds.length),
  };
}

function sanitizeMockRecord(raw: unknown): MockRecord | null {
  if (!isObject(raw) || !isStr(raw.id) || !isStr(raw.startedAt) || !isStr(raw.finishedAt)) return null;
  const questionIds = strings(raw.questionIds);
  if (questionIds.length === 0) return null;
  const domains: Record<string, [number, number]> = {};
  if (isObject(raw.domains)) {
    for (const d of ['1', '2', '3', '4']) {
      const v = raw.domains[d];
      if (Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number' && v[1] >= 0 && v[0] >= 0 && v[0] <= v[1]) domains[d] = [Math.floor(v[0]), Math.floor(v[1])];
    }
  }
  const total = questionIds.length;
  return {
    id: raw.id,
    startedAt: raw.startedAt,
    finishedAt: raw.finishedAt,
    short: raw.short === true,
    expired: raw.expired === true,
    total,
    correct: Math.min(Math.floor(num(raw.correct)), total),
    domains,
    questionIds,
    seed: Math.floor(num(raw.seed)),
    chosen: chosenOf(raw.chosen, questionIds),
    flags: strings(raw.flags).filter((f) => questionIds.includes(f)),
    fresh: Math.min(Math.floor(num(raw.fresh)), total),
    counts: raw.counts === true,
    reserveUsed: Math.min(Math.floor(num(raw.reserveUsed)), total),
    trapMisses: recordOf(raw.trapMisses, (k, x) => (ID.test(k) && typeof x === 'number' && x >= 1 ? Math.floor(x) : null)),
  };
}

function sanitizeMock(raw: unknown): MockState {
  const base: MockState = { started: 0, active: null, history: [] };
  if (!isObject(raw)) return base;
  const history = Array.isArray(raw.history) ? raw.history.flatMap((r) => sanitizeMockRecord(r) ?? []) : [];
  return { started: Math.max(Math.floor(num(raw.started)), history.length), active: sanitizeMockActive(raw.active), history: history.slice(-MOCK_HISTORY_CAP) };
}

function sanitizeActive(raw: unknown, knownIds: ReadonlySet<string>): ActiveAttempt | null {
  if (!isObject(raw)) return null;
  if (!isStr(raw.id) || !ATTEMPTS.includes(raw.kind as AttemptKind) || !isStr(raw.building) || !knownIds.has(raw.building)) return null;
  const questionIds = strings(raw.questionIds);
  if (questionIds.length === 0 || !isStr(raw.startedAt) || !isStr(raw.day) || !DAY.test(raw.day)) return null;
  const answers = recordOf(raw.answers, (k, x) =>
    questionIds.includes(k) && isObject(x) && typeof x.correct === 'boolean' ? { chosen: ints(x.chosen), correct: x.correct, xp: Math.floor(num(x.xp)) } : null,
  );
  return { id: raw.id, kind: raw.kind as AttemptKind, building: raw.building, questionIds, seed: Math.floor(num(raw.seed)), startedAt: raw.startedAt, day: raw.day, answers };
}

const LAB_ID = /^lab-\d{2}-[a-z0-9-]{1,40}$/;
const STEP_ID = /^[a-z0-9-]{1,40}$/;

/** Validates the labs block. Lab and step ids are checked by shape only (lab content loads lazily). */
export function sanitizeLabs(raw: unknown): LabsState {
  const base = freshLabs();
  if (!isObject(raw)) return base;
  const accountCreated = isStr(raw.accountCreated) && DAY.test(raw.accountCreated) ? raw.accountCreated : null;
  const progress = recordOf<LabProgress>(raw.progress, (k, x) => {
    if (!LAB_ID.test(k) || !isObject(x)) return null;
    const steps = recordOf<true>(x.steps, (sk, sv) => (STEP_ID.test(sk) && sv === true ? true : null));
    const notes = recordOf<string>(x.notes, (nk, nv) => (STEP_ID.test(nk) && isStr(nv) && nv.trim() !== '' ? nv.slice(0, NOTE_CAP) : null));
    const out: LabProgress = { steps, notes };
    if (x.ack === true) out.ack = true;
    if (isStr(x.completedAt)) out.completedAt = x.completedAt;
    const debrief = sanitizeDebrief(x.debrief);
    if (debrief) out.debrief = debrief;
    return out;
  });
  return { accountCreated, progress };
}

function sanitizeDebrief(raw: unknown): LabDebrief | undefined {
  if (!isObject(raw)) return undefined;
  const questionIds = strings(raw.questionIds);
  if (questionIds.length === 0 || !isStr(raw.startedAt)) return undefined;
  const answers = recordOf<ActiveAnswer>(raw.answers, (k, x) =>
    questionIds.includes(k) && isObject(x) && typeof x.correct === 'boolean' ? { chosen: ints(x.chosen), correct: x.correct, xp: Math.floor(num(x.xp)) } : null,
  );
  const out: LabDebrief = { questionIds, seed: Math.floor(num(raw.seed)), startedAt: raw.startedAt, answers };
  if (isStr(raw.finishedAt) && questionIds.every((id) => answers[id])) {
    out.finishedAt = raw.finishedAt;
    out.correct = Object.values(answers).filter((a) => a.correct).length;
  }
  return out;
}
