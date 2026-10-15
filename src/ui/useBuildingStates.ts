import { useMemo } from 'react';
import { BUILDINGS, GRAPH, START_IDS, type BuildingState } from '../data';
import { deriveAll } from '../save/state';
import { useSnapshot } from '../save/context';

const STARTS = new Set(START_IDS);
const IDS = BUILDINGS.map((b) => b.id);

/** planned, surveyed, under construction or commissioned for every building, from the current save. */
export function useBuildingStates(): Map<string, BuildingState> {
  const { save } = useSnapshot();
  return useMemo(() => deriveAll(IDS, save, GRAPH, STARTS), [save]);
}
