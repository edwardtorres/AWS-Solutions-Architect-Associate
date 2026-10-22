/**
 * npm run check:freeplan
 * Renders https://aws.amazon.com/free/ twice, one after the other, each time waiting until the offer list has stopped changing. An
 * offer counts as added, removed or relabelled only when both renders report the same change. An offer the renders disagree about
 * is an unstable read: named as a warning, never a finding. Exit 1 for a confirmed change (then run free-plan-snapshot.ts and review
 * the lab badges), 3 for an unstable read (a warning, not a change), 2 when the browser cannot reach the page, 0 when nothing changed.
 * Network.
 */
import { readFileSync } from 'node:fs';
import { confirmDiffs, diffOffers, isEmptyDiff, renderOffers, type Render, type Snapshot } from './lib/freePlan.ts';
import { loadLabs } from './lib/loadLabs.ts';
import { EXIT_CHANGED, EXIT_NETWORK, EXIT_OK, EXIT_UNSTABLE, isNetworkFailure } from './lib/network.ts';
import { aliasFor } from '../content/labs/services.ts';

const saved = JSON.parse(readFileSync(new URL('../content/labs/free-plan-snapshot.json', import.meta.url), 'utf8')) as Snapshot;

let first: Render;
let second: Render;
try {
  first = await renderOffers();
  second = await renderOffers();
} catch (e) {
  if (!isNetworkFailure(e)) throw e;
  console.error(`check:freeplan: network warning, not a change: ${(e as Error).message.split('\n')[0]}`);
  process.exit(EXIT_NETWORK);
}
for (const r of [first, second]) {
  if (r.total === null || r.offers.length !== r.total) {
    console.error(`check:freeplan FAILED: the page says ${r.total ?? 'an unknown number of'} offers but ${r.offers.length} were extracted (layout changed).`);
    process.exit(EXIT_CHANGED);
  }
}
if (!first.settled || !second.settled) {
  console.error('check:freeplan: unstable read: the offer list was still changing when it was read. Nothing is counted.');
  process.exit(EXIT_UNSTABLE);
}

const confirmed = confirmDiffs(diffOffers(saved.offers, first.offers), diffOffers(saved.offers, second.offers));
for (const name of confirmed.unstable) console.error(`unstable read: ${name} (the two renders disagree; not counted)`);
if (isEmptyDiff(confirmed.diff)) {
  if (confirmed.unstable.length > 0) {
    console.error(`check:freeplan: unstable read for ${confirmed.unstable.length} offer(s); no confirmed change.`);
    process.exit(EXIT_UNSTABLE);
  }
  console.log(`check:freeplan OK: ${first.offers.length} offers, no change since the snapshot of ${saved.capturedAt}`);
  process.exit(EXIT_OK);
}

const d = confirmed.diff;
console.error(`check:freeplan: confirmed change since ${saved.capturedAt} (both renders agree):`);
for (const o of d.added) console.error(`  + ${o.name}: ${o.label}`);
for (const o of d.removed) console.error(`  - ${o.name}: ${o.label}`);
for (const c of d.changed) console.error(`  ~ ${c.name}: "${c.from}" -> "${c.to}"`);
const touched = new Set([...d.added, ...d.removed].map((o) => o.name).concat(d.changed.map((c) => c.name)));
const { labs } = await loadLabs();
const hit = labs.filter((l) => l.services.some((s) => touched.has(aliasFor(s) ?? '')));
if (hit.length > 0) console.error(`Labs whose badge may change: ${hit.map((l) => l.id).join(', ')}`);
process.exit(EXIT_CHANGED);
