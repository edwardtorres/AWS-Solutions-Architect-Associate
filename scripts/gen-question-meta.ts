/** npx tsx scripts/gen-question-meta.ts: regenerates src/questions/meta.ts from the question bank. */
import { writeFileSync } from 'node:fs';
import { loadQuestionsBundle } from './lib/loadNotes.ts';
import { buildMetaSource } from './lib/questionMeta.ts';

const { questions } = await loadQuestionsBundle();
writeFileSync(new URL('../src/questions/meta.ts', import.meta.url), buildMetaSource(questions));
console.log(`Wrote src/questions/meta.ts (${questions.length} questions)`);
