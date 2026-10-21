/** npx tsx scripts/gen-question-meta.ts: regenerates src/questions/meta.ts from the question bank. */
import { writeFileSync } from 'node:fs';
import { loadQuestionsBundle } from './lib/loadNotes.ts';
import { buildMetaSource } from './lib/questionMeta.ts';
import { loadPuzzles } from './lib/loadPuzzles.ts';
import { loadLabs } from './lib/loadLabs.ts';
import { buildLabMetaSource } from './lib/labMeta.ts';

const { questions } = await loadQuestionsBundle();
const puzzles = [...(await loadPuzzles()).values()].flatMap((m) => m.scenarios.map((s) => ({ id: s.id, building: s.building, bullets: s.bullets, difficulty: s.difficulty })));
writeFileSync(new URL('../src/questions/meta.ts', import.meta.url), buildMetaSource(questions, puzzles));
console.log(`Wrote src/questions/meta.ts (${questions.length} questions, ${puzzles.length} puzzle scenarios)`);
const { labs } = await loadLabs();
writeFileSync(new URL('../src/labs/meta.ts', import.meta.url), buildLabMetaSource(labs));
console.log(`Wrote src/labs/meta.ts (${labs.length} labs)`);

import { existsSync, readFileSync } from 'node:fs';
import { buildCitations } from './lib/citations.ts';
import { loadNotesBundle } from './lib/loadNotes.ts';
import { buildingDates, buildVerifiedSource } from './lib/verifiedMeta.ts';
import { BUILDINGS } from '../src/data/buildings.ts';
import type { HashFile } from './lib/freshness.ts';

const hashPath = new URL('../content/page-hashes.json', import.meta.url);
const hashes: HashFile = existsSync(hashPath) ? (JSON.parse(readFileSync(hashPath, 'utf8')) as HashFile) : { generated: '', pages: {} };
const urlOf = new Map((await loadNotesBundle()).sources.map((x) => [x.id, x.url.split('#')[0] as string]));
const dates = buildingDates(hashes, await buildCitations(), BUILDINGS.map((b) => b.id), urlOf);
writeFileSync(new URL('../src/content/verified.ts', import.meta.url), buildVerifiedSource(dates, hashes.generated));
console.log(`Wrote src/content/verified.ts (${Object.keys(dates).length} buildings with a check date)`);
