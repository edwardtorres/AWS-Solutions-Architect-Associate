/**
 * Builds the claim records for the Step 8 audit (Part C). A claim is one unit a checker agent judges: the text of the claim, the
 * verbatim quotes it cites, and for each quote the surrounding passage from the current page (or the closest passages when the quote
 * is no longer on the page, which is the "source changed" case). Pure data in, JSON out; nothing is judged here.
 */
import { BUILDINGS } from '../../src/data/buildings.ts';
import type { Block, Source } from '../../src/content/types.ts';
import { fetchPage, hasText, type PageInfo } from '../lib/pageCache.ts';
import { loadNotesBundle, loadQuestionsBundle } from '../lib/loadNotes.ts';
import { loadPuzzles } from '../lib/loadPuzzles.ts';
import { loadLabs } from '../lib/loadLabs.ts';
import { allBlocks, azureBlocks, normalise, numberTokens } from '../lib/notesChecks.ts';
import { readFileSync } from 'node:fs';

export type Group = 'G1-keys' | 'G2-puzzles' | 'G3-numbers' | 'G4-azure' | 'G5-labs' | 'G6-status' | 'S-sample';

export interface Cite {
  src: string;
  url: string;
  quote: string;
  /** The quote is still on the page. */
  found: boolean;
  /** Passage around the quote (found) or the closest passages (not found), from the current page text. */
  window: string;
}

export interface Claim {
  id: string;
  group: Group;
  /** citadel | harbor | express | treasury | square | shared | labs | puzzles | meta */
  district: string;
  building: string;
  kind: string;
  /** What is being claimed, as a reader would see it. */
  text: string;
  cites: Cite[];
  /** Extra context for the checker (file to read, what to verify). */
  note?: string;
}

const readJson = <T>(rel: string): T => JSON.parse(readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8')) as T;
const districtOf = new Map(BUILDINGS.map((b) => [b.id, b.district as string]));

class Pages {
  private cache = new Map<string, PageInfo>();
  constructor(private sources: Map<string, Source>) {}
  async get(url: string): Promise<PageInfo> {
    const key = url.split('#')[0] as string;
    let p = this.cache.get(key);
    if (!p) {
      p = await fetchPage(key);
      this.cache.set(key, p);
    }
    return p;
  }
  async cite(src: string, quote: string): Promise<Cite> {
    const s = this.sources.get(src);
    if (!s) return { src, url: '(unknown source)', quote, found: false, window: 'Unknown source id.' };
    const page = await this.get(s.url);
    const q = normalise(quote);
    const found = hasText(page, quote);
    if (found) {
      const i = page.text.indexOf(q);
      const text = i >= 0 ? page.text : page.rawText;
      const j = i >= 0 ? i : text.indexOf(q);
      return { src, url: s.url, quote, found, window: `…${text.slice(Math.max(0, j - 500), j + q.length + 500)}…` };
    }
    return { src, url: s.url, quote, found, window: closest(page, quote) };
  }
}

/** The three page sentences that share most words with the quote. */
function closest(page: PageInfo, quote: string): string {
  const words = new Set(quote.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);
  const text = page.display ?? page.text;
  const scored = text
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.length < 700)
    .map((s) => {
      const sw = new Set(s.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);
      let hit = 0;
      for (const w of words) if (sw.has(w)) hit += 1;
      return { s, score: words.size ? hit / words.size : 0 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .filter((x) => x.score > 0.2);
  return scored.length ? `QUOTE NOT FOUND ON THE CURRENT PAGE. Closest passages: ${scored.map((x) => `"${x.s}"`).join(' | ')}` : 'QUOTE NOT FOUND ON THE CURRENT PAGE and no similar passage exists.';
}

const blockText = (b: Block) => `${b.status ? `[status label: ${b.status}] ` : ''}${b.newer?.length ? `[newer: ${b.newer.join(',')}] ` : ''}${b.disputed ? `[disputed: ${b.disputed}] ` : ''}${b.text}`;

export async function buildClaims(opts: { seed?: number } = {}): Promise<Claim[]> {
  const nb = await loadNotesBundle();
  const qb = await loadQuestionsBundle();
  const puzzles = await loadPuzzles();
  const { labs } = await loadLabs();
  const sources = new Map(nb.sources.map((s) => [s.id, s]));
  const pages = new Pages(sources);
  const claims: Claim[] = [];
  const add = (c: Claim) => claims.push(c);
  const blockCites = (b: Block) => Promise.all((b.quotes ?? []).map((q) => pages.cite(q.src, q.text)));

  // G1: every question: the key, the explanation of every option, and the evidence.
  for (const q of qb.questions) {
    const lines = q.options.map((o, i) => `${String.fromCharCode(65 + i)}. [${o.correct ? 'CORRECT' : 'wrong'}] ${o.text}\n   why: ${o.why}`);
    add({
      id: `q:${q.id}`,
      group: 'G1-keys',
      district: districtOf.get(q.building) ?? 'square',
      building: q.building,
      kind: `question ${q.format} d${q.difficulty}${q.era ? ` era:${q.era}` : ''}${q.postGuide?.length ? ` post-guide:${q.postGuide.join(',')}` : ''}`,
      text: `STEM: ${q.stem}\n${lines.join('\n')}`,
      cites: await Promise.all(q.evidence.map((e) => pages.cite(e.src, e.text))),
      note: 'Judge: (1) the keyed option(s) are correct and every wrong option is definitely wrong, according to the cited AWS text; (2) the explanation of each correct option is supported by the evidence; (3) every number, limit, duration or date in the question matches the evidence.',
    });
  }

  // G2: puzzle rules, scenario rules (Qualifier Sprint facts and others), evaluator logic.
  const seenRule = new Set<string>();
  for (const [type, mod] of puzzles) {
    for (const r of mod.def.rules) {
      const id = `rule:${type}:${r.id}`;
      if (seenRule.has(id)) continue;
      seenRule.add(id);
      add({ id, group: 'G2-puzzles', district: 'puzzles', building: type, kind: `puzzle rule${r.newer?.length ? ` newer:${r.newer.join(',')}` : ''}`, text: `RULE ${r.id}: ${r.text}`, cites: [await pages.cite(r.src, r.quote)], note: 'Judge whether the quote supports the rule exactly as the evaluator applies it (conditions, exceptions, numbers).' });
    }
    for (const s of mod.scenarios) {
      for (const r of mod.def.scenarioRules?.(s.data) ?? []) {
        const id = `srule:${s.id}:${r.id}`;
        add({ id, group: 'G2-puzzles', district: 'puzzles', building: type, kind: 'puzzle scenario rule / fact', text: `SCENARIO ${s.id} "${s.title}" fact ${r.id}: ${r.text}`, cites: [await pages.cite(r.src, r.quote)], note: 'Judge whether the quote supports the fact as worded, and whether the fact really makes that option the best fit for its qualifier.' });
      }
    }
    add({ id: `eval:${type}`, group: 'G2-puzzles', district: 'puzzles', building: type, kind: 'evaluator logic', text: `Read src/puzzles/${type}/def.ts. Does the code apply the rules it cites faithfully (no extra conditions, no missing exceptions)?`, cites: [], note: `File: src/puzzles/${type}/def.ts and its rules (rule:${type}:*). Quote each rule id whose code differs from its text.` });
  }

  // Notes: classify every block.
    const sample: Claim[] = [];
  for (const n of nb.notes) {
    const district = districtOf.get(n.building) ?? 'shared';
    for (const { where, block } of allBlocks(n)) {
      const id = `note:${n.building}:${where}`;
      const base = { id, district, building: n.building, kind: `note ${where.replace(/\[\d+\]/g, '')}`, text: blockText(block), cites: await blockCites(block) };
      if (block.status) add({ ...base, group: 'G6-status', kind: `status label ${block.status}` });
      else if (numberTokens(block.text).length > 0) add({ ...base, group: 'G3-numbers', note: 'Judge every number, limit, quota, duration and date in the text against the quotes and the page passage.' });
      else sample.push({ ...base, group: 'S-sample' });
    }
    for (const { where, block } of azureBlocks(n)) {
      add({ id: `note:${n.building}:${where}`, group: 'G4-azure', district, building: n.building, kind: `azure ${where.replace(/\[\d+\]/g, '')}`, text: blockText(block), cites: await blockCites(block), note: 'Both sides: the Learn quote must support the Azure statement and the AWS quote the AWS statement; the comparison must not overstate equivalence.' });
    }
  }
  for (const g of nb.glossary) {
    const base = { id: `glossary:${g.id}`, district: 'shared', building: 'glossary', kind: 'glossary definition', text: blockText(g.definition), cites: await blockCites(g.definition) };
    if (numberTokens(g.definition.text).length > 0) add({ ...base, group: 'G3-numbers' });
    else sample.push({ ...base, group: 'S-sample' });
  }
  for (const c of nb.confuse) {
    const blocks: { where: string; block: Block }[] = [];
    c.items.forEach((it) => it.points.forEach((b, i) => blocks.push({ where: `${it.name}[${i}]`, block: b })));
    c.choose.forEach((b, i) => blocks.push({ where: `choose[${i}]`, block: b }));
    if (c.trap) blocks.push({ where: 'trap', block: c.trap });
    for (const { where, block } of blocks) {
      const base = { id: `confuse:${c.id}:${where}`, district: districtOf.get(c.home) ?? 'shared', building: c.home, kind: `don't-confuse ${c.id}`, text: blockText(block), cites: await blockCites(block) };
      if (block.status) add({ ...base, group: 'G6-status' });
      else if (numberTokens(block.text).length > 0) add({ ...base, group: 'G3-numbers' });
      else sample.push({ ...base, group: 'S-sample' });
    }
  }

  // G6: status labels beyond notes, exam-era, post-guide registry, renamed services.
  const era = readJson<{ inScopeWithChangedStatus: { service: string; status: string; sentence: string; source: string }[] }>('content/exam-era.json');
  for (const e of era.inScopeWithChangedStatus) add({ id: `era:${e.service}`, group: 'G6-status', district: 'meta', building: 'exam-era', kind: `exam-era status ${e.status}`, text: `${e.service}: status "${e.status}". Recorded AWS sentence: ${e.sentence}`, cites: [await pages.cite(e.source, e.sentence)], note: 'Is the status still true today on the current page? Is the sentence verbatim and does it say what the label claims?' });
  for (const f of qb.postGuide.features) {
    add({ id: `pg:${f.id}`, group: 'G6-status', district: 'meta', building: 'post-guide', kind: 'post-guide registry date', text: `${f.name}: introduced ${f.introduced} (certainty ${f.certainty}).`, cites: f.source ? [await pages.cite(f.source, f.quote ?? '')] : [], note: 'Does the quote (a date or launch announcement) show that the feature was introduced on or after 2022-08-01 in that month? If the page shows an earlier date, say so.' });
  }
  for (const f of qb.postGuide.preGuide ?? []) {
    add({ id: `pg-pre:${f.id}`, group: 'G6-status', district: 'meta', building: 'post-guide', kind: 'pre-guide registry entry', text: `${f.name}: recorded as introduced ${f.introduced} (before the exam guide).`, cites: f.source ? [await pages.cite(f.source, f.quote ?? '')] : [], note: 'Does the quote show the feature was introduced before 2022-08-01?' });
  }
  for (const r of nb.renamed) add({ id: `rename:${r.id}`, group: 'G6-status', district: 'meta', building: 'renamed', kind: `rename ${r.examGuideName} / ${r.otherName}`, text: `Exam guide name "${r.examGuideName}"; other name "${r.otherName}". ${blockText(r.relation)}`, cites: await blockCites(r.relation), note: 'Does the exam guide still use the first name (check the in-scope list in scripts/official-services.json) and do the AWS pages support the relation between the two names today?' });

  // G5: lab steps, costs, gates, traps.
  for (const l of labs) {
    for (const s of l.steps) {
      const parts = [`STEP ${s.id} (${s.kind ?? 'do'}${s.optional ? ', optional' : ''}): ${s.text}`];
      if (s.alt) parts.push(`ALT: ${s.alt}`);
      if (s.callout) parts.push(`CALLOUT: ${s.callout.text}`);
      if (s.costs?.length) parts.push(`BILLS: ${s.costs.map((c) => l.costs.find((x) => x.id === c)?.resource ?? c).join('; ')}`);
      const cites = [await pages.cite(s.src, s.quote)];
      if (s.callout) cites.push(await pages.cite(s.callout.src, s.callout.quote));
      add({ id: `lab:${l.id}:${s.id}`, group: 'G5-labs', district: 'labs', building: l.id, kind: `lab step ${s.kind ?? 'do'}`, text: parts.join('\n'), cites, note: 'Audit the factual statements only (limits, defaults, what bills, what deletes what, order of operations); ignore click paths and navigation wording.' });
    }
    for (const c of l.costs) add({ id: `labcost:${l.id}:${c.id}`, group: 'G5-labs', district: 'labs', building: l.id, kind: 'lab cost badge', text: `"Bills while running": ${c.resource}. Basis: ${c.basis}`, cites: [await pages.cite(c.src, c.quote)] });
    if (l.gate) for (const [i, c] of l.gate.cites.entries()) add({ id: `labgate:${l.id}:${i}`, group: 'G5-labs', district: 'labs', building: l.id, kind: 'lab gate warning', text: `${l.gate.title}. ${l.gate.text}`, cites: [await pages.cite(c.src, c.quote)] });
    for (const t of l.traps) add({ id: `labtrap:${l.id}:${t.pair}`, group: 'G5-labs', district: 'labs', building: l.id, kind: 'lab trap', text: t.text, cites: [await pages.cite(t.src, t.quote)] });
  }

  // 10% sample of the remaining note claims per district (seeded).
  let s = (opts.seed ?? 8) >>> 0;
  const rnd = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const byDistrict = new Map<string, Claim[]>();
  for (const c of sample) byDistrict.set(c.district, [...(byDistrict.get(c.district) ?? []), c]);
  for (const [, list] of [...byDistrict].sort((a, b) => a[0].localeCompare(b[0]))) {
    const want = Math.max(3, Math.ceil(list.length * 0.1));
    const pool = [...list];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rnd() * (i + 1));
      [pool[i], pool[j]] = [pool[j] as Claim, pool[i] as Claim];
    }
    claims.push(...pool.slice(0, want).map((c) => ({ ...c, kind: `${c.kind} (sample)` })));
  }
  // A note whose quote has left the page is always audited, sampled or not.
  const chosen = new Set(claims.map((c) => c.id));
  for (const c of sample) if (!chosen.has(c.id) && c.cites.some((x) => !x.found)) claims.push({ ...c, kind: `${c.kind} (quote no longer on the page)` });
  // Keep the full remaining pool for district escalation.
  return Object.assign(claims, { remainingPool: sample }) as Claim[] & { remainingPool: Claim[] };
}
