import { SERVICE_PLANS, SNAPSHOT_DATE, unmatchedServices } from '../../../content/labs/services';
import { PLAN_LABEL, type PlanFit } from '../../labs/types';

const PLAN_CLASS: Record<PlanFit, string> = {
  free: 'border-[#4ade80]',
  paid: 'border-[#f87171]',
  unconfirmed: 'border-[var(--accent)]',
};

/** The plan badge. The text carries the meaning; the border colour is only a hint. */
export function PlanBadge({ plan }: { plan: PlanFit }) {
  return (
    <span className={`chip border-2 ${PLAN_CLASS[plan]}`} data-testid="plan-badge" data-plan={plan}>
      {PLAN_LABEL[plan]}
    </span>
  );
}

export function PlanExplain({ plan, services, billable = false }: { plan: PlanFit; services: readonly string[]; billable?: boolean }) {
  const unconfirmed = unmatchedServices(services);
  const paid = services.filter((s) => SERVICE_PLANS[s]?.plan === 'paid');
  return (
    <p className="mt-1 max-w-prose text-sm text-[var(--fg-muted)]">
      {plan === 'free' &&
        `Every service this lab uses is labelled “Available on both plans” on the AWS Free Tier page (checked ${SNAPSHOT_DATE}).${billable ? ' Its “bills while running” steps use your credits, and a Free plan account closes when its credits are used, so keep them optional and clean up.' : ''}`}
      {plan === 'paid' &&
        `Needs a Paid plan: ${paid.join(', ')} ${paid.length === 1 ? 'is' : 'are'} labelled “Paid plan exclusive” on the AWS Free Tier page (checked ${SNAPSHOT_DATE}). Use a throwaway account.${unconfirmed.length > 0 ? ` Also not on the page: ${unconfirmed.join(', ')}.` : ''}`}
      {plan === 'unconfirmed' &&
        `Not confirmed: the AWS Free Tier page (checked ${SNAPSHOT_DATE}) has no card for ${unconfirmed.join(', ')}. Check the Free Tier page for your account before you start; the app does not guess.`}
    </p>
  );
}

/** Labels something that uses a feature newer than the SAA-C03 exam guide (August 2022). */
export function NewerBadge() {
  return (
    <span className="chip" data-kind="newer" data-testid="newer-badge" title="This feature was introduced after the SAA-C03 exam guide was written, so the exam may still expect the older answer.">
      Newer than the exam guide
    </span>
  );
}

export function BillsBadge({ resource, basis }: { resource: string; basis?: string }) {
  return (
    <span className="chip border-2 border-[#f87171]" data-testid="bills-badge" title={basis}>
      Bills while running: {resource}
    </span>
  );
}
