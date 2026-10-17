import type { Building } from '../../src/data/types.ts';
import { MIN_SCENARIOS, PUZZLE_TYPES, type Evaluation, type PuzzleModule, type PuzzleType, type Rule } from '../../src/puzzles/types.ts';
import type { BannedTerm } from '../banned-terms.ts';
import type { QueueEntry, ServicesDoc } from './contentChecks.ts';
import { EXTRA_OUT_OF_SCOPE, STATUS_IN_QUESTION, knownNames, norm, outOfScopeNames, unknownServiceMentions, type PostGuideRegistry } from './questionChecks.ts';
import type { Source } from '../../src/content/types.ts';

export interface PuzzleCheckInput {
  modules: ReadonlyMap<PuzzleType, PuzzleModule>;
  buildings: readonly Building[];
  bulletIds: ReadonlySet<string>;
  sources: readonly Source[];
  banned: readonly BannedTerm[];
  queue: readonly QueueEntry[];
  services: ServicesDoc;
  shortNames: readonly { short: string; full: string }[];
  postGuide: PostGuideRegistry;
  /** Types that must exist with their minimum count (the full check); a single-type run passes just that type. */
  require: readonly PuzzleType[];
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Every string a player or reviewer reads for a scenario: story, exhibit, field prompts/options, rule texts and trace notes. */
export function scenarioText(mod: PuzzleModule, s: PuzzleModule['scenarios'][number], ev: Evaluation | null): string {
  const out: string[] = [s.title, s.story];
  for (const sec of mod.def.exhibit(s.data)) {
    out.push(sec.title);
    if (sec.kind === 'table') out.push(...sec.head, ...sec.rows.flat());
    else out.push(sec.text);
  }
  for (const f of mod.def.fields(s.data)) out.push(f.prompt, ...f.options.map((o) => o.label));
  for (const r of mod.def.scenarioRules?.(s.data) ?? []) out.push(r.text);
  if (ev) out.push(...ev.trace.map((t) => t.note));
  return out.join('\n');
}

export function checkRules(label: string, rules: readonly Rule[], sourceById: ReadonlyMap<string, Source>): string[] {
  const p: string[] = [];
  const seen = new Set<string>();
  for (const r of rules) {
    const w = `${label} rule ${r.id}`;
    if (seen.has(r.id)) p.push(`${w}: duplicate rule id`);
    seen.add(r.id);
    const s = sourceById.get(r.src);
    if (!s) p.push(`${w}: unknown source ${r.src}`);
    else {
      if (s.kind !== 'aws') p.push(`${w}: source ${r.src} is not an AWS page`);
      if (!/^https:\/\/(docs\.aws\.amazon\.com|aws\.amazon\.com)\//.test(s.url)) p.push(`${w}: source ${r.src} is outside the allowed sites`);
    }
    if (r.quote.trim().length < 20) p.push(`${w}: quote is too short`);
    if (r.text.trim().length < 10) p.push(`${w}: rule text is too short`);
  }
  return p;
}

export function checkPuzzles(input: PuzzleCheckInput): string[] {
  const p: string[] = [];
  const byBuilding = new Map(input.buildings.map((b) => [b.id, b]));
  const sourceById = new Map(input.sources.map((s) => [s.id, s]));
  const known = knownNames(input.services, input.shortNames);
  const oos = [...new Set([...outOfScopeNames(input.services), ...EXTRA_OUT_OF_SCOPE])];
  const openQueue = input.queue.filter((e) => e.status === 'open');
  const ids = new Set<string>();

  for (const type of input.require) {
    const mod = input.modules.get(type);
    if (!mod) {
      p.push(`puzzles ${type}: missing (src/puzzles/${type}/index.ts)`);
      continue;
    }
    if (mod.scenarios.length < MIN_SCENARIOS[type]) p.push(`puzzles ${type}: needs at least ${MIN_SCENARIOS[type]} scenarios (has ${mod.scenarios.length})`);
  }

  for (const type of PUZZLE_TYPES) {
    const mod = input.modules.get(type);
    if (!mod) continue;
    if (mod.def.type !== type) p.push(`puzzles ${type}: def.type is ${mod.def.type}`);
    p.push(...checkRules(`puzzles ${type}`, mod.def.rules, sourceById));
    const ruleIds = new Set(mod.def.rules.map((r) => r.id));

    for (const s of mod.scenarios) {
      const w = `puzzle ${s.id}`;
      if (!new RegExp(`^puzzle-${type}-\\d{3}$`).test(s.id)) p.push(`${w}: id must be puzzle-${type}-NNN`);
      if (ids.has(s.id)) p.push(`${w}: duplicate id`);
      ids.add(s.id);
      if (s.type !== type) p.push(`${w}: type is ${s.type}, expected ${type}`);
      if (![1, 2, 3].includes(s.difficulty)) p.push(`${w}: difficulty must be 1, 2 or 3`);
      if (s.title.trim().length < 5 || s.story.trim().length < 40) p.push(`${w}: needs a title and a story of a few sentences`);

      const building = byBuilding.get(s.building);
      if (!building) p.push(`${w}: unknown building ${s.building}`);
      else if (building.task === null) {
        if (s.bullets.length > 0) p.push(`${w}: a Foundation puzzle carries no bullets`);
      } else {
        if (s.bullets.length === 0) p.push(`${w}: needs at least one outline bullet`);
        for (const b of s.bullets) {
          if (!input.bulletIds.has(b)) p.push(`${w}: unknown bullet ${b}`);
          else if (!building.bullets.includes(b)) p.push(`${w}: bullet ${b} does not belong to ${s.building}`);
        }
      }

      for (const r of mod.def.scenarioRules?.(s.data) ?? []) p.push(...checkRules(w, [r], sourceById));

      let ev: Evaluation | null = null;
      try {
        ev = mod.def.evaluate(s.data);
      } catch (e) {
        p.push(`${w}: evaluator threw ${(e as Error).message}`);
      }
      if (ev === null) p.push(`${w}: the evaluator refuses this scenario (the cited rules do not settle it)`);
      else {
        let again: Evaluation | null = null;
        try {
          again = mod.def.evaluate(s.data);
        } catch {
          /* reported above */
        }
        if (!same(ev, again)) p.push(`${w}: the evaluator is not deterministic`);
        const fields = mod.def.fields(s.data);
        const fieldIds = new Set(fields.map((f) => f.id));
        if (fields.length === 0 && type !== 'architecture-builder') p.push(`${w}: no fields to answer`);
        for (const f of fields) {
          const optIds = f.options.map((o) => o.id);
          if (new Set(optIds).size !== optIds.length) p.push(`${w}: field ${f.id} repeats an option id`);
          const right = ev.answer[f.id];
          if (!right || right.length === 0) p.push(`${w}: field ${f.id} has no computed answer`);
          else {
            for (const r of right) if (!optIds.includes(r)) p.push(`${w}: computed answer ${r} is not an option of ${f.id}`);
            if (!f.multi && right.length !== 1) p.push(`${w}: single-choice field ${f.id} has ${right.length} answers`);
          }
        }
        for (const k of Object.keys(ev.answer)) if (!fieldIds.has(k)) p.push(`${w}: answer for unknown field ${k}`);
        const scenarioRuleIds = new Set((mod.def.scenarioRules?.(s.data) ?? []).map((r) => r.id));
        for (const t of ev.trace) for (const r of [t.rule, ...(t.also ?? [])]) if (!ruleIds.has(r) && !scenarioRuleIds.has(r)) p.push(`${w}: trace cites unknown rule ${r}`);
        if (ev.trace.length === 0) p.push(`${w}: the evaluation has no trace`);
      }

      const text = scenarioText(mod, s, ev);
      for (const b of input.banned) if (norm(text).includes(norm(b.term))) p.push(`${w}: contains banned term "${b.term}"`);
      for (const e of openQueue) for (const k of e.keywords ?? []) if (norm(text).includes(norm(k))) p.push(`${w}: touches open needs-verification item ${e.id} ("${k}")`);
      for (const n of oos) {
        const re = new RegExp(`(^|[^A-Za-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9]|$)`);
        if (re.test(text)) p.push(`${w}: names out-of-scope service "${n}"`);
      }
      for (const u of unknownServiceMentions(text, known)) p.push(`${w}: "${u}" is not an in-scope service name or short name`);
      if (STATUS_IN_QUESTION.test(text)) p.push(`${w}: depends on availability status wording`);
      for (const f of input.postGuide.features) {
        if (f.patterns.some((pat) => new RegExp(pat, 'i').test(text))) p.push(`${w}: matches the post-guide feature "${f.id}"; puzzles must not use features newer than the exam guide`);
      }
    }
    for (const r of mod.def.rules) {
      for (const f of input.postGuide.features) {
        const hit = f.patterns.some((pat) => new RegExp(pat, 'i').test(r.text));
        if (hit && !(r.newer ?? []).includes(f.id)) p.push(`puzzles ${type} rule ${r.id}: matches the post-guide feature "${f.id}" and must declare newer: ['${f.id}']`);
      }
      for (const id of r.newer ?? []) if (!input.postGuide.features.some((f) => f.id === id)) p.push(`puzzles ${type} rule ${r.id}: unknown post-guide feature ${id}`);
    }
  }
  return p;
}
