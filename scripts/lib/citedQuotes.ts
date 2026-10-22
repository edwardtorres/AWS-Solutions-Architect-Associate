/**
 * Every verbatim quote the content cites, with where it is cited: note blocks, question evidence, puzzle rules and scenario facts,
 * lab steps, cost badges, callouts, gates and traps, and the post-guide date quotes. check:links verifies each quote on its page;
 * check:freshness keeps the paragraph around each quote so a changed page can be shown before and after.
 */
import { loadLabs } from './loadLabs.ts';
import { loadNotesBundle, loadQuestionsBundle } from './loadNotes.ts';
import { loadPuzzles } from './loadPuzzles.ts';
import { everyBlock } from './notesChecks.ts';

export interface CitedQuote {
  /** Where the quote is cited, for the report. */
  where: string;
  /** The source id (content/sources.ts). */
  src: string;
  /** The quote, verbatim. */
  text: string;
}

export async function citedQuotes(): Promise<CitedQuote[]> {
  const notes = await loadNotesBundle();
  const qb = await loadQuestionsBundle();
  const out: CitedQuote[] = [];
  for (const { where, block } of everyBlock(notes)) for (const q of block.quotes ?? []) out.push({ where, src: q.src, text: q.text });
  for (const q of qb.questions) for (const e of q.evidence) out.push({ where: `question ${q.id}`, src: e.src, text: e.text });
  for (const [type, mod] of await loadPuzzles()) {
    for (const r of mod.def.rules) out.push({ where: `puzzles ${type} rule ${r.id}`, src: r.src, text: r.quote });
    for (const sc of mod.scenarios) for (const r of mod.def.scenarioRules?.(sc.data) ?? []) out.push({ where: `${sc.id} rule ${r.id}`, src: r.src, text: r.quote });
  }
  for (const lab of (await loadLabs()).labs) {
    for (const s of lab.steps) out.push({ where: `${lab.id} step ${s.id}`, src: s.src, text: s.quote });
    for (const c of lab.costs) out.push({ where: `${lab.id} cost ${c.id}`, src: c.src, text: c.quote });
    for (const s of lab.steps) if (s.callout) out.push({ where: `${lab.id} step ${s.id} callout`, src: s.callout.src, text: s.callout.quote });
    for (const [i, c] of (lab.gate?.cites ?? []).entries()) out.push({ where: `${lab.id} gate cite ${i + 1}`, src: c.src, text: c.quote });
    for (const t of lab.traps) out.push({ where: `${lab.id} trap ${t.pair}`, src: t.src, text: t.quote });
  }
  // The post-guide registry dates each feature with a quote from an AWS page.
  for (const f of [...qb.postGuide.features, ...(qb.postGuide.preGuide ?? [])]) if (f.source && f.quote) out.push({ where: `post-guide ${f.id}`, src: f.source, text: f.quote });
  return out;
}

/** The quotes grouped by the page they cite (fragment removed), for the freshness check. */
export async function quotesByUrl(): Promise<Map<string, CitedQuote[]>> {
  const notes = await loadNotesBundle();
  const urlOf = new Map(notes.sources.map((s) => [s.id, s.url.split('#')[0] as string]));
  const out = new Map<string, CitedQuote[]>();
  for (const q of await citedQuotes()) {
    const url = urlOf.get(q.src);
    if (!url) continue;
    out.set(url, [...(out.get(url) ?? []), q]);
  }
  return out;
}
