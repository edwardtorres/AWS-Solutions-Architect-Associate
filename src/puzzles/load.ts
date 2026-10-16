import { PUZZLE_TYPES, type PuzzleModule, type PuzzleType, type Scenario } from './types';

// Lazy: each puzzle type is its own chunk, loaded only when a Workbench or puzzle page opens.
const loaders = import.meta.glob<PuzzleModule>('./*/index.ts');

/** `policy-court-004` becomes `policy-court`; anything that is not a puzzle id (a question id) gives null. */
export function puzzleTypeOf(id: string): PuzzleType | null {
  const m = /^(.*)-\d{3}$/.exec(id);
  return PUZZLE_TYPES.find((t) => t === m?.[1]) ?? null;
}

export async function loadPuzzleType(type: PuzzleType): Promise<PuzzleModule | null> {
  const load = loaders[`./${type}/index.ts`];
  return load ? load() : null;
}

/** Every scenario of every type that attaches to a building, in id order. */
export async function loadWorkbench(building: string): Promise<{ module: PuzzleModule; scenario: Scenario<unknown> }[]> {
  const mods = await Promise.all(PUZZLE_TYPES.map((t) => loadPuzzleType(t)));
  return mods.flatMap((module) => (module ? module.scenarios.filter((s) => s.building === building).map((scenario) => ({ module, scenario })) : []));
}

export async function loadScenario(id: string): Promise<{ module: PuzzleModule; scenario: Scenario<unknown> } | null> {
  const type = puzzleTypeOf(id);
  if (!type) return null;
  const module = await loadPuzzleType(type);
  const scenario = module?.scenarios.find((s) => s.id === id);
  return module && scenario ? { module, scenario } : null;
}
