import type { BuildingState } from '../data/types';
import type { Save } from '../save/schema';
import { bitsStat } from './weak';

/**
 * Maintenance (recorded in CLAUDE.md): a commissioned building is marked "needs maintenance" when, over its last 8 review and mock
 * results, at least 5 exist and fewer than 60% are right. The mark is derived, so it clears itself when accuracy recovers, and it
 * never removes commissioning.
 */
export const MAINT_MIN_ANSWERS = 5;
export const MAINT_BELOW = 0.6;

export interface MaintenanceStatus {
  needed: boolean;
  n: number;
  correct: number;
}

export function maintenanceStatus(save: Pick<Save, 'game'>, building: string, state: BuildingState): MaintenanceStatus {
  const { n, correct } = bitsStat(save.game.maint[building]);
  return { needed: state === 'commissioned' && n >= MAINT_MIN_ANSWERS && correct / n < MAINT_BELOW, n, correct };
}

/** Commissioned buildings that currently need maintenance. */
export function buildingsNeedingMaintenance(save: Pick<Save, 'game'>, states: ReadonlyMap<string, BuildingState>): string[] {
  return [...states.entries()].filter(([id, st]) => maintenanceStatus(save, id, st).needed).map(([id]) => id);
}
