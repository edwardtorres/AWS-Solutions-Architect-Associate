import { LAB_META_BY_ID } from './meta';
import type { Lab } from './types';

// Lazy: lab text (steps, quotes, templates' descriptions) is its own chunk, loaded only when a lab or the export opens.
const loaders = import.meta.glob<{ default: Lab }>('../../content/labs/lab-*.ts');

export async function loadLab(id: string): Promise<Lab | null> {
  if (!LAB_META_BY_ID.has(id)) return null;
  const key = Object.keys(loaders).find((k) => k.endsWith(`/${id}.ts`));
  const load = key ? loaders[key] : undefined;
  return load ? (await load()).default : null;
}

export async function loadAllLabs(): Promise<Lab[]> {
  const mods = await Promise.all(Object.values(loaders).map((l) => l()));
  return mods.map((m) => m.default).sort((a, b) => a.n - b.n);
}
