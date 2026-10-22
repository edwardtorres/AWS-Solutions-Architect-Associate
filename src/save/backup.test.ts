import { describe, expect, it } from 'vitest';
import { BACKUP_DAYS, SNOOZE_HOURS, SNOOZE_KEY, backupDue, hasProgress, readSnooze, writeSnooze, type BackupState } from './backup';
import { freshSave } from './schema';
import type { KeyValueStorage } from './store';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-06-10T12:00:00.000Z');
const base: BackupState = { now: NOW, lastExportAt: null, hasProgress: true, snoozedUntil: null };

class MemoryStorage implements KeyValueStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

describe('backup reminder', () => {
  it('uses seven days', () => {
    expect(BACKUP_DAYS).toBe(7);
  });

  it('never shows for a fresh save with no progress', () => {
    expect(backupDue({ ...base, hasProgress: false })).toBe(false);
  });

  it('shows when progress exists and there has never been an export', () => {
    expect(backupDue(base)).toBe(true);
  });

  it('shows once the last export is seven days old, and not before', () => {
    expect(backupDue({ ...base, lastExportAt: new Date(NOW - 7 * DAY + 60_000).toISOString() })).toBe(false);
    expect(backupDue({ ...base, lastExportAt: new Date(NOW - 7 * DAY).toISOString() })).toBe(true);
  });

  it('treats an unreadable export date as never exported', () => {
    expect(backupDue({ ...base, lastExportAt: 'not a date' })).toBe(true);
  });

  it('is hidden while a snooze is active and returns when it ends', () => {
    expect(backupDue({ ...base, snoozedUntil: NOW + 1000 })).toBe(false);
    expect(backupDue({ ...base, snoozedUntil: NOW - 1 })).toBe(true);
  });

  it('counts a building, earned XP or a lab step as progress', () => {
    const fresh = freshSave(() => '2026-01-01T00:00:00.000Z');
    expect(hasProgress(fresh)).toBe(false);
    expect(hasProgress({ ...fresh, game: { ...fresh.game, xp: 10 } })).toBe(true);
    expect(hasProgress({ ...fresh, buildings: { 'x-y': { state: 'commissioned', changedAt: 'now' } } })).toBe(true);
  });
});

describe('snooze storage', () => {
  it('Later hides the reminder for 24 hours and is read back', () => {
    const storage = new MemoryStorage();
    const until = writeSnooze(storage, NOW);
    expect(until).toBe(NOW + SNOOZE_HOURS * 60 * 60 * 1000);
    expect(storage.getItem(SNOOZE_KEY)).toBe(String(until));
    expect(readSnooze(storage)).toBe(until);
  });

  it('reads nothing when storage is missing or blocked', () => {
    expect(readSnooze(null)).toBeNull();
    const blocked: KeyValueStorage = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      },
      removeItem() {},
    };
    expect(readSnooze(blocked)).toBeNull();
    expect(() => writeSnooze(blocked, NOW)).not.toThrow();
  });
});
