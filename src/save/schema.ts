export const STORAGE_KEY = 'saa-region-builder:save';
export const CORRUPT_KEY = 'saa-region-builder:save:corrupt';
export const APP_ID = 'saa-region-builder';
export const CURRENT_VERSION = 1;

/** Only progress states are stored. planned/surveyed are derived from the roads. */
export type StoredState = 'under_construction' | 'commissioned';

export interface BuildingProgress {
  state: StoredState;
  changedAt: string;
}

export interface UiPrefs {
  view: 'map' | 'atlas';
  lastBuilding: string | null;
  roads: 'selected' | 'all';
}

export interface SaveV1 {
  version: 1;
  updatedAt: string;
  buildings: Record<string, BuildingProgress>;
  ui: UiPrefs;
}

export type Save = SaveV1;

export function freshSave(now: () => string = () => new Date().toISOString()): Save {
  return {
    version: CURRENT_VERSION,
    updatedAt: now(),
    buildings: {},
    ui: { view: 'map', lastBuilding: null, roads: 'selected' },
  };
}
