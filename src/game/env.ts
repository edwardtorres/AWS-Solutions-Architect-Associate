import { BUILDINGS, BUILDING_BY_ID, DISTRICT_BY_ID, GRAPH, OUTLINE_DOMAINS, START_IDS } from '../data';
import type { Graph } from '../lib/graph';

/** Everything the rules need to know about the city. Tests pass a small synthetic one. */
export interface GameEnv {
  graph: Graph;
  startIds: ReadonlySet<string>;
  buildingIds: readonly string[];
  portfolio: ReadonlySet<string>;
  districtOf: (id: string) => string;
  bulletsOf: (id: string) => readonly string[];
  /** Domain number 1 to 4, or null for Foundations. */
  domainOf: (id: string) => number | null;
  /** Percent weight of each domain, keyed by domain number. */
  weights: Readonly<Record<number, number>>;
}

export const DEFAULT_ENV: GameEnv = {
  graph: GRAPH,
  startIds: new Set(START_IDS),
  buildingIds: BUILDINGS.map((b) => b.id),
  portfolio: new Set(BUILDINGS.filter((b) => b.portfolio && b.portfolio.length > 0).map((b) => b.id)),
  districtOf: (id) => BUILDING_BY_ID.get(id)?.district ?? '',
  bulletsOf: (id) => BUILDING_BY_ID.get(id)?.bullets ?? [],
  domainOf: (id) => {
    const d = BUILDING_BY_ID.get(id)?.district;
    return d ? DISTRICT_BY_ID[d].domain : null;
  },
  weights: Object.fromEntries(OUTLINE_DOMAINS.map((d) => [d.id, d.weightPercent])),
};
