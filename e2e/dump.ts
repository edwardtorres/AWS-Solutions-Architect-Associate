/** Run with tsx: prints what the specs need from the bank and the city as JSON (Playwright's loader cannot import the JSON data files). */
import { BUILDINGS } from '../src/data/buildings.ts';
import { GRAPH, START_IDS } from '../src/data/index.ts';
import { loadQuestionsBundle } from '../scripts/lib/loadNotes.ts';
import { loadPuzzles } from '../scripts/lib/loadPuzzles.ts';
import { KIND_LABEL, TIER_LABEL, reference, type BuilderData } from '../src/puzzles/architecture-builder/def.ts';

const { questions } = await loadQuestionsBundle();
let chain: { start: string; dependent: string } | null = null;
for (const s of START_IDS) {
  for (const d of GRAPH.dependents.get(s) ?? []) {
    if (!chain && (GRAPH.prereqs.get(d) ?? []).length === 1) chain = { start: s, dependent: d };
  }
}
const portfolio = BUILDINGS.find(
  (b) => b.portfolio && !START_IDS.includes(b.id) && questions.filter((q) => q.building === b.id && q.tags.includes('placement-eligible') && !q.tags.includes('mock-reserve')).length >= 5,
)?.id;
const puzzles = [...(await loadPuzzles()).entries()].map(([type, mod]) => {
  const sc = mod.scenarios[0] as (typeof mod.scenarios)[number];
  const fields = mod.def.fields(sc.data);
  const ev = mod.def.evaluate(sc.data);
  return {
    type,
    id: sc.id,
    building: sc.building,
    title: sc.title,
    fields: fields.map((f) => ({ id: f.id, multi: f.multi, correct: (ev?.answer[f.id] ?? []).map((id) => f.options.find((o) => o.id === id)?.label ?? '') })),
    reference:
      type === 'architecture-builder'
        ? (reference(sc.data as BuilderData) ?? []).map((p) => ({
            short: { alb: 'ALB', app: 'App', nat: 'NAT', 'db-primary': 'DB primary', 'db-standby': 'DB standby', cache: 'Cache', queue: 'SQS' }[p.kind],
            kindLabel: KIND_LABEL[p.kind],
            cell: p.tier === 'regional' ? TIER_LABEL.regional : `${TIER_LABEL[p.tier]}, Zone ${String.fromCharCode(65 + p.az)}`,
          }))
        : null,
  };
});
console.log(
  JSON.stringify({
    puzzles,
    buildingIds: BUILDINGS.map((b) => b.id),
    chain,
    portfolio,
    names: Object.fromEntries(BUILDINGS.map((b) => [b.id, b.name])),
    questions: questions.map((q) => ({ id: q.id, stem: q.stem, select: q.select, options: q.options.map((o) => ({ text: o.text, correct: o.correct })) })),
  }),
);
