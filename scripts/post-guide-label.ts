/**
 * npx tsx scripts/post-guide-label.ts [--write]
 * Adds `newer: [...]` to every note block `b(...)` whose text matches a post-guide registry pattern.
 * Dry run by default. Works on the source text of content/notes/** (finds each b( call, splits its arguments).
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PostGuideRegistry } from './lib/questionChecks.ts';

const write = process.argv.includes('--write');
const registry = JSON.parse(readFileSync(new URL('../content/post-guide.json', import.meta.url), 'utf8')) as PostGuideRegistry;
const res = registry.features.map((f) => ({ id: f.id, re: f.patterns.map((p) => new RegExp(p, 'i')) }));
const root = new URL('../content/notes/', import.meta.url).pathname;
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : n.endsWith('.ts') ? [join(d, n)] : []));

/** Scans from `open` (index of "(") and returns the index of its matching ")" plus the top-level argument spans. */
function scanCall(src: string, open: number): { close: number; args: [number, number][] } {
  const args: [number, number][] = [];
  let depth = 0;
  let start = open + 1;
  let i = open;
  for (; i < src.length; i += 1) {
    const c = src[i] as string;
    if (c === "'" || c === '"' || c === '`') {
      for (i += 1; i < src.length && src[i] !== c; i += 1) if (src[i] === '\\') i += 1;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') {
      depth -= 1;
      if (depth === 0) {
        args.push([start, i]);
        return { close: i, args };
      }
    } else if (c === ',' && depth === 1) {
      args.push([start, i]);
      start = i + 1;
    }
  }
  throw new Error('unbalanced');
}

let total = 0;
for (const file of [...walk(root), new URL('../content/dont-confuse.ts', import.meta.url).pathname]) {
  let src = readFileSync(file, 'utf8');
  const calls: { close: number; args: [number, number][] }[] = [];
  for (const m of src.matchAll(/(?<![\w.])b\(/g)) {
    const open = (m.index as number) + 1;
    calls.push(scanCall(src, open));
  }
  // Patch from the end so earlier offsets stay valid.
  let changed = false;
  for (const call of calls.reverse()) {
    const first = src.slice(call.args[0]![0], call.args[0]![1]).trim();
    let text: string;
    try {
      text = new Function(`return (${first});`)() as string;
    } catch {
      continue;
    }
    const hit = res.filter(({ re }) => re.some((r) => r.test(text))).map((x) => x.id);
    if (hit.length === 0) continue;
    const optsArg = call.args[3];
    const existing = optsArg ? src.slice(optsArg[0], optsArg[1]) : '';
    const have = [...existing.matchAll(/newer:\s*\[([^\]]*)\]/g)].flatMap((m) => [...(m[1] as string).matchAll(/'([^']+)'/g)].map((x) => x[1] as string));
    const need = hit.filter((id) => !have.includes(id));
    if (need.length === 0) continue;
    total += 1;
    const list = [...have, ...need].map((id) => `'${id}'`).join(', ');
    if (optsArg) {
      if (/newer:/.test(existing)) src = src.slice(0, optsArg[0]) + existing.replace(/newer:\s*\[[^\]]*\]/, `newer: [${list}]`) + src.slice(optsArg[1]);
      else src = src.slice(0, optsArg[0]) + existing.replace(/\{\s*/, `{ newer: [${list}], `) + src.slice(optsArg[1]);
    } else if (call.args.length === 3) {
      src = `${src.slice(0, call.close)}, { newer: [${list}] }${src.slice(call.close)}`;
    } else if (call.args.length === 2) {
      src = `${src.slice(0, call.close)}, [], { newer: [${list}] }${src.slice(call.close)}`;
    } else continue;
    changed = true;
  }
  if (changed && write) writeFileSync(file, src);
}
console.log(`${total} blocks ${write ? 'labelled' : 'to label'}`);
