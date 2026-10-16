/** npx tsx scripts/gen-question-meta.ts: regenerates src/questions/meta.ts from the question bank. */
import { writeFileSync } from 'node:fs';
import { loadQuestionsBundle } from './lib/loadNotes.ts';
import { buildMetaSource } from './lib/questionMeta.ts';
import { loadPuzzles } from './lib/loadPuzzles.ts';

const { questions } = await loadQuestionsBundle();
const puzzles = [...(await loadPuzzles()).values()].flatMap((m) => m.scenarios.map((s) => ({ id: s.id, building: s.building, bullets: s.bullets, difficulty: s.difficulty })));
writeFileSync(new URL('../src/questions/meta.ts', import.meta.url), buildMetaSource(questions, puzzles));
console.log(`Wrote src/questions/meta.ts (${questions.length} questions, ${puzzles.length} puzzle scenarios)`);
