import { describe, expect, it } from 'vitest';
import { FULL_NAMES, SERVICE_ALIAS, SERVICE_PLANS, SNAPSHOT_OFFERS, planOf, planOfOffer, unmatchedServices } from '../../content/labs/services';
import { confirmDiffs, diffOffers, isEmptyDiff, mergeConfirmed, parseOffers, totalOf, type Offer } from './freePlan';

const FIXTURE = `Explore our offers
Filter
Displaying 1-8 (3)
Compute
Available on both plans
Amazon EC2

Resizable compute capacity in the Cloud.

Learn more
Agentic AI
Paid plan exclusive
Amazon Bedrock AgentCore

Build, deploy, and operate agents.

Learn more
Security
Paid Plan exclusive
AWS Organizations

Centrally manage accounts.

Learn more
Show 8 more`;

describe('Free Tier page parsing', () => {
  it('extracts category, label, name and description from each card', () => {
    expect(parseOffers(FIXTURE)).toEqual([
      { category: 'Compute', label: 'Available on both plans', name: 'Amazon EC2', description: 'Resizable compute capacity in the Cloud.' },
      { category: 'Agentic AI', label: 'Paid plan exclusive', name: 'Amazon Bedrock AgentCore', description: 'Build, deploy, and operate agents.' },
      { category: 'Security', label: 'Paid Plan exclusive', name: 'AWS Organizations', description: 'Centrally manage accounts.' },
    ]);
    expect(totalOf(FIXTURE)).toBe(3);
    expect(totalOf('nothing here')).toBeNull();
  });

  it('reports added, removed and relabelled offers', () => {
    const before = parseOffers(FIXTURE);
    expect(isEmptyDiff(diffOffers(before, before))).toBe(true);
    const after = [{ category: 'Compute', label: 'Paid plan exclusive', name: 'Amazon EC2', description: 'Resizable compute capacity in the Cloud.' }, before[1]!, { category: 'x', label: 'Available on both plans', name: 'Amazon S3' }];
    const d = diffOffers(before, after);
    expect(d.added.map((o) => o.name)).toEqual(['Amazon S3']);
    expect(d.removed.map((o) => o.name)).toEqual(['AWS Organizations']);
    expect(d.changed).toEqual([{ name: 'Amazon EC2', from: 'Available on both plans', to: 'Paid plan exclusive' }]);
  });
});

describe('the saved snapshot and the lab plan badges', () => {
  it('has every alias pointing at a card, and "Paid Plan exclusive" counts as paid whatever its case', () => {
    expect(SNAPSHOT_OFFERS.length).toBeGreaterThan(100);
    for (const [service, alias] of Object.entries(SERVICE_ALIAS)) if (alias) expect(SNAPSHOT_OFFERS.some((o) => o.name.toLowerCase() === alias.toLowerCase()), `${service} -> ${alias}`).toBe(true);
    expect(SERVICE_PLANS['AWS Organizations']?.plan).toBe('paid');
  });
  it('derives free only when every service is labelled available, paid when any is exclusive, otherwise unconfirmed', () => {
    expect(planOf(['Amazon EC2', 'Amazon S3'])).toBe('free');
    expect(planOf(['Amazon EC2', 'AWS Organizations'])).toBe('paid');
    expect(planOf(['Amazon EC2', 'AWS IAM'])).toBe('unconfirmed');
    expect(planOf(['Amazon EC2', 'AWS IAM', 'Amazon Athena'])).toBe('paid');
    expect(planOf([])).toBe('unconfirmed');
  });
  it('lists the services with no card and never guesses', () => {
    expect(unmatchedServices(['Amazon EC2', 'AWS IAM', 'AWS Trusted Advisor'])).toEqual(['AWS IAM', 'AWS Trusted Advisor']);
    expect(planOfOffer('A service that does not exist')).toEqual({ plan: 'unconfirmed', label: null });
    expect(SERVICE_PLANS['AWS IAM']).toMatchObject({ plan: 'unconfirmed', alias: null, evidence: 'none' });
  });
});

describe('alias table', () => {
  it('matches a service only to its own card: the exact name, or its documented full name', () => {
    for (const [service, alias] of Object.entries(SERVICE_ALIAS)) {
      if (alias === null) continue;
      expect(alias, service).toBe(FULL_NAMES[service] ?? service);
    }
  });
  it('never lets a neighbouring service stand in for another (VPC is not the EC2 card)', () => {
    expect(SERVICE_ALIAS['Amazon VPC']).not.toBe('Amazon EC2');
    expect(SERVICE_ALIAS['Amazon EC2 Auto Scaling']).toBeNull();
    expect(SERVICE_ALIAS['AWS IAM']).toBeNull();
  });
  it('points every alias at a card that exists in the snapshot', () => {
    for (const [service, alias] of Object.entries(SERVICE_ALIAS)) {
      if (alias !== null) expect(SNAPSHOT_OFFERS.some((o) => o.name.toLowerCase() === alias.toLowerCase()), service).toBe(true);
    }
  });
});

describe('an offer counts only when two consecutive renders agree', () => {
  const offer = (name: string, label = 'Available on both plans'): Offer => ({ name, category: 'Test', label });
  const base = [offer('Alpha'), offer('Beta'), offer('Gamma')];

  it('confirms an addition both renders report', () => {
    const d = diffOffers(base, [...base, offer('Delta')]);
    const c = confirmDiffs(d, d);
    expect(c.diff.added.map((o) => o.name)).toEqual(['Delta']);
    expect(c.unstable).toEqual([]);
  });

  it('does not count an addition only one render reports, and names it as unstable', () => {
    const first = diffOffers(base, [...base, offer('Neptune')]);
    const second = diffOffers(base, [...base, offer('Re:Post')]);
    const c = confirmDiffs(first, second);
    expect(isEmptyDiff(c.diff)).toBe(true);
    expect(c.unstable.sort()).toEqual(['Neptune', 'Re:Post']);
  });

  it('confirms a removal only when both renders lack the offer', () => {
    const both = diffOffers(base, base.slice(0, 2));
    expect(confirmDiffs(both, both).diff.removed.map((o) => o.name)).toEqual(['Gamma']);
    const oneOnly = diffOffers(base, base.slice(0, 2));
    const other = diffOffers(base, base);
    expect(isEmptyDiff(confirmDiffs(oneOnly, other).diff)).toBe(true);
    expect(confirmDiffs(oneOnly, other).unstable).toEqual(['Gamma']);
  });

  it('confirms a relabel only when both renders give the same new label', () => {
    const relabel = (label: string) => diffOffers(base, base.map((o) => (o.name === 'Beta' ? { ...o, label } : o)));
    expect(confirmDiffs(relabel('Paid plan exclusive'), relabel('Paid plan exclusive')).diff.changed).toHaveLength(1);
    const split = confirmDiffs(relabel('Paid plan exclusive'), relabel('Available on both plans'));
    expect(split.diff.changed).toEqual([]);
    expect(split.unstable).toEqual(['Beta']);
  });
});

describe('the snapshot keeps what the renders agree on', () => {
  const offer = (name: string, label = 'Available on both plans'): Offer => ({ name, category: 'Test', label });

  it('takes the agreed list: a removal both renders show is dropped', () => {
    const snap = [offer('Alpha'), offer('Gamma')];
    const agreed = [offer('Alpha')];
    expect(mergeConfirmed(snap, agreed, agreed)).toEqual({ offers: [offer('Alpha')], unstable: [] });
  });

  it('takes a relabel both renders agree on', () => {
    const snap = [offer('Alpha', 'Paid plan exclusive')];
    const agreed = [offer('Alpha', 'Available on both plans')];
    expect(mergeConfirmed(snap, agreed, agreed).offers).toEqual([offer('Alpha', 'Available on both plans')]);
  });

  it('keeps the previous entry for an offer the renders disagree about, and names it', () => {
    const snap = [offer('Neptune', 'Paid plan exclusive')];
    const first = [offer('Neptune', 'Paid plan exclusive')];
    const second: Offer[] = [];
    const merged = mergeConfirmed(snap, first, second);
    expect(merged.offers).toEqual([offer('Neptune', 'Paid plan exclusive')]);
    expect(merged.unstable).toEqual(['Neptune']);
  });

  it('keeps every copy of a card the page shows twice', () => {
    const copy = offer('Budgets');
    const both = [copy, { ...copy }];
    const merged = mergeConfirmed([...both], both, both);
    expect(merged.offers).toHaveLength(2);
    expect(merged.unstable).toEqual([]);
  });

  it('leaves out an addition only one render shows', () => {
    const merged = mergeConfirmed([], [offer('Re:Post')], []);
    expect(merged.offers).toEqual([]);
    expect(merged.unstable).toEqual(['Re:Post']);
  });
});
