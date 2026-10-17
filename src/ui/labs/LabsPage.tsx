import { useState } from 'react';
import { loadAllLabs } from '../../labs/load';
import { exportLabNotes } from '../../labs/export';
import { LAB_META } from '../../labs/meta';
import { accountClock, suggestSchedule } from '../../game/lab';
import { hrefLab } from '../../lib/route';
import { useSaveStore, useSnapshot } from '../../save/context';
import { BillsBadge, PlanBadge } from './badges';
import { downloadText } from './download';

const hours = (min: number) => `${(min / 60).toFixed(1)} h`;

function AccountClock() {
  const store = useSaveStore();
  const { save } = useSnapshot();
  const today = store.today();
  const clock = accountClock(save.labs.accountCreated, today);
  const remaining = LAB_META.filter((l) => !save.labs.progress[l.id]?.completedAt).map((l) => ({ id: l.id, minutes: l.minutes }));
  const plan = clock && !clock.expired ? suggestSchedule(remaining, today, clock.daysLeft) : null;
  const title = (id: string) => LAB_META.find((l) => l.id === id)?.title ?? id;
  return (
    <section className="mt-4 rounded-2xl border-2 border-[var(--line)] bg-[rgba(11,26,43,0.6)] p-3 sm:p-4" aria-labelledby="clock-title" data-testid="account-clock">
      <h3 id="clock-title" className="text-xl font-semibold">
        Account clock
      </h3>
      <p className="mt-1 max-w-prose text-sm text-[var(--fg-muted)]">
        A Free plan account closes six months after it is created, or when its credits run out, whichever comes first. Enter the date you created your lab account (a date only, nothing else) to see how much of the window is left. The Billing and Cost Management console shows the real date and credit balance; trust it over this estimate.
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm font-semibold">
          Lab account created on
          <input
            type="date"
            className="min-h-11 rounded-lg border-2 border-[var(--line)] bg-transparent px-2"
            value={save.labs.accountCreated ?? ''}
            max={today}
            onChange={(e) => {
              store.setLabAccountCreated(e.target.value === '' ? null : e.target.value);
            }}
          />
        </label>
        {clock && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              store.setLabAccountCreated(null);
            }}
          >
            Clear the date
          </button>
        )}
      </div>
      {clock && (
        <div className="mt-3" data-testid="clock-status">
          <p className="font-semibold">
            {clock.expired ? 'The 6-month window is over: check the Billing console for what happened to the account.' : `${clock.daysLeft} day${clock.daysLeft === 1 ? '' : 's'} left of the 6-month window (ends ${clock.ends}).`}
          </p>
          <progress className="mt-1 h-3 w-full max-w-md" max={100} value={Math.round(clock.used * 100)} aria-label="Share of the 6-month window used" />
          {!clock.expired && plan === null && <p className="mt-2 text-sm">Less than a week is left: do only the labs you need, and clean up first.</p>}
          {plan && plan.length > 0 && (
            <div className="mt-2">
              <h4 className="font-semibold">A schedule that fits the labs you have left</h4>
              <ol className="mt-1 grid gap-1 text-sm" data-testid="schedule">
                {plan.map((w) => (
                  <li key={w.start}>
                    From {w.start}: {w.labs.map((l) => title(l.id)).join('; ')} ({hours(w.minutes)})
                  </li>
                ))}
              </ol>
            </div>
          )}
          {plan && plan.length === 0 && <p className="mt-2 text-sm">Every lab is complete.</p>}
        </div>
      )}
    </section>
  );
}

export default function LabsPage() {
  const store = useSaveStore();
  const { save } = useSnapshot();
  const [busy, setBusy] = useState(false);
  const total = LAB_META.reduce((n, l) => n + l.minutes, 0);
  const done = LAB_META.filter((l) => save.labs.progress[l.id]?.completedAt).length;

  const exportAll = () => {
    setBusy(true);
    void loadAllLabs().then((labs) => {
      downloadText('region-builder-lab-notes.txt', exportLabNotes(labs.map((lab) => ({ lab, progress: store.getSnapshot().save.labs.progress[lab.id] })), store.today()));
      setBusy(false);
    });
  };

  return (
    <section aria-labelledby="labs-title">
      <h2 id="labs-title" className="text-3xl font-semibold">
        Hands-on labs
      </h2>
      <p className="mt-2 max-w-prose">
        {LAB_META.length} labs for your own AWS account, in the recommended order ({hours(total)} in all; {done} complete). Labs are self-reported practice: finishing one earns fixed XP and a 3-question debrief, but never commissions a building. Use a dedicated lab account, separate from your portfolio account, and finish each lab&rsquo;s cleanup and verification before you move on.
      </p>
      <p className="mt-2 max-w-prose text-sm text-[var(--fg-muted)]">
        Claude Code could not run these labs for you: they were written from AWS documentation and checked against it, not tested in an account. If a step does not match your screen, use <strong>Report a problem</strong> on that step.
      </p>
      <AccountClock />
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={exportAll} disabled={busy} data-testid="export-all-notes">
          Export all lab notes
        </button>
      </div>
      <ol className="mt-4 grid gap-3" data-testid="lab-list">
        {LAB_META.map((l) => {
          const p = save.labs.progress[l.id];
          const ticked = l.steps === 0 ? 0 : Object.keys(p?.steps ?? {}).length;
          const needs = l.needs.map((id) => LAB_META.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x);
          return (
            <li key={l.id} className="rounded-2xl border-2 border-[var(--line)] bg-[rgba(11,26,43,0.6)] p-3 sm:p-4" data-testid="lab-item">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip">Lab {l.n}</span>
                <a className="inline-flex min-h-11 items-center text-xl font-semibold underline underline-offset-4" href={hrefLab(l.id)}>
                  {l.title}
                </a>
                {p?.completedAt && <span className="chip border-2 border-[#4ade80]">Complete</span>}
              </div>
              <p className="mt-1 max-w-prose">{l.goal}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <PlanBadge plan={l.plan} />
                {l.billable.map((b) => (
                  <BillsBadge key={b} resource={b} />
                ))}
                <span className="chip">{l.minutes} min</span>
                <span className="chip">
                  {ticked} of {l.steps} steps ticked
                </span>
              </div>
              {needs.length > 0 && (
                <p className="mt-2 text-sm text-[var(--fg-muted)]">
                  Do first: {needs.map((n) => `Lab ${n.n}`).join(', ')}.
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
