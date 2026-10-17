import { SERVICE_PLANS } from '../../../content/labs/services';
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

export function PlanExplain({ plan, services }: { plan: PlanFit; services: readonly string[] }) {
  const unconfirmed = services.filter((s) => (SERVICE_PLANS[s]?.plan ?? 'unconfirmed') === 'unconfirmed');
  const paid = services.filter((s) => SERVICE_PLANS[s]?.plan === 'paid');
  return (
    <p className="mt-1 max-w-prose text-sm text-[var(--fg-muted)]">
      {plan === 'free' && 'Every service this lab uses is confirmed on the Free plan by what AWS publishes.'}
      {plan === 'paid' && `Needs a Paid plan: ${paid.join(', ')} is not available on the Free plan (a Free plan account upgrades itself when it uses it). Use a throwaway account.`}
      {plan === 'unconfirmed' && `AWS’s published Free plan information does not confirm ${unconfirmed.join(', ')}. Check the Free Tier page for your account before you start; the app does not guess.`}
    </p>
  );
}

export function BillsBadge({ resource, basis }: { resource: string; basis?: string }) {
  return (
    <span className="chip border-2 border-[#f87171]" data-testid="bills-badge" title={basis}>
      Bills while running: {resource}
    </span>
  );
}
