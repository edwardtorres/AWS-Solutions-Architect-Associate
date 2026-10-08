import { CURRENT_VERSION, freshSave, type Save, type StoredState, type UiPrefs } from './schema';

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
};

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
      };
    }
  }
  const ui: UiPrefs = { ...base.ui };
  if (isObject(raw.ui)) {
    if (raw.ui.view === 'map' || raw.ui.view === 'atlas') ui.view = raw.ui.view;
    if (raw.ui.roads === 'selected' || raw.ui.roads === 'all') ui.roads = raw.ui.roads;
    if (typeof raw.ui.lastBuilding === 'string' && knownIds.has(raw.ui.lastBuilding)) ui.lastBuilding = raw.ui.lastBuilding;
  }
  return {
    version: 1,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : base.updatedAt,
    buildings,
    ui,
  };
}
