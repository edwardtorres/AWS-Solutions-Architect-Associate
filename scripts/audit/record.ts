/**
 * npx tsx scripts/audit/record.ts <batch-file> <verdicts.json>
 * Appends a checker's verdicts to the ledger (docs/reviews/step-8/ledger/<group>.jsonl). verdicts.json is an array of
 * { id, verdict, reason, fix? }. Only ids that belong to the batch are accepted, every id of the batch must be answered,
 * and an id already in the ledger is skipped (so a re-run never redoes or duplicates work).
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';

export const VERDICTS = ['confirmed', 'wrong', 'unsupported', 'outdated', 'source-changed'] as const;
export type Verdict = (typeof VERDICTS)[number];
export interface LedgerLine {
  id: string;
  group: string;
  verdict: Verdict;
  reason: string;
  fix?: string;
  by: string;
  at: string;
}

export const ledgerDir = new URL('../../docs/reviews/step-8/ledger/', import.meta.url);
export const ledgerPath = (group: string) => new URL(`${group}.jsonl`, ledgerDir);
export function readLedger(group: string): LedgerLine[] {
  const p = ledgerPath(group);
  return existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as LedgerLine) : [];
}

if (process.argv[1]?.endsWith('record.ts')) {
  const [batchFile, verdictFile] = process.argv.slice(2);
  if (!batchFile || !verdictFile) {
    console.error('usage: record.ts <batch-file> <verdicts.json>');
    process.exit(2);
  }
  const batch = JSON.parse(readFileSync(batchFile, 'utf8')) as { id: string; group: string; claims: { id: string }[] };
  const given = JSON.parse(readFileSync(verdictFile, 'utf8')) as { id: string; verdict: string; reason: string; fix?: string }[];
  const ids = new Set(batch.claims.map((c) => c.id));
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const v of given) {
    if (!ids.has(v.id)) problems.push(`${v.id}: not in this batch`);
    if (!(VERDICTS as readonly string[]).includes(v.verdict)) problems.push(`${v.id}: verdict "${v.verdict}" is not one of ${VERDICTS.join(', ')}`);
    if (!v.reason || v.reason.trim().length < 8) problems.push(`${v.id}: reason is missing`);
    if (v.verdict !== 'confirmed' && !v.fix) problems.push(`${v.id}: a ${v.verdict} verdict needs a proposed fix`);
    if (seen.has(v.id)) problems.push(`${v.id}: answered twice`);
    seen.add(v.id);
  }
  for (const id of ids) if (!seen.has(id)) problems.push(`${id}: no verdict`);
  if (problems.length) {
    console.error(`Nothing recorded. ${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  mkdirSync(ledgerDir, { recursive: true });
  const done = new Set(readLedger(batch.group).map((l) => l.id));
  let n = 0;
  for (const v of given) {
    if (done.has(v.id)) continue;
    const line: LedgerLine = { id: v.id, group: batch.group, verdict: v.verdict as Verdict, reason: v.reason.trim(), ...(v.fix ? { fix: v.fix } : {}), by: batch.id, at: new Date().toISOString().slice(0, 10) };
    appendFileSync(ledgerPath(batch.group), JSON.stringify(line) + '\n');
    n += 1;
  }
  console.log(`Recorded ${n} verdict(s) for ${batch.id} (${given.length - n} already in the ledger).`);
}
