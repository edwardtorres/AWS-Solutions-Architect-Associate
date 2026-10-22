export const STORAGE_KEY = 'saa-region-builder:save';
export const CORRUPT_KEY = 'saa-region-builder:save:corrupt';
export const APP_ID = 'saa-region-builder';
export const CURRENT_VERSION = 6;

/** Only progress states are stored. planned/surveyed are derived from the roads. */
export type StoredState = 'under_construction' | 'commissioned';

/** How a building was commissioned. Absent for saves from before version 2. */
export type CommissionedVia = 'inspection' | 'placement';

export interface BuildingProgress {
  state: StoredState;
  changedAt: string;
  via?: CommissionedVia;
}

export interface UiPrefs {
  view: 'map' | 'atlas';
  lastBuilding: string | null;
  roads: 'selected' | 'all';
  /** ISO time of the most recent backup export; drives the backup reminder. Added in version 6. */
  lastExportAt: string | null;
}

/** The three attempt types a building can have; the others are reserved for later steps. */
export type AttemptKind = 'startup' | 'inspection' | 'placement';
export type LogKind = AttemptKind | 'review' | 'puzzle' | 'lab' | 'mock';

export interface ActiveAnswer {
  /** Authored option indices the player chose. */
  chosen: number[];
  correct: boolean;
  /** XP this answer earned. */
  xp: number;
}

/** An attempt in progress. Persisted so a reload resumes the same questions in the same order. */
export interface ActiveAttempt {
  id: string;
  kind: AttemptKind;
  building: string;
  questionIds: string[];
  /** Seed for the per-question option shuffle; stable within the attempt. */
  seed: number;
  startedAt: string;
  /** Local day (YYYY-MM-DD) the attempt started. */
  day: string;
  answers: Record<string, ActiveAnswer>;
}

export interface Flag {
  id: string;
  questionId: string;
  note: string;
  /** Authored option indices the player had chosen. */
  myAnswer: number[];
  at: string;
}

/** Compact answer log: question id, 1 when correct, ISO timestamp, attempt kind. */
export type LogEntry = [questionId: string, correct: 0 | 1, at: string, kind: LogKind];

export interface InspectionRecord {
  /** Local day of the most recent failed inspection. */
  day: string;
  /** Failed inspections on that day. Two locks the building until the next local day. */
  fails: number;
  /** Question ids of the most recent finished inspection, avoided by the next draw. */
  prevIds: string[];
}

/** Per-item (question or puzzle scenario) answer summary. Updated on every answer and never trimmed. */
export interface ItemHistory {
  /** Times answered. */
  n: number;
  /** Times answered correctly. */
  ok: number;
  /** Current run of correct answers (0 after a miss). */
  streak: number;
  /** ISO time of the last answer. */
  last: string;
  lastOk: 0 | 1;
  lastKind: LogKind;
}

/** A counted result kept for readiness: item id, correct, attempt type. */
export type RecentEntry = [itemId: string, correct: 0 | 1, kind: LogKind];

/** A review or maintenance session in progress (separate from `active`, which belongs to building attempts). Answers are logged as kind `review`. */
export interface ReviewSession {
  id: string;
  kind: 'review' | 'maintenance';
  /** The building a maintenance set is for; null for the daily review. */
  building: string | null;
  questionIds: string[];
  seed: number;
  startedAt: string;
  day: string;
  answers: Record<string, ActiveAnswer>;
}

/** Answers and misses on questions tagged `trap:<pair>`, counted kinds only. */
export interface TrapRecord {
  n: number;
  miss: number;
}

/** A mock exam in progress. Answers stay hidden until it is submitted. */
export interface MockActive {
  id: string;
  startedAt: string;
  durationMs: number;
  /** Dev-only short mock (never counts towards "ready to book"). */
  short: boolean;
  questionIds: string[];
  seed: number;
  /** Authored option indices chosen so far. */
  answers: Record<string, number[]>;
  flags: string[];
  /** Questions not answered in the 14 calendar days before the start, and the freshness verdict fixed at the start. */
  fresh: number;
  counts: boolean;
  reserveUsed: number;
}

/** A finished mock. Keeps what the results page needs; the latest MOCK_HISTORY_CAP are kept. */
export interface MockRecord {
  id: string;
  startedAt: string;
  finishedAt: string;
  short: boolean;
  /** True when the timer ran out and the mock was submitted automatically. */
  expired: boolean;
  total: number;
  correct: number;
  /** Per exam domain "1" to "4": [correct, total]. */
  domains: Record<string, [number, number]>;
  questionIds: string[];
  seed: number;
  chosen: Record<string, number[]>;
  flags: string[];
  fresh: number;
  counts: boolean;
  reserveUsed: number;
  /** Don't-confuse pairs fallen for in this mock: pair id to misses. */
  trapMisses: Record<string, number>;
}

export interface MockState {
  /** Mocks started so far (the first two draw from the reserve). */
  started: number;
  active: MockActive | null;
  history: MockRecord[];
}

export interface GameState {
  notesOpened: Record<string, string>;
  startups: Record<string, { prevIds: string[] }>;
  inspections: Record<string, InspectionRecord>;
  /** Local day of the most recent placement attempt start, per building. */
  placements: Record<string, { lastStartDay: string }>;
  active: ActiveAttempt | null;
  xp: number;
  /** Times each question has been answered; a repeat earns a quarter of the XP. */
  seen: Record<string, number>;
  /** Questions answered per local day (for streaks). */
  days: Record<string, number>;
  bestStreak: number;
  badges: Record<string, string>;
  /** Buildings whose one-time commissioning bonus was paid. */
  bonus: Record<string, true>;
  flags: Flag[];
  /** Compact audit trail of answers, capped at LOG_CAP. Nothing in the app depends on it (see `history` and `recent`). */
  log: LogEntry[];
  /** Per-item summaries (never trimmed). */
  history: Record<string, ItemHistory>;
  /**
   * Counted results per exam domain ("1" to "4") for readiness, oldest first: the newest RECENT_NONPUZZLE_CAP
   * non-puzzle results plus the newest RECENT_PUZZLE_CAP puzzle plays. Those are exactly the entries the readiness
   * windows can ever look at, so pruning never changes a readiness figure.
   */
  recent: Record<string, RecentEntry[]>;
  /** Last BULLET_WINDOW counted results per outline bullet, oldest first, as a string of "1" and "0". */
  byBullet: Record<string, string>;
  /** Last MAINT_WINDOW review, maintenance and mock results per building, oldest first ("1"/"0"). */
  maint: Record<string, string>;
  traps: Record<string, TrapRecord>;
  /** Review answers given on one local day (the daily cap). */
  reviewDay: { day: string; done: number };
  review: ReviewSession | null;
  mock: MockState;
  /** True once byBullet was filled from `recent` (a one-time backfill for saves made before version 5). */
  statsBackfilled: boolean;
}

export interface SaveV1 {
  version: 1;
  updatedAt: string;
  buildings: Record<string, { state: StoredState; changedAt: string }>;
  ui: UiPrefs;
}

/** A lab debrief: three questions drawn from the lab's bullets, answered once; logged as the attempt type `lab`. */
export interface LabDebrief {
  questionIds: string[];
  seed: number;
  startedAt: string;
  answers: Record<string, ActiveAnswer>;
  /** Set when every question is answered. */
  finishedAt?: string;
  correct?: number;
}

/** Self-reported progress through one lab. Labs never change a building's state. */
export interface LabProgress {
  /** Ticked step ids. */
  steps: Record<string, true>;
  /** Per-step "Report a problem" notes (the owner's words; never auto-filled). */
  notes: Record<string, string>;
  /** The owner ticked the acknowledgement of a gated lab's warning (its steps stay hidden until then). */
  ack?: true;
  /** Set when the owner marks the lab complete (pays the fixed lab XP once). */
  completedAt?: string;
  /** The current or most recent debrief. */
  debrief?: LabDebrief;
}

export interface LabsState {
  /** Local calendar date (YYYY-MM-DD) the lab AWS account was created, or null while unset. A date only. */
  accountCreated: string | null;
  progress: Record<string, LabProgress>;
}

export interface SaveV4 {
  version: 4;
  updatedAt: string;
  buildings: Record<string, BuildingProgress>;
  ui: UiPrefs;
  game: Omit<GameState, 'byBullet' | 'maint' | 'traps' | 'reviewDay' | 'review' | 'mock' | 'statsBackfilled'>;
  labs: LabsState;
}

export interface SaveV3 {
  version: 3;
  updatedAt: string;
  buildings: Record<string, BuildingProgress>;
  ui: UiPrefs;
  game: GameState;
}


export interface SaveV5 {
  version: 5;
  updatedAt: string;
  buildings: Record<string, BuildingProgress>;
  ui: Omit<UiPrefs, 'lastExportAt'>;
  game: GameState;
  labs: LabsState;
}

export interface SaveV6 {
  version: 6;
  updatedAt: string;
  buildings: Record<string, BuildingProgress>;
  ui: UiPrefs;
  game: GameState;
  labs: LabsState;
}

export type Save = SaveV6;

export const NOTE_CAP = 1000;

export const LOG_CAP = 4000;
export const BULLET_WINDOW = 10;
export const MAINT_WINDOW = 8;
export const MOCK_HISTORY_CAP = 30;
/** The largest readiness window (coverage) and the puzzle cap inside the accuracy window. */
export const RECENT_NONPUZZLE_CAP = 100;
export const RECENT_PUZZLE_CAP = 8;

export function freshGame(): GameState {
  return {
    notesOpened: {},
    startups: {},
    inspections: {},
    placements: {},
    active: null,
    xp: 0,
    seen: {},
    days: {},
    bestStreak: 0,
    badges: {},
    bonus: {},
    flags: [],
    log: [],
    history: {},
    recent: {},
    byBullet: {},
    maint: {},
    traps: {},
    reviewDay: { day: '', done: 0 },
    review: null,
    mock: { started: 0, active: null, history: [] },
    statsBackfilled: false,
  };
}

export function freshLabs(): LabsState {
  return { accountCreated: null, progress: {} };
}

export function freshSave(now: () => string = () => new Date().toISOString()): Save {
  return {
    version: CURRENT_VERSION,
    updatedAt: now(),
    buildings: {},
    ui: { view: 'map', lastBuilding: null, roads: 'selected', lastExportAt: null },
    game: freshGame(),
    labs: freshLabs(),
  };
}
