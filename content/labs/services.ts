import type { PlanFit } from '../../src/labs/types';
import snapshot from './free-plan-snapshot.json';

/**
 * Plan availability per service, taken from the dated snapshot of https://aws.amazon.com/free/ (content/labs/free-plan-snapshot.json,
 * written by `npx tsx scripts/free-plan-snapshot.ts`; `npm run check:freeplan` reports changes). Each card on that page carries
 * "Available on both plans" or "Paid plan exclusive". A service is matched to its card through the alias table below; a service with
 * no card stays "not confirmed" (never guessed). The plan badge of a lab is derived from its services: Paid plan only if any is
 * paid, Free plan compatible if all are free, otherwise not confirmed, with the unmatched services listed.
 */
export type Evidence = 'snapshot' | 'none';

export interface ServicePlan {
  plan: PlanFit;
  evidence: Evidence;
  /** The card's name on the Free Tier page, when matched. */
  alias: string | null;
  /** The card's label, verbatim. */
  label: string | null;
}

/** Our service name to the name of its card on the Free Tier page; null when the page has no card for it. */
export const SERVICE_ALIAS: Record<string, string | null> = {
  'AWS Backup': 'AWS Backup',
  'AWS Budgets': 'AWS Budgets',
  'AWS Certificate Manager': 'AWS Certificate Manager',
  'AWS CloudFormation': 'AWS CloudFormation',
  'AWS CloudShell': 'AWS CloudShell',
  'AWS CloudTrail': 'AWS CloudTrail',
  'AWS Compute Optimizer': 'AWS Compute Optimizer',
  'AWS Config': 'AWS Config',
  'AWS Cost Explorer': 'AWS Cost Explorer',
  'AWS Glue': 'AWS Glue',
  'AWS IAM': null,
  'AWS IAM Identity Center': null,
  'AWS KMS': 'AWS Key Management Service',
  'AWS Lambda': 'AWS Lambda',
  'AWS Organizations': 'AWS Organizations',
  'AWS Systems Manager': 'AWS Systems Manager',
  'AWS Trusted Advisor': null,
  'Amazon API Gateway': 'Amazon API Gateway',
  'Amazon Athena': 'Amazon Athena',
  'Amazon Aurora': 'Amazon Aurora',
  'Amazon CloudFront': 'Amazon CloudFront',
  'Amazon CloudWatch': 'Amazon CloudWatch',
  'Amazon DynamoDB': 'Amazon DynamoDB',
  'Amazon EC2': 'Amazon EC2',
  'Amazon EC2 Auto Scaling': null,
  'Amazon EventBridge': 'Amazon EventBridge',
  'Amazon RDS': 'Amazon RDS',
  'Amazon Route 53': 'Amazon Route 53',
  'Amazon S3': 'Amazon S3',
  'Amazon SNS': 'Amazon SNS',
  'Amazon SQS': 'Amazon SQS',
  'Amazon VPC': 'Amazon Virtual Private Cloud',
  'Elastic Load Balancing': 'Elastic Load Balancing',
};

/**
 * The only aliases that differ from our service name, each the full name of the same service (the card description confirms it).
 * Anything else must match its service name exactly; `scripts/lib/freePlan.test.ts` enforces this, so a neighbouring service's card
 * (for example the EC2 card for a VPC lab) can never count as evidence.
 */
export const FULL_NAMES: Record<string, string> = {
  'AWS KMS': 'AWS Key Management Service',
  'Amazon VPC': 'Amazon Virtual Private Cloud',
};

export const aliasFor = (service: string): string | null => SERVICE_ALIAS[service] ?? null;

export const SNAPSHOT_DATE: string = snapshot.capturedAt;
export const SNAPSHOT_OFFERS: readonly { name: string; category: string; label: string; description?: string }[] = snapshot.offers;

const normLabel = (label: string): PlanFit => {
  const l = label.toLowerCase();
  if (l.includes('paid plan exclusive')) return 'paid';
  if (l.includes('available on both plans')) return 'free';
  return 'unconfirmed';
};

/** Plan of one card by name (case-insensitive); "unconfirmed" when absent or labelled in a way this code does not know. */
export function planOfOffer(name: string): { plan: PlanFit; label: string | null } {
  const offers = SNAPSHOT_OFFERS.filter((o) => o.name.toLowerCase() === name.toLowerCase());
  if (offers.length === 0) return { plan: 'unconfirmed', label: null };
  const plans = new Set(offers.map((o) => normLabel(o.label)));
  // Duplicated cards that disagree are not guessed at.
  if (plans.size !== 1) return { plan: 'unconfirmed', label: offers.map((o) => o.label).join(' / ') };
  return { plan: [...plans][0] as PlanFit, label: (offers[0] as { label: string }).label };
}

export const SERVICE_PLANS: Record<string, ServicePlan> = Object.fromEntries(
  Object.entries(SERVICE_ALIAS).map(([service, alias]) => {
    if (alias === null) return [service, { plan: 'unconfirmed', evidence: 'none', alias: null, label: null } satisfies ServicePlan];
    const { plan, label } = planOfOffer(alias);
    return [service, { plan, evidence: plan === 'unconfirmed' ? 'none' : 'snapshot', alias, label } satisfies ServicePlan];
  }),
);

export function planOf(services: readonly string[]): PlanFit {
  const plans = services.map((s) => SERVICE_PLANS[s]?.plan ?? 'unconfirmed');
  if (plans.includes('paid')) return 'paid';
  return plans.length > 0 && plans.every((p) => p === 'free') ? 'free' : 'unconfirmed';
}

/** The services of a lab that have no matching card (or no clear label) on the Free Tier page. */
export const unmatchedServices = (services: readonly string[]): string[] => services.filter((s) => (SERVICE_PLANS[s]?.plan ?? 'unconfirmed') === 'unconfirmed');
