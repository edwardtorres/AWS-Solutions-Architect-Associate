/**
 * npm run check:content            offline: app structure vs the recorded official outline
 * npm run check:content -- --live  also re-fetches the live exam guide and diffs it
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BUILDINGS } from '../src/data/buildings.ts';
import { ROADS } from '../src/data/roads.ts';
import { BANNED_TERMS } from './banned-terms.ts';
import { buildDocuments, fetchAll, structuralProblems } from './fetch-official.ts';
import {
  diffOutline,
  diffServices,
  runOfflineChecks,
  type ContentInput,
  type OutlineDoc,
  type QueueEntry,
  type ServicesDoc,
} from './lib/contentChecks.ts';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const readJson = <T>(p: string): T => JSON.parse(readFileSync(here(p), 'utf8')) as T;

async function main() {
  const live = process.argv.includes('--live');
  const outline = readJson<OutlineDoc>('./official-outline.json');
  const services = readJson<ServicesDoc>('./official-services.json');
  const queue = readJson<QueueEntry[]>('../content/needs-verification.json');

  const problems = runOfflineChecks({ outline, services, buildings: BUILDINGS, roads: ROADS, queue, banned: BANNED_TERMS } satisfies ContentInput);

  let liveNote = '';
  if (live) {
    const fetched = await fetchAll();
    const docs = buildDocuments(fetched);
    const stop = structuralProblems(docs.outline);
    if (stop.length > 0) {
      console.error('STOP: the live exam guide differs from the structure this app was designed for:');
      for (const s of stop) console.error(`  - ${s}`);
      process.exit(2);
    }
    problems.push(...diffOutline(outline, docs.outline as unknown as OutlineDoc).map((x) => `live: ${x}`));
    problems.push(...diffServices(services, docs.services as unknown as ServicesDoc).map((x) => `live: ${x}`));
    // Exam facts the app's CLAUDE.md relies on.
    const f = docs.outline.examFacts;
    const factChecks: [string, boolean][] = [
      ['50 scored questions', /50 questions that affect your score/.test(f.guide.scored ?? '')],
      ['15 unscored questions', /15 unscored/.test(f.guide.unscored ?? '')],
      ['scaled score 100-1,000 with 720 to pass', /100–1,000/.test(f.guide.scale ?? '') && /720/.test(f.guide.scale ?? '')],
      ['compensatory scoring', /compensatory/.test(f.guide.compensatory ?? '')],
      ['65 questions (certification page)', /65 questions/.test(f.certificationPage['Exam format'] ?? '')],
      ['130 minutes (certification page)', /130 minutes/.test(f.certificationPage['Exam duration'] ?? '')],
    ];
    for (const [name, ok] of factChecks) if (!ok) problems.push(`live: exam fact changed or missing: ${name}`);
    liveNote = ' + live guide';
  }

  const bullets = outline.domains.flatMap((d) => d.tasks.flatMap((t) => t.bullets)).length;
  if (problems.length > 0) {
    console.error(`check:content FAILED (${problems.length} problem${problems.length === 1 ? '' : 's'}${liveNote}):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(
    `check:content OK${liveNote}: ${outline.domains.length} domains, ${outline.domains.reduce((n, d) => n + d.tasks.length, 0)} tasks, ${bullets} bullets, ${BUILDINGS.length} buildings, ${ROADS.length} roads`,
  );
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
