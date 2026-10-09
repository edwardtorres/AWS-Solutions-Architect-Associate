import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { EraEntry } from './questionChecks.ts';
import type { BuildingNotes, Question, ConfusePair, GlossaryTerm, RenamedService, Source } from '../../src/content/types.ts';

const root = fileURLToPath(new URL('../../content', import.meta.url));
export const ALL_DISTRICTS = ['square', 'citadel', 'harbor', 'express', 'treasury'];

async function load<T>(file: string, fallback: T): Promise<T> {
  const p = join(root, file);
  if (!existsSync(p)) return fallback;
  const mod = (await import(pathToFileURL(p).href)) as { default: T };
  return mod.default;
}

/** Reads content/*.ts (sources, glossary, don't-confuse, renamed) and content/notes/<district>/<building>.ts. */
export async function loadNotesBundle() {
  const notes: BuildingNotes[] = [];
  const notesDir = join(root, 'notes');
  if (existsSync(notesDir)) {
    for (const district of readdirSync(notesDir)) {
      const dir = join(notesDir, district);
      for (const f of readdirSync(dir).filter((x) => x.endsWith('.ts'))) {
        const mod = (await import(pathToFileURL(join(dir, f)).href)) as { default: BuildingNotes };
        notes.push(mod.default);
      }
    }
  }
  const scopePath = join(root, 'notes-scope.json');
  const scope = existsSync(scopePath) ? (JSON.parse(readFileSync(scopePath, 'utf8')) as { districts?: string[] }).districts ?? ALL_DISTRICTS : ALL_DISTRICTS;
  return {
    notes,
    sources: await load<Source[]>('sources.ts', []),
    glossary: await load<GlossaryTerm[]>('glossary.ts', []),
    confuse: await load<ConfusePair[]>('dont-confuse.ts', []),
    renamed: await load<RenamedService[]>('renamed-services.ts', []),
    scope: new Set(scope),
  };
}

/** Reads content/questions/<district>/<building>.ts and the questions scope (districts that are complete). */
export async function loadQuestionsBundle() {
  const questions: Question[] = [];
  const dir0 = join(root, 'questions');
  if (existsSync(dir0)) {
    for (const district of readdirSync(dir0, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      const dir = join(dir0, district.name);
      for (const f of readdirSync(dir).filter((x) => x.endsWith('.ts'))) {
        const mod = (await import(pathToFileURL(join(dir, f)).href)) as { default: Question[] };
        questions.push(...mod.default);
      }
    }
  }
  const scopePath = join(root, 'questions-scope.json');
  const scope = existsSync(scopePath) ? (JSON.parse(readFileSync(scopePath, 'utf8')) as { districts?: string[] }).districts ?? [] : [];
  const era = JSON.parse(readFileSync(join(root, 'exam-era.json'), 'utf8')) as { inScopeWithChangedStatus: EraEntry[] };
  return { questions, scope: new Set(scope), era: era.inScopeWithChangedStatus };
}
