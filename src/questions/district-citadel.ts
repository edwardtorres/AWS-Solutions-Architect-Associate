import type { Question } from '../content/types';

// Eager glob inside a lazily imported module: one chunk per district.
const mods = import.meta.glob<Question[]>('../../content/questions/citadel/*.ts', { eager: true, import: 'default' });
export const questions: Question[] = Object.values(mods).flat();
