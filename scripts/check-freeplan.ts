/**
 * npm run check:freeplan
 * Re-renders https://aws.amazon.com/free/ and compares it with content/labs/free-plan-snapshot.json: reports offers added, removed
 * and plan labels changed, and which labs' badges that affects. Exit 1 on any change (then run free-plan-snapshot.ts, review the
 * diff and the lab badges). Exit 2 when the page could not be reached for network reasons (a warning, not a change). Network.
 */
import { readFileSync } from 'node:fs';
import { diffOffers, isEmptyDiff, renderOffers, type Snapshot } from './lib/freePlan.ts';
import { loadLabs } from './lib/loadLabs.ts';
import { EXIT_CHANGED, EXIT_NETWORK, isNetworkFailure } from './lib/network.ts';
import { aliasFor } from '../content/labs/services.ts';

const saved = JSON.parse(readFileSync(new URL('../content/labs/free-plan-snapshot.json', import.meta.url), 'utf8')) as Snapshot;
let now: Awaited<ReturnType<typeof renderOffers>>;
try {
  now = await renderOffers();
} catch (e) {
  if (!isNetworkFailure(e)) throw e;
  console.error(`check:freeplan: network warning, not a change: ${(e as Error).message.split('\n')[0]}`);
  process.exit(EXIT_NETWORK);
}
if (now.total === null || now.offers.length !== now.total) {
  console.error(`check:freeplan FAILED: the page says ${now.total ?? 'an unknown number of'} offers but ${now.offers.length} were extracted (layout changed).`);
  process.exit(EXIT_CHANGED);
}
const d = diffOffers(saved.offers, now.offers);
if (isEmptyDiff(d)) {
  console.log(`check:freeplan OK: ${now.offers.length} offers, no change since the snapshot of ${saved.capturedAt}`);
  process.exit(0);
}
console.error(`check:freeplan: the Free Tier page changed since ${saved.capturedAt}:`);
for (const o of d.added) console.error(`  + ${o.name}: ${o.label}`);
for (const o of d.removed) console.error(`  - ${o.name}: ${o.label}`);
for (const c of d.changed) console.error(`  ~ ${c.name}: "${c.from}" -> "${c.to}"`);
const touched = new Set([...d.added, ...d.removed].map((o) => o.name).concat(d.changed.map((c) => c.name)));
const { labs } = await loadLabs();
const hit = labs.filter((l) => l.services.some((s) => touched.has(aliasFor(s) ?? '')));
if (hit.length > 0) console.error(`Labs whose badge may change: ${hit.map((l) => l.id).join(', ')}`);
process.exit(EXIT_CHANGED);
