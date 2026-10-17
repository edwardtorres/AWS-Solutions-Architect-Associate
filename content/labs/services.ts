import type { PlanFit } from '../../src/labs/types';

/**
 * Plan availability per service, checked against what AWS publishes. The plan badge of a lab is derived from the
 * services it uses: Paid plan only if any is `paid`, Free plan compatible if all are `free`, otherwise not confirmed.
 *
 * - `docs-table`: the service has an "Always Free" offering in the Billing guide's "Trackable AWS Free Tier services" table,
 *   and "Free account plan accounts only have Always Free offerings active" (verified by check:links).
 * - `rendered-page`: the service shows "Available on both plans" on the rendered AWS Free Tier page. That page builds its offer
 *   list with scripts, so the offline checker cannot fetch it; recorded in content/needs-verification.json.
 * - `rule`: a documented rule excludes the service from the Free plan (verified by check:links).
 * - `none`: no published statement found; the lab says the availability is not confirmed rather than guessing.
 */
export type Evidence = 'docs-table' | 'rendered-page' | 'rule' | 'none';

export interface ServicePlan {
  plan: PlanFit;
  evidence: Evidence;
  /** Source id and verbatim quote for `docs-table` and `rule`. */
  src?: string;
  quote?: string;
}

const TABLE = { src: 'free-tier-usage', quote: 'Free account plan accounts only have Always Free offerings active.' };
const docs = (): ServicePlan => ({ plan: 'free', evidence: 'docs-table', ...TABLE });
const rendered: ServicePlan = { plan: 'free', evidence: 'rendered-page' };
const unknown: ServicePlan = { plan: 'unconfirmed', evidence: 'none' };

export const SERVICE_PLANS: Record<string, ServicePlan> = {
  'AWS Budgets': docs(),
  'AWS CloudFormation': docs(),
  'AWS Glue': docs(),
  'AWS KMS': docs(),
  'AWS Lambda': docs(),
  'Amazon CloudFront': docs(),
  'Amazon CloudWatch': docs(),
  'Amazon DynamoDB': docs(),
  'Amazon EventBridge': docs(),
  'Amazon Route 53': docs(),
  'Amazon SNS': docs(),
  'Amazon SQS': docs(),
  'AWS Systems Manager': docs(),
  'Amazon EC2': rendered,
  'Amazon S3': rendered,
  'Amazon RDS': rendered,
  'Amazon Aurora': rendered,
  'AWS Organizations': {
    plan: 'paid',
    evidence: 'rule',
    src: 'free-tier-plans',
    quote: 'Free account plans will automatically upgrade to paid plan if you join AWS Organizations, set up an AWS Control Tower landing zone, join AWS Partner Network, create a Professional Services contract, enroll in an Enterprise Agreement with AWS, purchase an AWS Skill Builder Team subscription, or designate the AWS account as HIPAA or SEC compliant.',
  },
  'AWS Backup': unknown,
  'AWS CloudShell': unknown,
  'AWS CloudTrail': unknown,
  'AWS Compute Optimizer': unknown,
  'AWS Config': unknown,
  'AWS Cost Explorer': unknown,
  'AWS Certificate Manager': unknown,
  'AWS IAM': unknown,
  'AWS IAM Identity Center': unknown,
  'AWS Trusted Advisor': unknown,
  'Amazon API Gateway': unknown,
  'Amazon Athena': unknown,
  'Amazon EC2 Auto Scaling': unknown,
  'Amazon VPC': unknown,
  'Elastic Load Balancing': unknown,
};

export function planOf(services: readonly string[]): PlanFit {
  const plans = services.map((s) => SERVICE_PLANS[s]?.plan ?? 'unconfirmed');
  if (plans.includes('paid')) return 'paid';
  return plans.length > 0 && plans.every((p) => p === 'free') ? 'free' : 'unconfirmed';
}
