import { describe, expect, it } from 'vitest';
import { CORRUPT_KEY, CURRENT_VERSION, STORAGE_KEY, freshSave } from './schema';
import { MIGRATIONS, migrate, sanitize } from './migrate';
import { createSaveStore, type KeyValueStorage } from './store';
import { deriveState } from './state';
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

describe('save schema v1', () => {
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
    expect(b.getSnapshot().save.ui).toEqual({ view: 'atlas', lastBuilding: 'gatehouse', roads: 'all' });
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

  it('migrates the unversioned v0 shape to v1 and writes it back', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ buildings: { 'identity-keep': 'commissioned', bogus: 'commissioned', gatehouse: 'planned' } }));
    const store = makeStore(storage);
    expect(store.getSnapshot().status).toBe('migrated');
    expect(Object.keys(store.getSnapshot().save.buildings)).toEqual(['identity-keep']);
    expect(JSON.parse(storage.getItem(STORAGE_KEY) as string).version).toBe(1);
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
    expect(save.ui).toEqual({ view: 'map', lastBuilding: null, roads: 'all' });
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
    save.buildings['safe-harbor-account'] = { state: 'commissioned', changedAt: clock() };
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
    expect(state('identity-keep', save)).toBe('planned');
  });
});
