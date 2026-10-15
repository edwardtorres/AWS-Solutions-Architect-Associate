export const STORAGE_KEY = 'saa-region-builder:save';
export const CORRUPT_KEY = 'saa-region-builder:save:corrupt';
export const APP_ID = 'saa-region-builder';
export const CURRENT_VERSION = 2;

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
  log: LogEntry[];
}

export interface SaveV1 {
  version: 1;
  updatedAt: string;
  buildings: Record<string, { state: StoredState; changedAt: string }>;
  ui: UiPrefs;
}

export interface SaveV2 {
  version: 2;
  updatedAt: string;
  buildings: Record<string, BuildingProgress>;
  ui: UiPrefs;
  game: GameState;
}

export type Save = SaveV2;

export const LOG_CAP = 4000;

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
  };
}

export function freshSave(now: () => string = () => new Date().toISOString()): Save {
  return {
    version: CURRENT_VERSION,
    updatedAt: now(),
    buildings: {},
    ui: { view: 'map', lastBuilding: null, roads: 'selected' },
    game: freshGame(),
  };
}
