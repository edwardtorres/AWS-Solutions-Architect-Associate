import { LAB_META_BY_ID } from './meta';
import { labOrder, type Lab } from './types';

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
  return labOrder(mods.map((m) => m.default));
}

// Templates are plain text beside the labs; the lab page shows them with copy and download buttons.
const templateLoaders = import.meta.glob<string>('../../content/labs/templates/*', { query: '?raw', import: 'default' });

export async function loadTemplate(name: string): Promise<string | null> {
  const key = Object.keys(templateLoaders).find((k) => k.endsWith(`/${name}`));
  const load = key ? templateLoaders[key] : undefined;
  return load ? load() : null;
}
