import { describe, expect, it } from 'vitest';
import { CURRENT_VERSION, freshSave } from './schema';
import { MIGRATIONS, migrate, sanitize } from './migrate';
import { BUILDINGS } from '../data';
import v4Json from './__fixtures__/save-v4-real.json';

const known = new Set(BUILDINGS.map((b) => b.id));
const clock = () => '2026-01-01T00:00:00.000Z';

describe('save version 6 (backup date in the save)', () => {
  it('is the current version and has a migration step from 5', () => {
    expect(CURRENT_VERSION).toBe(6);
    expect(MIGRATIONS[5]).toBeTypeOf('function');
  });

  it('a real version 4 save migrates through 5 to 6 with no export date recorded', () => {
    const r = migrate(v4Json, known, clock);
    expect(r.status).toBe('migrated');
    if (r.status !== 'migrated') return;
    expect(r.save.version).toBe(6);
    expect(r.save.ui.lastExportAt).toBeNull();
    expect(r.save.ui.view).toBe((v4Json as { ui: { view: string } }).ui.view);
  });

  it('a version 5 save (no export date yet) gains the field as null', () => {
    const v5 = { version: 5, updatedAt: clock(), buildings: {}, ui: { view: 'map', lastBuilding: null, roads: 'selected' }, game: freshSave(clock).game, labs: freshSave(clock).labs };
    const r = migrate(v5, known, clock);
    expect(r.status).toBe('migrated');
    if (r.status !== 'migrated') return;
    expect(r.save.ui).toEqual({ view: 'map', lastBuilding: null, roads: 'selected', lastExportAt: null });
  });

  it('keeps a valid export date and drops an invalid one', () => {
    const ok = sanitize({ ...freshSave(clock), ui: { view: 'map', lastBuilding: null, roads: 'selected', lastExportAt: '2026-01-02T03:04:05.000Z' } }, known, clock);
    expect(ok.ui.lastExportAt).toBe('2026-01-02T03:04:05.000Z');
    const bad = sanitize({ ...freshSave(clock), ui: { view: 'map', lastBuilding: null, roads: 'selected', lastExportAt: 'yesterday' } }, known, clock);
    expect(bad.ui.lastExportAt).toBeNull();
  });
});
