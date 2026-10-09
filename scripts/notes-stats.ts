/**
 * npm run -s tsx scripts/notes-stats.ts
 * Prints the numbers for docs/step-2-audit.md: per-district notes stats, labels, pairs, renames, queue.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BUILDINGS } from '../src/data/buildings.ts';
import type { Block, BuildingNotes } from '../src/content/types.ts';
import { loadNotesBundle } from './lib/loadNotes.ts';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const readJson = <T>(p: string): T => JSON.parse(readFileSync(here(p), 'utf8')) as T;

const DISTRICT_NAME: Record<string, string> = {
  square: "Founders' Square",
  citadel: 'Citadel (Secure)',
  harbor: 'Harbor & Levees (Resilient)',
  express: 'Express Quarter (High-Performing)',
  treasury: 'Treasury (Cost-Optimized)',
};

function blocksOf(n: BuildingNotes): { where: string; block: Block }[] {
  const out: { where: string; block: Block }[] = [];
  n.overview.forEach((b, i) => out.push({ where: `overview[${i}]`, block: b }));
  (n.beyondProject ?? []).forEach((b, i) => out.push({ where: `beyond[${i}]`, block: b }));
  for (const bn of n.bullets) {
    bn.concepts.forEach((b, i) => out.push({ where: `${bn.id}.concepts[${i}]`, block: b }));
    bn.design.forEach((b, i) => out.push({ where: `${bn.id}.design[${i}]`, block: b }));
  }
  n.cues.forEach((c, i) => out.push({ where: `cue[${i}]`, block: c.fact }));
  n.examples.forEach((e, i) => e.explanation.forEach((b, j) => out.push({ where: `example[${i}].${j}`, block: b })));
  (n.azure ?? []).forEach((a, i) => {
    out.push({ where: `azure[${i}].mapping`, block: a.mapping });
    out.push({ where: `azure[${i}].breaks`, block: a.breaks });
  });
  return out;
}

const words = (s: string) => s.replace(/\{\{[^}]*\}\}/g, 'x').split(/\s+/).filter(Boolean).length;
const TERM = /\{\{term:([a-z0-9-]+)/g;

const { notes, sources, glossary, confuse, renamed } = await loadNotesBundle();
const districtOf = new Map(BUILDINGS.map((b) => [b.id, b.district as string]));

console.log('## Notes by district\n');
console.log('| District | Buildings | Words | Blocks | Cited pages | Worked examples | Cues | Glossary terms used | Azure notes |');
console.log('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
const totals = { b: 0, w: 0, bl: 0, ex: 0, cu: 0, az: 0 };
const allSources = new Set<string>();
const allTerms = new Set<string>();
for (const d of Object.keys(DISTRICT_NAME)) {
  const ns = notes.filter((n) => districtOf.get(n.building) === d);
  const src = new Set<string>();
  const terms = new Set<string>();
  let w = 0;
  let bl = 0;
  for (const n of ns) {
    for (const { block } of blocksOf(n)) {
      bl++;
      w += words(block.text);
      block.sources.forEach((s) => src.add(s));
      for (const m of block.text.matchAll(TERM)) if (m[1]) terms.add(m[1]);
    }
    for (const c of n.cues) w += words(c.phrase) + words(c.points);
    for (const e of n.examples) w += words(e.title);
  }
  const ex = ns.reduce((k, n) => k + n.examples.length, 0);
  const cu = ns.reduce((k, n) => k + n.cues.length, 0);
  const az = ns.reduce((k, n) => k + (n.azure?.length ?? 0), 0);
  src.forEach((s) => allSources.add(s));
  terms.forEach((t) => allTerms.add(t));
  totals.b += ns.length; totals.w += w; totals.bl += bl; totals.ex += ex; totals.cu += cu; totals.az += az;
  console.log(`| ${DISTRICT_NAME[d]} | ${ns.length} | ${w.toLocaleString('en-US')} | ${bl} | ${src.size} | ${ex} | ${cu} | ${terms.size} | ${az} |`);
}
console.log(`| **All** | ${totals.b} | ${totals.w.toLocaleString('en-US')} | ${totals.bl} | ${allSources.size} | ${totals.ex} | ${totals.cu} | ${allTerms.size} | ${totals.az} |`);
console.log(`\nGlossary: ${glossary.length} terms defined once. Sources file: ${sources.length} pages (${sources.filter((s) => s.kind === 'azure').length} Microsoft Learn, used only in Azure blocks).`);
const dcWords = confuse.reduce((k, p) => k + p.items.reduce((a, it) => a + it.points.reduce((x, b) => x + words(b.text), 0), 0) + p.choose.reduce((x, b) => x + words(b.text), 0) + (p.trap ? words(p.trap.text) : 0), 0);
console.log(`Don't-confuse pairs: ${confuse.length} (${dcWords.toLocaleString('en-US')} words, not counted in the table above).`);

console.log('\n## Worked examples\n');
for (const n of notes) for (const e of n.examples) console.log(`- ${n.building}: ${e.title} (${e.kind})`);

console.log('\n## Status labels (preview / deprecated / retired)\n');
for (const n of notes) {
  for (const { where, block } of blocksOf(n)) if (block.status) console.log(`- **${block.status}** ${n.building} ${where}: ${block.text.slice(0, 160).replace(/\s+/g, ' ')}…`);
}
for (const p of confuse) {
  const all = [...p.items.flatMap((i) => i.points), ...p.choose, ...(p.trap ? [p.trap] : [])];
  for (const b of all) if (b.status) console.log(`- **${b.status}** don't-confuse ${p.id}: ${b.text.slice(0, 160)}…`);
}

console.log("\n## Don't-confuse pairs\n");
console.log('| Pair | Home building | Required | Items |');
console.log('| --- | --- | --- | --- |');
for (const p of confuse) console.log(`| ${p.title} | ${p.home} | ${p.required ? 'yes' : 'no'} | ${p.items.map((i) => i.name).join('; ')} |`);

console.log('\n## Renamed services\n');
for (const r of renamed) console.log(`- Exam guide: **${r.examGuideName}**; other name: ${r.otherName}.`);

console.log('\n## Needs-verification queue\n');
const queue = readJson<{ id: string; building: string; claim: string; status: string }[]>('../content/needs-verification.json');
for (const q of queue) console.log(`- \`${q.id}\` (${q.building}, ${q.status}): ${q.claim}`);

console.log('\n## Contradictions shown both ways\n');
const contra = readJson<{ id: string; building: string; topic: string }[]>('../content/contradictions.json');
for (const c of contra) console.log(`- \`${c.id}\` (${c.building}): ${c.topic}`);
