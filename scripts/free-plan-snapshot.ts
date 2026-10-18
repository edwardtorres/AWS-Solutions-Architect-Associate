/**
 * npx tsx scripts/free-plan-snapshot.ts
 * Renders https://aws.amazon.com/free/ in Chromium (the page builds its offer list with scripts), expands every "Show N more" button and
 * saves each offer's name, category and plan label to content/labs/free-plan-snapshot.json with today's date. Network. The lab plan
 * badges are derived from this file (content/labs/services.ts); `npm run check:freeplan` re-renders the page and reports changes.
 */
import { writeFileSync } from 'node:fs';
import { renderOffers } from './lib/freePlan.ts';

const snap = await renderOffers();
if (snap.total === null || snap.offers.length !== snap.total) {
  console.error(`The page says ${snap.total ?? 'an unknown number of'} offers but ${snap.offers.length} were extracted: the page layout changed. Nothing was written.`);
  process.exit(1);
}
snap.offers.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(new URL('../content/labs/free-plan-snapshot.json', import.meta.url), JSON.stringify(snap, null, 1) + '\n');
console.log(`Saved ${snap.offers.length} offers (${snap.capturedAt}) to content/labs/free-plan-snapshot.json`);
