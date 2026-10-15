/** Run with tsx: prints what the specs need from the bank and the city as JSON (Playwright's loader cannot import the JSON data files). */
import { BUILDINGS } from '../src/data/buildings.ts';
import { GRAPH, START_IDS } from '../src/data/index.ts';
import { loadQuestionsBundle } from '../scripts/lib/loadNotes.ts';

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
console.log(
  JSON.stringify({
    chain,
    portfolio,
    names: Object.fromEntries(BUILDINGS.map((b) => [b.id, b.name])),
    questions: questions.map((q) => ({ id: q.id, stem: q.stem, select: q.select, options: q.options.map((o) => ({ text: o.text, correct: o.correct })) })),
  }),
);
