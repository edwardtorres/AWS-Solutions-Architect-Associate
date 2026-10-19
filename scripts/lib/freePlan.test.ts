import { describe, expect, it } from 'vitest';
import { FULL_NAMES, SERVICE_ALIAS, SERVICE_PLANS, SNAPSHOT_OFFERS, planOf, planOfOffer, unmatchedServices } from '../../content/labs/services';
import { diffOffers, isEmptyDiff, parseOffers, totalOf } from './freePlan';

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
