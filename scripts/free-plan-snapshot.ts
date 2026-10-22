/**
 * npx tsx scripts/free-plan-snapshot.ts
 * Renders https://aws.amazon.com/free/ twice, each time waiting until the offer list has stopped changing, and saves the state the
 * two renders agree on to content/labs/free-plan-snapshot.json. An offer the renders disagree about keeps its previous entry and is
 * named in the output. The lab plan badges are derived from this file (content/labs/services.ts). Network. Writes nothing when a read
 * did not settle or the page layout changed.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { mergeConfirmed, renderOffers, type Render, type Snapshot } from './lib/freePlan.ts';

const file = new URL('../content/labs/free-plan-snapshot.json', import.meta.url);
const saved = JSON.parse(readFileSync(file, 'utf8')) as Snapshot;
const reads: Render[] = [await renderOffers(), await renderOffers()];
for (const r of reads) {
  if (r.total === null || r.offers.length !== r.total) {
    console.error(`The page says ${r.total ?? 'an unknown number of'} offers but ${r.offers.length} were extracted: the page layout changed. Nothing was written.`);
    process.exit(1);
  }
}
if (reads.some((r) => !r.settled)) {
  console.error('unstable read: the offer list was still changing when it was read. Nothing was written.');
  process.exit(3);
}
const [first, second] = reads as [Render, Render];
const merged = mergeConfirmed(saved.offers, first.offers, second.offers);
merged.offers.sort((a, b) => a.name.localeCompare(b.name));
const next: Snapshot = { capturedAt: first.capturedAt, url: first.url, total: first.total, offers: merged.offers };
writeFileSync(file, JSON.stringify(next, null, 1) + '\n');
console.log(`Saved ${merged.offers.length} offers (${next.capturedAt}) to content/labs/free-plan-snapshot.json`);
if (merged.unstable.length > 0) console.log(`Unstable, previous entries kept: ${merged.unstable.join('; ')}`);
