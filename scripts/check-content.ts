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
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { loadNotesBundle, loadQuestionsBundle } from './lib/loadNotes.ts';
import { checkQuestions } from './lib/questionChecks.ts';
import { checkNotes } from './lib/notesChecks.ts';
import { buildMetaSource } from './lib/questionMeta.ts';
import { loadPuzzles } from './lib/loadPuzzles.ts';
import { checkPuzzles } from './lib/puzzleChecks.ts';
import { loadLabs } from './lib/loadLabs.ts';
import { checkLabs } from './lib/labChecks.ts';
import { buildLabMetaSource } from './lib/labMeta.ts';
import { PUZZLE_TYPES } from '../src/puzzles/types.ts';
import {
  diffOutline,
  diffServices,
  diffShortNames,
  runOfflineChecks,
  type ContentInput,
  type OutlineDoc,
  type QueueEntry,
  type ServicesDoc,
} from './lib/contentChecks.ts';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const readJson = <T>(p: string): T => JSON.parse(readFileSync(here(p), 'utf8')) as T;

async function main() {
  const puzzleRequired = !process.argv.includes('--no-puzzle-minimums');
  const live = process.argv.includes('--live');
  const outline = readJson<OutlineDoc>('./official-outline.json');
  const services = readJson<ServicesDoc>('./official-services.json');
  const queue = readJson<QueueEntry[]>('../content/needs-verification.json');

  const problems = runOfflineChecks({ outline, services, buildings: BUILDINGS, roads: ROADS, queue, banned: BANNED_TERMS } satisfies ContentInput);

  const bundle = await loadNotesBundle();
  const qb = await loadQuestionsBundle();
  const puzzles = await loadPuzzles();
  const bulletIds = new Set(outline.domains.flatMap((d) => d.tasks.flatMap((t) => t.bullets.map((b) => b.id))));
  problems.push(
    ...checkNotes({ buildings: BUILDINGS, bulletIds, ...bundle, citedElsewhere: new Set([...(await loadLabs()).labs.flatMap((l) => [...l.steps.map((s) => s.src), ...l.costs.map((c) => c.src), ...l.traps.map((t) => t.src)]), 'free-tier-plans', 'free-tier-usage', ...[...puzzles.values()].flatMap((m) => [...m.def.rules.map((r) => r.src), ...m.scenarios.flatMap((sc) => (m.def.scenarioRules?.(sc.data) ?? []).map((r) => r.src))]), ...qb.questions.flatMap((q) => q.evidence.map((e) => e.src)), ...[...qb.postGuide.features, ...(qb.postGuide.preGuide ?? [])].flatMap((f) => (f.source ? [f.source] : []))]), postGuide: qb.postGuide }).map((x) => `notes: ${x}`),
  );

  const repoRoot = here('../');
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const full = join(dir, n);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  const appFiles = walk(join(repoRoot, 'src')).map((f) => ({ path: relative(repoRoot, f).replaceAll('\\', '/'), content: readFileSync(f, 'utf8') }));
  problems.push(
    ...checkQuestions({
      questions: qb.questions,
      buildings: BUILDINGS,
      bulletIds,
      sources: bundle.sources,
      confuse: bundle.confuse,
      queue,
      banned: BANNED_TERMS,
      services,
      shortNames: readJson<{ items: { short: string; full: string }[] }>('./official-short-names.json').items,
      era: qb.era,
      postGuide: qb.postGuide,
      scope: qb.scope,
      appFiles,
    }).map((x) => `questions: ${x}`),
  );

  problems.push(
    ...checkPuzzles({
      modules: puzzles,
      buildings: BUILDINGS,
      bulletIds,
      sources: bundle.sources,
      banned: BANNED_TERMS,
      queue,
      services,
      shortNames: readJson<{ items: { short: string; full: string }[] }>('./official-short-names.json').items,
      postGuide: qb.postGuide,
      require: puzzleRequired ? PUZZLE_TYPES : [],
    }).map((x) => `puzzles: ${x}`),
  );

  const labData = await loadLabs();
  problems.push(
    ...checkLabs({
      labs: labData.labs,
      templates: labData.templates,
      sources: bundle.sources,
      buildings: BUILDINGS,
      bulletIds,
      confuse: bundle.confuse,
      banned: BANNED_TERMS,
      debriefPool: qb.questions.filter((q) => !q.tags.includes('mock-reserve')),
      postGuide: qb.postGuide,
      complete: !process.argv.includes('--no-lab-minimums'),
    }).map((x) => `labs: ${x}`),
  );

  const metaPath = join(repoRoot, 'src/questions/meta.ts');
  let metaNow: string;
  try {
    metaNow = readFileSync(metaPath, 'utf8');
  } catch {
    metaNow = '';
  }
  if (metaNow !== buildMetaSource(qb.questions, [...puzzles.values()].flatMap((m) => m.scenarios.map((sc) => ({ id: sc.id, building: sc.building, bullets: sc.bullets, difficulty: sc.difficulty }))))) problems.push('questions: src/questions/meta.ts is stale; run `npm run gen:meta`');

  let labMetaNow: string;
  try {
    labMetaNow = readFileSync(join(repoRoot, 'src/labs/meta.ts'), 'utf8');
  } catch {
    labMetaNow = '';
  }
  if (labMetaNow !== buildLabMetaSource(labData.labs)) problems.push('labs: src/labs/meta.ts is stale; run `npm run gen:meta`');

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
    problems.push(...diffShortNames(readJson('./official-short-names.json'), docs.shortNames).map((x) => `live: ${x}`));
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
    `check:content OK${liveNote}: ${outline.domains.length} domains, ${outline.domains.reduce((n, d) => n + d.tasks.length, 0)} tasks, ${bullets} bullets, ${BUILDINGS.length} buildings, ${ROADS.length} roads, ${qb.questions.length} questions`,
  );
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
