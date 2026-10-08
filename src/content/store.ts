import { BUILDING_BY_ID } from '../data';
import type { DistrictId } from '../data';
import type { BuildingNotes, ConfusePair, GlossaryTerm, RenamedService, Source } from './types';

const DISTRICT_LOADERS: Record<DistrictId, () => Promise<{ notes: BuildingNotes[] }>> = {
  square: () => import('./district-square'),
  citadel: () => import('./district-citadel'),
  harbor: () => import('./district-harbor'),
  express: () => import('./district-express'),
  treasury: () => import('./district-treasury'),
};

export async function loadBuildingNotes(buildingId: string): Promise<BuildingNotes | null> {
  const b = BUILDING_BY_ID.get(buildingId);
  if (!b) return null;
  const { notes } = await DISTRICT_LOADERS[b.district]();
  return notes.find((n) => n.building === buildingId) ?? null;
}

export interface Shared {
  sources: Map<string, Source>;
  glossary: GlossaryTerm[];
  confuse: ConfusePair[];
  renamed: RenamedService[];
}

let shared: Promise<Shared> | null = null;

/** Sources, glossary, don't-confuse pairs and renamed services share one lazily loaded chunk. */
export function loadShared(): Promise<Shared> {
  shared ??= Promise.all([
    import('../../content/sources'),
    import('../../content/glossary'),
    import('../../content/dont-confuse'),
    import('../../content/renamed-services'),
  ]).then(([s, g, c, r]) => ({
    sources: new Map(s.default.map((x) => [x.id, x])),
    glossary: g.default,
    confuse: c.default,
    renamed: r.default,
  }));
  return shared;
}
