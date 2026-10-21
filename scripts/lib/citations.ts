/**
 * Who cites which source: the reverse index behind `check:freshness` (what to re-check when a page changes) and the per-building
 * "last checked" date. A source is cited by a building's notes, a question, a puzzle rule, a lab, a post-guide or exam-era record.
 */
import { BUILDINGS } from '../../src/data/buildings.ts';
import { loadNotesBundle, loadQuestionsBundle } from './loadNotes.ts';
import { loadPuzzles } from './loadPuzzles.ts';
import { loadLabs } from './loadLabs.ts';
import { allBlocks, azureBlocks } from './notesChecks.ts';
import { readFileSync } from 'node:fs';

export interface Citers {
  buildings: Set<string>;
  questions: Set<string>;
  puzzles: Set<string>;
  labs: Set<string>;
  other: Set<string>;
}

const empty = (): Citers => ({ buildings: new Set(), questions: new Set(), puzzles: new Set(), labs: new Set(), other: new Set() });

export async function buildCitations(): Promise<Map<string, Citers>> {
  const out = new Map<string, Citers>();
  const at = (src: string) => {
    let c = out.get(src);
    if (!c) {
      c = empty();
      out.set(src, c);
    }
    return c;
  };
  const nb = await loadNotesBundle();
  const qb = await loadQuestionsBundle();
  for (const n of nb.notes) {
    for (const { block } of [...allBlocks(n), ...azureBlocks(n)]) for (const s of [...block.sources, ...(block.quotes ?? []).map((q) => q.src)]) at(s).buildings.add(n.building);
  }
  for (const c of nb.confuse) {
    const blocks = [...c.items.flatMap((i) => i.points), ...c.choose, ...(c.trap ? [c.trap] : [])];
    for (const b of blocks) for (const s of [...b.sources, ...(b.quotes ?? []).map((q) => q.src)]) at(s).buildings.add(c.home);
  }
  for (const g of nb.glossary) for (const s of g.definition.sources) at(s).other.add(`glossary:${g.id}`);
  for (const r of nb.renamed) for (const s of r.relation.sources) at(s).other.add(`rename:${r.id}`);
  for (const q of qb.questions) {
    for (const e of q.evidence) {
      at(e.src).questions.add(q.id);
      at(e.src).buildings.add(q.building);
    }
  }
  for (const [type, mod] of await loadPuzzles()) {
    for (const r of mod.def.rules) at(r.src).puzzles.add(`${type}:${r.id}`);
    for (const sc of mod.scenarios) for (const r of mod.def.scenarioRules?.(sc.data) ?? []) {
      at(r.src).puzzles.add(sc.id);
      at(r.src).buildings.add(sc.building);
    }
  }
  const { labs } = await loadLabs();
  for (const l of labs) {
    const srcs = [...l.steps.flatMap((s) => [s.src, ...(s.callout ? [s.callout.src] : [])]), ...l.costs.map((c) => c.src), ...l.traps.map((t) => t.src), ...(l.gate?.cites ?? []).map((c) => c.src)];
    for (const s of srcs) {
      at(s).labs.add(l.id);
      for (const b of l.buildings) at(s).buildings.add(b);
    }
  }
  const era = JSON.parse(readFileSync(new URL('../../content/exam-era.json', import.meta.url), 'utf8')) as { inScopeWithChangedStatus: { service: string; source: string }[] };
  for (const e of era.inScopeWithChangedStatus) at(e.source).other.add(`era:${e.service}`);
  for (const f of [...qb.postGuide.features, ...(qb.postGuide.preGuide ?? [])]) if (f.source) at(f.source).other.add(`post-guide:${f.id}`);
  return out;
}

/** Oldest date among the given sources' dates, or null when any source has none. */
export function oldestDate(dates: readonly (string | undefined)[]): string | null {
  if (dates.length === 0 || dates.some((d) => !d)) return null;
  return (dates as string[]).reduce((a, b) => (a < b ? a : b));
}

export const buildingIds = BUILDINGS.map((b) => b.id);
