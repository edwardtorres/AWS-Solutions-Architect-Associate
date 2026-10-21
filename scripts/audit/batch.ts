/**
 * npx tsx scripts/audit/batch.ts <group> [--size 20] [--district d] [--only prefix]
 * Splits the claims of a group that have no ledger entry yet into batch files under .cache/audit/batches/ and lists them.
 * A batch file holds the instructions' data: claims with their quotes and page passages. Resume = run again: finished claims are skipped.
 */
import { mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { readLedger } from './record.ts';

const [group, ...rest] = process.argv.slice(2);
if (!group) {
  console.error('usage: batch.ts <group> [--size 20] [--district d] [--only prefix]');
  process.exit(2);
}
const opt = (name: string) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
};
const size = Number(opt('--size') ?? 20);
const district = opt('--district');
const only = opt('--only');
const file = group === 'POOL' ? '../pool.jsonl' : `${group}.jsonl`;
const all = readFileSync(new URL(`../../.cache/audit/claims/${file}`, import.meta.url), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as { id: string; district: string; cites: { found: boolean }[] });
const ledgerGroup = group === 'POOL' ? 'S-sample' : group;
const done = new Set(readLedger(ledgerGroup).map((l) => l.id));
let todo = all.filter((c) => !done.has(c.id));
if (district) todo = todo.filter((c) => c.district === district);
if (only) todo = todo.filter((c) => c.id.startsWith(only));
// Claims whose quote is gone from the page go first, then the rest in a stable order.
todo.sort((a, b) => Number(b.cites.some((x) => !x.found)) - Number(a.cites.some((x) => !x.found)));
const dir = new URL('../../.cache/audit/batches/', import.meta.url);
mkdirSync(dir, { recursive: true });
for (const f of readdirSync(dir)) if (f.startsWith(`${ledgerGroup}-`) && !f.endsWith('.verdicts.json')) rmSync(new URL(f, dir));
const out: string[] = [];
for (let i = 0; i < todo.length; i += size) {
  const id = `${ledgerGroup}-${String(i / size + 1).padStart(3, '0')}${district ? `-${district}` : ''}`;
  const claims = todo.slice(i, i + size);
  writeFileSync(new URL(`${id}.json`, dir), JSON.stringify({ id, group: ledgerGroup, claims }, null, 1));
  out.push(`${id} (${claims.length})`);
}
console.log(`${ledgerGroup}: ${all.length} claims, ${done.size} in the ledger, ${todo.length} to do in ${out.length} batch(es)`);
console.log(out.join('\n'));
