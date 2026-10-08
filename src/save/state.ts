import type { BuildingState } from '../data/types';
import type { Graph } from '../lib/graph';
import type { Save } from './schema';

/**
 * planned (locked) until every prerequisite road is commissioned; then surveyed (idle).
 * Stored progress (under construction, commissioned) always wins, so changing roads in
 * later content never takes away a building you already started.
 */
export function deriveState(id: string, save: Save, graph: Graph, startIds: ReadonlySet<string>): BuildingState {
  const stored = save.buildings[id]?.state;
  if (stored) return stored;
  if (startIds.has(id)) return 'surveyed';
  const prereqs = graph.prereqs.get(id) ?? [];
  return prereqs.every((p) => save.buildings[p]?.state === 'commissioned') ? 'surveyed' : 'planned';
}

export function deriveAll(ids: readonly string[], save: Save, graph: Graph, startIds: ReadonlySet<string>): Map<string, BuildingState> {
  return new Map(ids.map((id) => [id, deriveState(id, save, graph, startIds)]));
}

export const STATE_LABEL: Record<BuildingState, string> = {
  planned: 'Planned',
  surveyed: 'Surveyed',
  under_construction: 'Under construction',
  commissioned: 'Commissioned',
};

export const STATE_HELP: Record<BuildingState, string> = {
  planned: 'Locked until its prerequisite roads are commissioned.',
  surveyed: 'Open and idle: ready to start construction.',
  under_construction: 'Construction is running.',
  commissioned: 'Certified.',
};
