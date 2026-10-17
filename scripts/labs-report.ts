/** npx tsx scripts/labs-report.ts: prints the lab table, totals and the outline bullets with no hands-on lab (for the Step 6 audit). */
import { readFileSync } from 'node:fs';
import { BUILDINGS } from '../src/data/buildings.ts';
import { planOf } from '../content/labs/services.ts';
import { PLAN_LABEL } from '../src/labs/types.ts';
import { loadLabs } from './lib/loadLabs.ts';

const { labs } = await loadLabs();
const outline = JSON.parse(readFileSync(new URL('./official-outline.json', import.meta.url), 'utf8')) as { domains: { id: number; tasks: { id: string; bullets: { id: string; text: string }[] }[] }[] };
const out: string[] = ['| Lab | Time | Needs | Plan | Bills while running | Bullets |', '| --- | --- | --- | --- | --- | --- |'];
for (const l of labs) {
  out.push(`| ${l.n}. ${l.title} | ${l.minutes} min | ${l.needs.map((n) => n.slice(4, 6)).join(', ') || 'none'} | ${PLAN_LABEL[planOf(l.services)]} | ${l.costs.map((c) => c.resource).join('; ') || 'nothing'} | ${l.bullets.join(', ')} |`);
}
const total = labs.reduce((n, l) => n + l.minutes, 0);
out.push('', `Total: ${labs.length} labs, ${total} minutes (${(total / 60).toFixed(1)} hours).`, '');
const covered = new Set(labs.flatMap((l) => l.bullets));
for (const d of outline.domains) {
  const all = d.tasks.flatMap((t) => t.bullets);
  const miss = all.filter((b) => !covered.has(b.id));
  out.push(`Domain ${d.id}: ${all.length - miss.length} of ${all.length} bullets have a lab.`);
  for (const b of miss) out.push(`  - ${b.id} ${b.text}`);
}
const unmapped = BUILDINGS.filter((b) => b.bullets.length > 0 && !labs.some((l) => l.buildings.includes(b.id)));
out.push('', `Buildings with bullets and no lab: ${unmapped.length} of ${BUILDINGS.filter((b) => b.bullets.length > 0).length}.`);
console.log(out.join('\n'));
