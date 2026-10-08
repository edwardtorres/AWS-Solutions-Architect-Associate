import { BUILDINGS } from './buildings';
import { ROADS } from './roads';
import { buildGraph } from '../lib/graph';
import type { Building, FamilyId, Road } from './types';

export { BUILDINGS, ROADS };
export * from './types';
export { DISTRICTS, DISTRICT_BY_ID } from './districts';
export { FAMILIES, FAMILY_NAME } from './families';
export { OUTLINE_DOMAINS, OUTLINE_TASKS, BULLET_BY_ID, TASK_BY_ID } from './outline';

export const BUILDING_BY_ID: ReadonlyMap<string, Building> = new Map(BUILDINGS.map((b) => [b.id, b]));

export const GRAPH = buildGraph(
  BUILDINGS.map((b) => b.id),
  ROADS,
);

export const START_IDS: readonly string[] = BUILDINGS.filter((b) => b.start).map((b) => b.id);

export function prerequisitesOf(id: string): Road[] {
  return ROADS.filter((r) => r.to === id);
}

export function unlocksOf(id: string): Road[] {
  return ROADS.filter((r) => r.from === id);
}

/** Buildings sharing a service family with `id` but sitting in a different district. */
export function atlasLinks(id: string): { family: FamilyId; building: Building }[] {
  const me = BUILDING_BY_ID.get(id);
  if (!me) return [];
  const out: { family: FamilyId; building: Building }[] = [];
  for (const family of me.families) {
    for (const other of BUILDINGS) {
      if (other.id === id || other.district === me.district || other.district === 'square') continue;
      if (other.families.includes(family)) out.push({ family, building: other });
    }
  }
  return out;
}

export function buildingsByFamily(family: FamilyId): Building[] {
  return BUILDINGS.filter((b) => b.families.includes(family));
}
