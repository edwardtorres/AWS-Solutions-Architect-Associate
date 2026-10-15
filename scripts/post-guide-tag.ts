/**
 * npx tsx scripts/post-guide-tag.ts [--write]
 * Adds `postGuide: [...]` (and `postGuideKey: [...]` when a correct option names the feature) to every question
 * that matches a registry feature but does not declare it. Dry run by default.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadQuestionsBundle } from './lib/loadNotes.ts';
import { questionBody } from './lib/questionChecks.ts';

const write = process.argv.includes('--write');
const root = new URL('../content/questions/', import.meta.url).pathname;
const files = (dir: string): string[] => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : n.endsWith('.ts') && n !== 'helpers.ts' ? [join(dir, n)] : []));

const { questions, postGuide } = await loadQuestionsBundle();
const res = postGuide.features.map((f) => ({ f, re: f.patterns.map((p) => new RegExp(p, 'i')) }));
const edits = new Map<string, { pg: string[]; key: string[] }>();
for (const q of questions) {
  const body = questionBody(q);
  const hit = res.filter(({ re }) => re.some((r) => r.test(body)));
  const have = new Set(q.postGuide ?? []);
  const add = hit.filter(({ f }) => !have.has(f.id));
  if (add.length === 0) continue;
  const correctText = q.options.filter((o) => o.correct).map((o) => `${o.text}\n${o.why}`).join('\n');
  const keyIds = hit.filter(({ re, f }) => re.some((r) => r.test(correctText)) || (q.postGuideKey ?? []).includes(f.id)).map(({ f }) => f.id);
  edits.set(q.id, { pg: [...have, ...add.map(({ f }) => f.id)], key: keyIds });
}
console.log(`${edits.size} questions to tag`);
for (const [id, e] of edits) console.log(`${id}: ${e.pg.join(',')}${e.key.length ? `  KEY: ${e.key.join(',')}` : ''}`);
if (write) {
  for (const file of files(root)) {
    let src = readFileSync(file, 'utf8');
    let changed = false;
    for (const [id, e] of edits) {
      const marker = `id: '${id}',`;
      if (!src.includes(marker)) continue;
      const extra = ` postGuide: [${e.pg.map((x) => `'${x}'`).join(', ')}],${e.key.length ? ` postGuideKey: [${e.key.map((x) => `'${x}'`).join(', ')}],` : ''}`;
      src = src.replace(marker, `${marker}${extra}`);
      changed = true;
    }
    if (changed) writeFileSync(file, src);
  }
}
