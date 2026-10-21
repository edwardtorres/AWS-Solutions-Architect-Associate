/**
 * npx tsx scripts/audit/extract.ts [--seed N]
 * Writes the claim files for the Step 8 audit to .cache/audit/claims/<group>.jsonl (git-ignored, they hold page passages) and the
 * not-yet-sampled note pool to .cache/audit/pool.jsonl, then prints the counts. Reads the page cache; run `npm run check:links -- --fresh` first.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildClaims, type Claim } from './claims.ts';

const seedArg = process.argv.indexOf('--seed');
const seed = seedArg >= 0 ? Number(process.argv[seedArg + 1]) : 8;
const claims = (await buildClaims({ seed })) as Claim[] & { remainingPool: Claim[] };
const dir = new URL('../../.cache/audit/claims/', import.meta.url);
mkdirSync(dir, { recursive: true });
const byGroup = new Map<string, Claim[]>();
for (const c of claims) byGroup.set(c.group, [...(byGroup.get(c.group) ?? []), c]);
for (const [g, list] of byGroup) writeFileSync(new URL(`${g}.jsonl`, dir), list.map((c) => JSON.stringify(c)).join('\n') + '\n');
writeFileSync(new URL('../pool.jsonl', dir), claims.remainingPool.map((c) => JSON.stringify(c)).join('\n') + '\n');
for (const [g, list] of [...byGroup].sort()) {
  const missing = list.filter((c) => c.cites.some((x) => !x.found)).length;
  console.log(`${g.padEnd(12)} ${String(list.length).padStart(5)} claims   quote not on page: ${missing}`);
}
const pool = new Map<string, number>();
for (const c of claims.remainingPool) pool.set(c.district, (pool.get(c.district) ?? 0) + 1);
console.log(`sample pool (all remaining note claims): ${[...pool].map(([d, n]) => `${d} ${n}`).join(', ')}`);
