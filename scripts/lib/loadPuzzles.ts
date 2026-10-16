import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PUZZLE_TYPES, type PuzzleModule, type PuzzleType } from '../../src/puzzles/types.ts';

const root = fileURLToPath(new URL('../../src/puzzles/', import.meta.url));

/** Loads every puzzle type that has a `src/puzzles/<type>/index.ts` (exports `def` and `scenarios`). */
export async function loadPuzzles(): Promise<Map<PuzzleType, PuzzleModule>> {
  const out = new Map<PuzzleType, PuzzleModule>();
  for (const t of PUZZLE_TYPES) {
    const file = `${root}${t}/index.ts`;
    if (!existsSync(file)) continue;
    out.set(t, (await import(pathToFileURL(file).href)) as PuzzleModule);
  }
  return out;
}
