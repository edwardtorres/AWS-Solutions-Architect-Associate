/**
 * npx tsx scripts/report-alias.ts
 * Prints, for every lab, each service, the Free Tier card it is matched to, that card's label and description, and flags any match
 * that is not an exact service. Offline (reads content/labs/free-plan-snapshot.json).
 */
import { FULL_NAMES, SERVICE_ALIAS, SNAPSHOT_OFFERS, SERVICE_PLANS, planOf, unmatchedServices } from '../content/labs/services.ts';
import { PLAN_LABEL } from '../src/labs/types.ts';
import { loadLabs } from './lib/loadLabs.ts';

const { labs } = await loadLabs();
const flags: string[] = [];
for (const l of labs) {
  console.log(`\nLab ${l.n}. ${l.title}  =>  ${PLAN_LABEL[planOf(l.services)]}`);
  for (const s of l.services) {
    const alias = SERVICE_ALIAS[s];
    const p = SERVICE_PLANS[s];
    if (alias === undefined) {
      console.log(`  ${s} -> (not in the alias table) -> not confirmed`);
      flags.push(`Lab ${l.n}: ${s} is not in the alias table`);
    } else if (alias === null) console.log(`  ${s} -> no card on the page -> not confirmed`);
    else {
      const card = SNAPSHOT_OFFERS.find((o) => o.name.toLowerCase() === alias.toLowerCase());
      const exact = alias === (FULL_NAMES[s] ?? s);
      console.log(`  ${s} -> "${alias}" (${card?.category ?? '?'}) -> ${card?.label ?? 'no such card'}${exact ? '' : '   <-- NOT AN EXACT SERVICE MATCH'}${FULL_NAMES[s] ? '   [full name]' : ''}`);
      console.log(`      card says: ${(card?.description ?? '').slice(0, 110)}`);
      if (!exact) flags.push(`Lab ${l.n}: ${s} matched to "${alias}"`);
      if (!card) flags.push(`Lab ${l.n}: ${s} -> "${alias}" has no card`);
    }
    void p;
  }
  const un = unmatchedServices(l.services);
  if (un.length) console.log(`  unmatched: ${un.join(', ')}`);
}
console.log(`\nFlags: ${flags.length === 0 ? 'none' : '\n  ' + flags.join('\n  ')}`);
