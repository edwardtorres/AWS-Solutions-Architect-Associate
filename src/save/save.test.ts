import { describe, expect, it } from 'vitest';
import { CORRUPT_KEY, CURRENT_VERSION, STORAGE_KEY, freshSave } from './schema';
import { MIGRATIONS, migrate, sanitize } from './migrate';
import { createSaveStore, type KeyValueStorage } from './store';
import { deriveState } from './state';
import fixtureJson from './__fixtures__/save-v2-real.json';
import v3Json from './__fixtures__/save-v3-real.json';
import v4Json from './__fixtures__/save-v4-real.json';
import { domainOfItem } from './migrate';
import { computeReadiness } from '../game/readiness';
import { DEFAULT_ENV } from '../game/env';
import { BUILDINGS, GRAPH, START_IDS } from '../data';

const known = new Set(BUILDINGS.map((b) => b.id));
const clock = () => '2026-01-01T00:00:00.000Z';

class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

const makeStore = (storage: KeyValueStorage | null) => createSaveStore({ knownIds: known, storage, now: clock });

describe('save schema', () => {
  it('starts fresh with version 1 and nothing built', () => {
    const store = makeStore(new MemoryStorage());
    const s = store.getSnapshot();
    expect(s.status).toBe('fresh');
    expect(s.save.version).toBe(CURRENT_VERSION);
    expect(s.save.buildings).toEqual({});
  });

  it('round-trips progress through storage', () => {
    const storage = new MemoryStorage();
    const a = makeStore(storage);
    a.setBuildingState('identity-keep', 'commissioned');
    a.setUi({ view: 'atlas', lastBuilding: 'gatehouse', roads: 'all' });
    const b = makeStore(storage);
    expect(b.getSnapshot().status).toBe('ok');
    expect(b.getSnapshot().save.buildings['identity-keep']?.state).toBe('commissioned');
    expect(b.getSnapshot().save.ui).toEqual({ view: 'atlas', lastBuilding: 'gatehouse', roads: 'all', lastExportAt: null });
  });

  it('notifies subscribers and ignores unknown buildings', () => {
    const store = makeStore(new MemoryStorage());
    let calls = 0;
    const off = store.subscribe(() => {
      calls += 1;
    });
    store.setBuildingState('nope', 'commissioned');
    expect(calls).toBe(0);
    store.setBuildingState('gatehouse', 'under_construction');
    expect(calls).toBe(1);
    off();
    store.setBuildingState('gatehouse', null);
    expect(calls).toBe(1);
  });
});

describe('migrations', () => {
  it('has a migration for every version below current', () => {
    for (let v = 0; v < CURRENT_VERSION; v += 1) expect(MIGRATIONS[v]).toBeTypeOf('function');
  });

  it('migrates the unversioned v0 shape to the current version and writes it back', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ buildings: { 'identity-keep': 'commissioned', bogus: 'commissioned', gatehouse: 'planned' } }));
    const store = makeStore(storage);
    expect(store.getSnapshot().status).toBe('migrated');
    expect(Object.keys(store.getSnapshot().save.buildings)).toEqual(['identity-keep']);
    expect(JSON.parse(storage.getItem(STORAGE_KEY) as string).version).toBe(CURRENT_VERSION);
  });

  it('prunes unknown ids and coerces bad fields when sanitizing', () => {
    const save = sanitize(
      {
        version: 1,
        buildings: { gatehouse: { state: 'commissioned' }, ghost: { state: 'commissioned' }, 'key-vault': { state: 'wrong' } },
        ui: { view: 'sideways', lastBuilding: 'ghost', roads: 'all' },
      },
      known,
      clock,
    );
    expect(Object.keys(save.buildings)).toEqual(['gatehouse']);
    expect(save.ui).toEqual({ view: 'map', lastBuilding: null, roads: 'all', lastExportAt: null });
  });

  it('rejects non-object saves and invalid versions', () => {
    expect(migrate('x', known, clock).status).toBe('invalid');
    expect(migrate([], known, clock).status).toBe('invalid');
    expect(migrate({ version: -2 }, known, clock).status).toBe('invalid');
    expect(migrate({ version: 'one' }, known, clock).status).toBe('invalid');
  });
});

describe('unusual storage conditions', () => {
  it('keeps a copy of corrupt JSON and starts fresh', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{not json');
    const store = makeStore(storage);
    expect(store.getSnapshot().status).toBe('corrupt-recovered');
    expect(storage.getItem(CORRUPT_KEY)).toBe('{not json');
    expect(store.getSnapshot().readOnly).toBe(false);
  });

  it('loads a save from a newer app read-only and never overwrites it', () => {
    const storage = new MemoryStorage();
    const future = JSON.stringify({ version: 99, mystery: true });
    storage.setItem(STORAGE_KEY, future);
    const store = makeStore(storage);
    expect(store.getSnapshot()).toMatchObject({ status: 'future-readonly', readOnly: true });
    store.setBuildingState('gatehouse', 'commissioned');
    store.setUi({ view: 'atlas' });
    expect(storage.getItem(STORAGE_KEY)).toBe(future);
    expect(store.getSnapshot().save.buildings).toEqual({});
  });

  it('works in memory when storage is unavailable', () => {
    const store = makeStore(null);
    expect(store.getSnapshot().status).toBe('storage-unavailable');
    store.setBuildingState('identity-keep', 'commissioned');
    expect(store.getSnapshot().save.buildings['identity-keep']?.state).toBe('commissioned');
  });

  it('survives storage that throws on read and write', () => {
    const throwing: KeyValueStorage = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('quota');
      },
      removeItem() {
        throw new Error('blocked');
      },
    };
    const store = makeStore(throwing);
    expect(store.getSnapshot().status).toBe('storage-unavailable');
    expect(() => store.setBuildingState('identity-keep', 'commissioned')).not.toThrow();
  });

  it('survives storage that throws only on write', () => {
    const storage = new MemoryStorage();
    storage.setItem = () => {
      throw new Error('quota');
    };
    const store = makeStore(storage);
    expect(() => store.setBuildingState('identity-keep', 'commissioned')).not.toThrow();
    expect(store.getSnapshot().save.buildings['identity-keep']?.state).toBe('commissioned');
  });
});

describe('export and import', () => {
  it('round-trips an export through import', () => {
    const a = makeStore(new MemoryStorage());
    a.setBuildingState('identity-keep', 'commissioned');
    a.setBuildingState('gatehouse', 'under_construction');
    const text = a.exportJson();
    const b = makeStore(new MemoryStorage());
    const res = b.importJson(text);
    expect(res.ok).toBe(true);
    expect(b.getSnapshot().save.buildings).toEqual(a.getSnapshot().save.buildings);
  });

  it('accepts a bare save and migrates a legacy one', () => {
    const b = makeStore(new MemoryStorage());
    expect(b.importJson(JSON.stringify(freshSave(clock))).ok).toBe(true);
    expect(b.importJson(JSON.stringify({ buildings: { 'identity-keep': 'commissioned' } })).ok).toBe(true);
    expect(b.getSnapshot().save.buildings['identity-keep']?.state).toBe('commissioned');
  });

  it('rejects bad JSON, foreign files and future versions without changing the save', () => {
    const b = makeStore(new MemoryStorage());
    b.setBuildingState('identity-keep', 'commissioned');
    expect(b.importJson('nope').ok).toBe(false);
    expect(b.importJson(JSON.stringify({ app: 'other-app', save: {} })).ok).toBe(false);
    expect(b.importJson(JSON.stringify({ version: 7 })).ok).toBe(false);
    expect(b.importJson('"just a string"').ok).toBe(false);
    expect(b.getSnapshot().save.buildings['identity-keep']?.state).toBe('commissioned');
  });

  it('lets an import recover a read-only (future) session', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 99 }));
    const store = makeStore(storage);
    expect(store.getSnapshot().readOnly).toBe(true);
    expect(store.importJson(JSON.stringify(freshSave(clock))).ok).toBe(true);
    expect(store.getSnapshot().readOnly).toBe(false);
  });
});

describe('derived building state', () => {
  const starts = new Set(START_IDS);
  const state = (id: string, save = freshSave(clock)) => deriveState(id, save, GRAPH, starts);

  it('opens Foundations as surveyed and locks everything else as planned', () => {
    expect(state('pillar-plaza')).toBe('surveyed');
    expect(state('identity-keep')).toBe('planned');
  });

  it('surveys a building once all its prerequisites are commissioned', () => {
    const save = freshSave(clock);
    for (const id of ['safe-harbor-account', 'pillar-plaza', 'charter-hall']) save.buildings[id] = { state: 'commissioned', changedAt: clock() };
    expect(state('identity-keep', save)).toBe('surveyed');
    expect(state('watchtower', save)).toBe('planned');
  });

  it('requires every prerequisite, not just one', () => {
    const save = freshSave(clock);
    save.buildings['pillar-plaza'] = { state: 'commissioned', changedAt: clock() };
    expect(state('blueprint-hall', save)).toBe('planned');
    save.buildings['town-charter'] = { state: 'commissioned', changedAt: clock() };
    expect(state('blueprint-hall', save)).toBe('surveyed');
  });

  it('keeps stored progress even if prerequisites are not commissioned', () => {
    const save = freshSave(clock);
    save.buildings['cold-cellar'] = { state: 'under_construction', changedAt: clock() };
    expect(state('cold-cellar', save)).toBe('under_construction');
  });

  it('does not count under-construction prerequisites as done', () => {
    const save = freshSave(clock);
    save.buildings['safe-harbor-account'] = { state: 'under_construction', changedAt: clock() };
    save.buildings['pillar-plaza'] = { state: 'commissioned', changedAt: clock() };
    expect(state('ledger-office', save)).toBe('planned');
  });
});

describe('v1 to current migration', () => {
  const v1 = {
    version: 1,
    updatedAt: '2025-12-01T00:00:00.000Z',
    buildings: { 'identity-keep': { state: 'commissioned', changedAt: '2025-12-01T00:00:00.000Z' }, gatehouse: { state: 'under_construction', changedAt: '2025-12-02T00:00:00.000Z' }, ghost: { state: 'commissioned', changedAt: 'x' } },
    ui: { view: 'atlas', lastBuilding: 'gatehouse', roads: 'all' },
  };

  it('keeps v1 progress and UI untouched and adds an empty game block', () => {
    const r = migrate(v1, known, clock);
    expect(r.status).toBe('migrated');
    if (r.status !== 'migrated') return;
    expect(r.save.version).toBe(6);
    expect(r.save.buildings).toEqual({ 'identity-keep': v1.buildings['identity-keep'], gatehouse: v1.buildings.gatehouse });
    expect(r.save.ui).toEqual({ ...v1.ui, lastExportAt: null });
    expect(r.save.game).toEqual(freshSave(clock).game);
  });

  it('loads a v1 export through the store, writes the current version back and keeps it', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify(v1));
    const store = makeStore(storage);
    expect(store.getSnapshot().status).toBe('migrated');
    expect(JSON.parse(storage.getItem(STORAGE_KEY) as string).version).toBe(6);
    const other = makeStore(null);
    expect(other.importJson(JSON.stringify({ app: 'saa-region-builder', save: v1 })).ok).toBe(true);
    expect(other.getSnapshot().save.version).toBe(6);
    expect(Object.keys(other.getSnapshot().save.buildings)).toHaveLength(2);
  });

  it('round-trips a v2 save with game data through export and import', () => {
    const store = makeStore(null);
    store.markNotesOpened('identity-keep');
    store.addFlag('some-question-001', 'unclear', [2]);
    const text = store.exportJson();
    const other = makeStore(null);
    expect(other.importJson(text).ok).toBe(true);
    expect(other.getSnapshot().save.game.notesOpened['identity-keep']).toBeTruthy();
    expect(other.getSnapshot().save.game.flags[0]).toMatchObject({ questionId: 'some-question-001', note: 'unclear', myAnswer: [2] });
  });

  it('sanitizes a malformed game block field by field', () => {
    const r = sanitize(
      {
        version: 3,
        buildings: {},
        ui: {},
        game: {
          notesOpened: { gatehouse: '2026-01-01T00:00:00Z', ghost: 'x', 'key-vault': 5 },
          inspections: { gatehouse: { day: 'yesterday', fails: 1, prevIds: [] }, 'key-vault': { day: '2026-01-02', fails: -4, prevIds: ['a', 7] } },
          placements: { gatehouse: { lastStartDay: '2026-01-02' } },
          xp: -50,
          seen: { 'q-1': 2, 'q-2': 0, 'q-3': 'many' },
          days: { '2026-01-02': 11, nope: 5 },
          flags: [{ id: 'f1', questionId: 'q-1', note: 'n', myAnswer: [0, 99, 'x'] }, { id: 7 }],
          log: [['q-1', 1, '2026-01-02T00:00:00Z', 'inspection'], ['q-2', 3, 'x', 'inspection'], ['q-3', 0, 'x', 'bogus'], 'junk'],
          active: { id: 'a', kind: 'inspection', building: 'ghost', questionIds: ['q'], startedAt: 'x', day: '2026-01-02' },
        },
      },
      known,
      clock,
    );
    expect(Object.keys(r.game.notesOpened)).toEqual(['gatehouse']);
    expect(r.game.inspections).toEqual({ 'key-vault': { day: '2026-01-02', fails: 0, prevIds: ['a'] } });
    expect(r.game.placements).toEqual({ gatehouse: { lastStartDay: '2026-01-02' } });
    expect(r.game.xp).toBe(0);
    expect(r.game.seen).toEqual({ 'q-1': 2 });
    expect(r.game.days).toEqual({ '2026-01-02': 11 });
    expect(r.game.flags).toHaveLength(1);
    expect(r.game.flags[0]?.myAnswer).toEqual([0]);
    expect(r.game.log).toEqual([['q-1', 1, '2026-01-02T00:00:00Z', 'inspection']]);
    expect(r.game.active).toBeNull();
  });

  it('caps the answer log at 4000 newest entries', () => {
    const log = Array.from({ length: 4100 }, (_, i) => [`q-${i}`, 1, '2026-01-02T00:00:00Z', 'inspection']);
    const r = sanitize({ version: 3, buildings: {}, ui: {}, game: { log } }, known, clock);
    expect(r.game.log).toHaveLength(4000);
    expect(r.game.log[0]?.[0]).toBe('q-100');
  });
});

describe('v2 to v3 migration (answer history)', () => {
  const fixture = fixtureJson as unknown as Record<string, unknown> & { game: { log: [string, 0 | 1, string, string][]; flags: unknown[]; xp: number } };

  it('the fixture is a genuine v2 save from the app (played in Chromium)', () => {
    expect(fixture.version).toBe(2);
    expect(fixture.game.log.length).toBeGreaterThan(20);
    expect(fixture.game.flags).toHaveLength(1);
  });

  it('builds a per-item summary from the log and keeps everything else', () => {
    const r = migrate(fixture, known, clock);
    expect(r.status).toBe('migrated');
    if (r.status !== 'migrated') return;
    const { game } = r.save;
    expect(r.save.version).toBe(6);
    // Every field of the old game block survives.
    expect(game.xp).toBe(fixture.game.xp);
    expect(game.flags).toHaveLength(1);
    expect(game.log).toEqual(fixture.game.log);
    expect(Object.keys(r.save.buildings)).toEqual(Object.keys(fixture.buildings as object));
    // History equals a recount of the log, item by item.
    const ids = new Set(fixture.game.log.map((e) => e[0]));
    expect(new Set(Object.keys(game.history))).toEqual(ids);
    for (const id of ids) {
      const entries = fixture.game.log.filter((e) => e[0] === id);
      const last = entries[entries.length - 1] as (typeof entries)[number];
      let streak = 0;
      for (const e of entries) streak = e[1] === 1 ? streak + 1 : 0;
      expect(game.history[id]).toEqual({ n: entries.length, ok: entries.filter((e) => e[1] === 1).length, streak, last: last[2], lastOk: last[1], lastKind: last[3] });
    }
    const total = Object.values(game.history).reduce((n, h) => n + h.n, 0);
    expect(total).toBe(fixture.game.log.length);
  });

  it('builds the per-domain recent lists from counted entries only (never start-up checks)', () => {
    const r = migrate(fixture, known, clock);
    if (r.status !== 'migrated') throw new Error('should migrate');
    const counted = fixture.game.log.filter((e) => e[3] !== 'startup' && domainOfItem(e[0]) !== null);
    const inRecent = Object.values(r.save.game.recent).flat();
    expect(inRecent).toHaveLength(counted.length);
    expect(inRecent.some((e) => e[2] === 'startup')).toBe(false);
    for (const [d, list] of Object.entries(r.save.game.recent)) for (const e of list) expect(String(domainOfItem(e[0]))).toBe(d);
  });

  it('gives the same readiness before and after, computed from the log and from recent', () => {
    const r = migrate(fixture, known, clock);
    if (r.status !== 'migrated') throw new Error('should migrate');
    const meta = new Map(fixture.game.log.map((e) => [e[0], { id: e[0], building: e[0].replace(/-\d{3}$/, ''), bullets: ['x'], difficulty: 2 as const }]));
    const fromLog: Record<string, [string, 0 | 1, 'inspection'][]> = {};
    for (const e of fixture.game.log) {
      const d = domainOfItem(e[0]);
      if (d !== null && e[3] !== 'startup') (fromLog[String(d)] ??= []).push([e[0], e[1], e[3] as 'inspection']);
    }
    const a = computeReadiness(r.save.game.recent, meta, DEFAULT_ENV);
    const b = computeReadiness(fromLog, meta, DEFAULT_ENV);
    expect(a).toEqual(b);
  });

  it('history stays complete when the answer log is trimmed, and is never trimmed itself', () => {
    const log = Array.from({ length: 4100 }, (_, i) => [`gatehouse-${String((i % 50) + 1).padStart(3, '0')}`, i % 2, `2026-01-01T00:00:${String(i % 60).padStart(2, '0')}.000Z`, 'inspection']);
    const r = migrate({ version: 2, buildings: {}, ui: {}, game: { log } }, known, clock);
    if (r.status !== 'migrated') throw new Error('should migrate');
    expect(r.save.game.log).toHaveLength(4000);
    expect(Object.values(r.save.game.history).reduce((n, h) => n + h.n, 0)).toBe(4100);
    expect(r.save.game.recent['1']).toHaveLength(100);
  });

  it('is idempotent on a v3 save and rejects malformed history', () => {
    const once = migrate(fixture, known, clock);
    if (once.status !== 'migrated') throw new Error('should migrate');
    const twice = migrate(JSON.parse(JSON.stringify(once.save)), known, clock);
    expect(twice).toMatchObject({ status: 'ok' });
    if (twice.status === 'ok') expect(twice.save).toEqual(once.save);
    const bad = sanitize({ version: 3, buildings: {}, ui: {}, game: { history: { 'gatehouse-001': { n: 0 }, 'gatehouse-002': { n: 3, ok: 9, streak: 8, last: 'x', lastOk: 1, lastKind: 'inspection' }, 'gatehouse-003': 'x' }, recent: { '1': [['gatehouse-001', 1, 'startup'], ['gatehouse-001', 1, 'inspection'], 'junk'], '7': [['a', 1, 'inspection']] } } }, known, clock);
    expect(Object.keys(bad.game.history)).toEqual(['gatehouse-002']);
    expect(bad.game.history['gatehouse-002']).toMatchObject({ ok: 3, streak: 3 });
    expect(bad.game.recent).toEqual({ '1': [['gatehouse-001', 1, 'inspection']] });
  });
});

describe('v3 to v4 migration on a real v3 save', () => {
  const fixture = v3Json as unknown as { version: number; buildings: Record<string, unknown>; ui: unknown; game: { log: unknown[]; xp: number; history: Record<string, unknown>; recent: Record<string, unknown[]>; flags: unknown[] } };

  it('is a genuine v3 save captured from the production build', () => {
    expect(fixture.version).toBe(3);
    expect(fixture.game.log.length).toBeGreaterThan(10);
    expect(Object.keys(fixture.game.history).length).toBeGreaterThan(5);
  });

  it('adds an empty labs block and changes nothing else', () => {
    const r = migrate(fixture, known, clock);
    expect(r.status).toBe('migrated');
    if (r.status !== 'migrated') return;
    expect(r.save.version).toBe(6);
    expect(r.save.labs).toEqual({ accountCreated: null, progress: {} });
    expect(r.save.game.xp).toBe(fixture.game.xp);
    expect(r.save.game.history).toEqual(fixture.game.history);
    expect(r.save.game.recent).toEqual(fixture.game.recent);
    expect(r.save.game.log).toHaveLength(fixture.game.log.length);
    expect(r.save.buildings).toEqual(fixture.buildings);
    expect(r.save.ui).toEqual({ ...(fixture.ui as object), lastExportAt: null });
  });

  it('readiness is the same before and after', () => {
    const r = migrate(fixture, known, clock);
    if (r.status !== 'migrated') throw new Error('not migrated');
    const meta = new Map(fixture.game.log.map((e) => [String((e as unknown[])[0]), { id: String((e as unknown[])[0]), building: String((e as unknown[])[0]).replace(/-\d{3}$/, ''), bullets: ['x'], difficulty: 2 as const }]));
    const before = computeReadiness(fixture.game.recent as never, meta, DEFAULT_ENV);
    expect(computeReadiness(r.save.game.recent, meta, DEFAULT_ENV)).toEqual(before);
  });

  it('loads through the store, writes v4 back and keeps the labs block through export and import', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify(fixture));
    const store = makeStore(storage);
    expect(store.getSnapshot().status).toBe('migrated');
    expect(JSON.parse(storage.getItem(STORAGE_KEY) as string).version).toBe(6);
    store.setLabStep('lab-01-safe-account', 's1', true);
    store.setLabNote('lab-01-safe-account', 's1', 'the page looked different');
    store.setLabAccountCreated('2026-09-01');
    const other = makeStore(null);
    expect(other.importJson(store.exportJson()).ok).toBe(true);
    expect(other.getSnapshot().save.labs).toEqual({ accountCreated: '2026-09-01', progress: { 'lab-01-safe-account': { steps: { s1: true }, notes: { s1: 'the page looked different' } } } });
  });

  it('sanitizes a malformed labs block field by field', () => {
    const r = sanitize(
      {
        version: 4,
        buildings: {},
        ui: {},
        game: {},
        labs: {
          accountCreated: 'last week',
          progress: {
            'lab-01-safe-account': { steps: { s1: true, 'BAD ID': true, s2: false }, notes: { s1: '  ', s3: 'x'.repeat(5000), s4: 7 }, completedAt: '2026-01-01T00:00:00Z', debrief: { questionIds: ['a-001', 'a-002', 'a-003'], seed: 3, startedAt: 'x', answers: { 'a-001': { chosen: [0], correct: true, xp: 10 }, 'zzz': { chosen: [], correct: true, xp: 1 } }, finishedAt: 'y' } },
            'not a lab': { steps: {} },
          },
        },
      },
      known,
      clock,
    );
    expect(r.labs.accountCreated).toBeNull();
    expect(Object.keys(r.labs.progress)).toEqual(['lab-01-safe-account']);
    const p = r.labs.progress['lab-01-safe-account'];
    expect(p?.steps).toEqual({ s1: true });
    expect(Object.keys(p?.notes ?? {})).toEqual(['s3']);
    expect(p?.notes.s3).toHaveLength(1000);
    expect(p?.debrief?.finishedAt).toBeUndefined(); // not every question answered
    expect(Object.keys(p?.debrief?.answers ?? {})).toEqual(['a-001']);
  });
});

describe('v4 to v5 migration on a real v4 save', () => {
  const fixture = v4Json as unknown as { version: number; buildings: Record<string, unknown>; ui: unknown; labs: unknown; game: { log: unknown[]; xp: number; history: Record<string, unknown>; recent: Record<string, unknown[]> } };

  it('is a genuine v4 save captured from the production build', () => {
    expect(fixture.version).toBe(4);
    expect(fixture.labs).toBeDefined();
    expect(fixture.game.log.length).toBeGreaterThan(10);
  });

  it('adds the empty review, bullet, maintenance, trap and mock stores and changes nothing else', () => {
    const r = migrate(fixture, known, clock);
    expect(r.status).toBe('migrated');
    if (r.status !== 'migrated') return;
    expect(r.save.version).toBe(6);
    const g = r.save.game;
    expect(g.byBullet).toEqual({});
    expect(g.maint).toEqual({});
    expect(g.traps).toEqual({});
    expect(g.reviewDay).toEqual({ day: '', done: 0 });
    expect(g.review).toBeNull();
    expect(g.mock).toEqual({ started: 0, active: null, history: [] });
    expect(g.statsBackfilled).toBe(false);
    expect(g.xp).toBe(fixture.game.xp);
    expect(g.history).toEqual(fixture.game.history);
    expect(g.recent).toEqual(fixture.game.recent);
    expect(g.log).toHaveLength(fixture.game.log.length);
    expect(r.save.buildings).toEqual(fixture.buildings);
    expect(r.save.labs).toEqual(fixture.labs);
  });

  it('loads through the store, writes v5 back and keeps every new store through export and import', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify(fixture));
    const store = makeStore(storage);
    expect(store.getSnapshot().status).toBe('migrated');
    expect(JSON.parse(storage.getItem(STORAGE_KEY) as string).version).toBe(6);
    const a = store.getSnapshot().save;
    const full = {
      ...a,
      game: {
        ...a.game,
        byBullet: { '1.2-S1': '1101' },
        maint: { gatehouse: '10110' },
        traps: { 'sg-vs-nacl': { n: 4, miss: 1 } },
        reviewDay: { day: '2026-06-01', done: 7 },
        mock: {
          started: 2,
          active: { id: 'm2', startedAt: '2026-06-02T10:00:00.000Z', durationMs: 7_800_000, short: false, questionIds: ['gatehouse-001', 'gatehouse-002'], seed: 5, answers: { 'gatehouse-001': [1] }, flags: ['gatehouse-002'], fresh: 2, counts: true, reserveUsed: 0 },
          history: [{ id: 'm1', startedAt: '2026-06-01T10:00:00.000Z', finishedAt: '2026-06-01T11:00:00.000Z', short: false, expired: false, total: 2, correct: 1, domains: { '1': [1, 2] }, questionIds: ['gatehouse-001', 'gatehouse-002'], seed: 1, chosen: { 'gatehouse-001': [0] }, flags: [], fresh: 2, counts: true, reserveUsed: 1, trapMisses: { 'sg-vs-nacl': 1 } }],
        },
        statsBackfilled: true,
      },
      labs: { ...a.labs, progress: { 'lab-03-multi-account': { steps: {}, notes: {}, ack: true as const } } },
    };
    const other = makeStore(null);
    expect(other.importJson(JSON.stringify({ app: 'saa-region-builder', save: full })).ok).toBe(true);
    const b = other.getSnapshot().save;
    expect(b.game.byBullet).toEqual(full.game.byBullet);
    expect(b.game.maint).toEqual(full.game.maint);
    expect(b.game.traps).toEqual(full.game.traps);
    expect(b.game.reviewDay).toEqual(full.game.reviewDay);
    expect(b.game.mock).toEqual(full.game.mock);
    expect(b.game.statsBackfilled).toBe(true);
    expect(b.labs.progress['lab-03-multi-account']?.ack).toBe(true);
  });

  it('sanitizes malformed stores field by field', () => {
    const r = sanitize(
      {
        version: 5,
        buildings: {},
        ui: {},
        labs: {},
        game: {
          byBullet: { '1.2-S1': '1x1', 'nope': '11', '1.2-S2': '11111111111111' },
          maint: { gatehouse: '110', ghost: '1', 'key-vault': 5 },
          traps: { 'sg-vs-nacl': { n: 2, miss: 9 }, 'bad id!': { n: 1, miss: 0 }, x: { n: 0 } },
          reviewDay: { day: 'today', done: 3 },
          review: { id: 'r', kind: 'maintenance', building: null, questionIds: ['a-001'], seed: 1, startedAt: 'x', day: '2026-06-01', answers: {} },
          mock: { started: 'many', active: { id: 'm', startedAt: 'not a date', durationMs: 1, questionIds: ['a-001'] }, history: [{ id: 'h', startedAt: 'a', finishedAt: 'b', questionIds: ['q-1', 'q-2'], correct: 9, domains: { '1': [5, 2], '2': [1, 2] }, chosen: { 'q-1': [0], zzz: [1] }, trapMisses: { p: 2, q: 0 } }] },
        },
      },
      known,
      clock,
    );
    const g = r.game;
    expect(g.byBullet).toEqual({ '1.2-S2': '1111111111' });
    expect(g.maint).toEqual({ gatehouse: '110' });
    expect(g.traps).toEqual({ 'sg-vs-nacl': { n: 2, miss: 2 } });
    expect(g.reviewDay).toEqual({ day: '', done: 0 });
    expect(g.review).toBeNull(); // a maintenance session needs a known building
    expect(g.mock.active).toBeNull();
    expect(g.mock.history).toHaveLength(1);
    expect(g.mock.history[0]).toMatchObject({ total: 2, correct: 2, domains: { '2': [1, 2] }, chosen: { 'q-1': [0] }, trapMisses: { p: 2 } });
    expect(g.mock.started).toBe(1);
  });
});
