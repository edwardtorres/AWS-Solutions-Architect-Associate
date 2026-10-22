import type { Save } from './schema';
import type { KeyValueStorage } from './store';

/** The backup reminder appears when the last export is this many days old (or there has been none). */
export const BACKUP_DAYS = 7;
/** "Later" hides the reminder for this many hours. */
export const SNOOZE_HOURS = 24;
export const SNOOZE_KEY = 'saa-region-builder:backup-snooze-until';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export interface BackupState {
  /** Milliseconds since the epoch. */
  now: number;
  lastExportAt: string | null;
  hasProgress: boolean;
  /** Milliseconds since the epoch until which the reminder is hidden, or null. */
  snoozedUntil: number | null;
}

/** Shows when there is progress to protect, no export in the last seven days, and no active snooze. */
export function backupDue(state: BackupState): boolean {
  if (!state.hasProgress) return false;
  if (state.snoozedUntil !== null && state.now < state.snoozedUntil) return false;
  if (state.lastExportAt === null) return true;
  const exported = Date.parse(state.lastExportAt);
  if (Number.isNaN(exported)) return true;
  return state.now - exported >= BACKUP_DAYS * DAY_MS;
}

/** Progress worth protecting: a building, earned XP, or a lab step ticked. A fresh save has none. */
export function hasProgress(save: Save): boolean {
  return Object.keys(save.buildings).length > 0 || save.game.xp > 0 || Object.keys(save.labs.progress).length > 0;
}

export function readSnooze(storage: KeyValueStorage | null): number | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(SNOOZE_KEY);
    if (raw === null) return null;
    const until = Number(raw);
    return Number.isFinite(until) ? until : null;
  } catch {
    return null;
  }
}

/** Hides the reminder until `SNOOZE_HOURS` after `now`. A blocked store just means the reminder returns next visit. */
export function writeSnooze(storage: KeyValueStorage | null, now: number): number {
  const until = now + SNOOZE_HOURS * HOUR_MS;
  try {
    storage?.setItem(SNOOZE_KEY, String(until));
  } catch {
    /* storage blocked: nothing to remember */
  }
  return until;
}
