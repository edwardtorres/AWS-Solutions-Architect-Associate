import type { Question } from '../content/types';

// Eager glob inside a lazily imported module: one chunk per district.
const mods = import.meta.glob<Question[]>('../../content/questions/express/*.ts', { eager: true, import: 'default' });
export const questions: Question[] = Object.values(mods).flat();
