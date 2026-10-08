import type { BuildingNotes } from './types';

// Eager glob inside a lazily imported module: one chunk per district.
const mods = import.meta.glob<BuildingNotes>('../../content/notes/harbor/*.ts', { eager: true, import: 'default' });
export const notes: BuildingNotes[] = Object.values(mods);
