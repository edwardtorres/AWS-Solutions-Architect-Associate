/**
 * npx tsx scripts/blind-puzzles.ts export [--share 0.5]   -> .cache/blind/puzzles-<type>.json (give to the reviewer)
 * npx tsx scripts/blind-puzzles.ts score  [type]          -> compares docs/reviews/puzzles/blind-<type>.json with the computed answers
 *
 * The export is keyless: story, exhibit as text, fields with options. Policy Court, Packet Tracer and Disaster Bunker are
 * exported in full; every other type at the share given (default 0.5, always at least 30%), chosen by a fixed stride.
 * Reviewer answers: field puzzles `{id, answers: {fieldId: [optionId]}, ambiguous?, note?}`; Architecture Builder
 * `{id, placement: [{kind, tier, az}], ...}` (az 0.. or -1 for the regional row).
 */
import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { score, type BuilderData, type Placed } from '../src/puzzles/architecture-builder/def.ts';
import { PUZZLE_TYPES, type PuzzleModule, type PuzzleType, type Scenario } from '../src/puzzles/types.ts';
import { loadPuzzles } from './lib/loadPuzzles.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const FULL: readonly PuzzleType[] = ['policy-court', 'packet-tracer', 'disaster-bunker'];

function exhibitText(mod: PuzzleModule, s: Scenario<unknown>): string {
  return mod.def
    .exhibit(s.data)
    .map((sec) => (sec.kind === 'table' ? `## ${sec.title}\n${[sec.head, ...sec.rows].map((r) => r.join(' | ')).join('\n')}` : `## ${sec.title}\n${sec.text}`))
    .join('\n\n');
}

function sample(type: PuzzleType, list: Scenario<unknown>[], share: number): Scenario<unknown>[] {
  if (FULL.includes(type)) return list;
  const want = Math.max(Math.ceil(list.length * 0.3), Math.ceil(list.length * share));
  const stride = list.length / want;
  return Array.from({ length: want }, (_, i) => list[Math.min(list.length - 1, Math.floor(i * stride))] as Scenario<unknown>);
}

const mode = process.argv[2];
const modules = await loadPuzzles();

if (mode === 'export') {
  const share = Number(process.argv[process.argv.indexOf('--share') + 1]) || 0.5;
  mkdirSync(`${root}.cache/blind/`, { recursive: true });
  for (const [type, mod] of modules) {
    const picked = sample(type, mod.scenarios, share);
    const view = picked.map((s) => ({
      id: s.id,
      story: s.story,
      exhibit: exhibitText(mod, s),
      ...(type === 'architecture-builder'
        ? { task: 'Return placement: a list of {kind, tier, az}. kinds: alb, app, nat, db-primary, db-standby, cache, queue. tiers: public, private-app, private-data, regional (queue only). az is 0 for Zone A, 1 for Zone B, 2 for Zone C, -1 for the regional row. Use no more components than the palette allows.' }
        : { fields: mod.def.fields(s.data).map((f) => ({ id: f.id, prompt: f.prompt, multi: f.multi, options: f.options })) }),
    }));
    writeFileSync(`${root}.cache/blind/puzzles-${type}.json`, `${JSON.stringify(view, null, 1)}\n`);
    console.log(`${type}: ${picked.length} of ${mod.scenarios.length} scenarios -> .cache/blind/puzzles-${type}.json`);
  }
} else if (mode === 'score') {
  const only = process.argv[3] as PuzzleType | undefined;
  let bad = 0;
  for (const type of PUZZLE_TYPES) {
    if (only && type !== only) continue;
    const mod = modules.get(type);
    if (!mod) continue;
    const exported = JSON.parse(readFileSync(`${root}.cache/blind/puzzles-${type}.json`, 'utf8')) as { id: string }[];
    const file = `${root}docs/reviews/puzzles/blind-${type}.json`;
    const got = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as { id: string; answers?: Record<string, string[]>; placement?: Placed[]; ambiguous?: boolean; note?: string }[]) : [];
    const byId = new Map(got.map((g) => [g.id, g]));
    const disputes: string[] = [];
    let agree = 0;
    for (const e of exported) {
      const s = mod.scenarios.find((x) => x.id === e.id) as Scenario<unknown>;
      const r = byId.get(e.id);
      if (!r) {
        disputes.push(`${e.id}: no blind answer yet`);
        continue;
      }
      let same: boolean;
      if (type === 'architecture-builder') same = (r.placement ?? []).length > 0 && score(s.data as BuilderData, r.placement ?? []).every((c) => c.pass);
      else {
        const ev = mod.def.evaluate(s.data);
        same = !!ev && mod.def.fields(s.data).every((f) => {
          const a = [...(r.answers?.[f.id] ?? [])].sort().join(',');
          const b = [...(ev.answer[f.id] ?? [])].sort().join(',');
          return a === b;
        });
      }
      if (same && !r.ambiguous) agree += 1;
      else disputes.push(`${e.id}: ${same ? 'flagged ambiguous' : 'different answer'}${r.note ? ` (${r.note})` : ''}`);
    }
    console.log(`${type}: ${agree} of ${exported.length} agree and are unambiguous; ${disputes.length} to resolve`);
    for (const d of disputes) console.log(`  - ${d}`);
    bad += disputes.length;
  }
  if (bad > 0) process.exit(1);
} else {
  throw new Error('usage: blind-puzzles.ts export|score');
}
