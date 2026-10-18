import { useEffect, useState } from 'react';
import { AWS_PRACTICE_PAGE, FRESH_DAYS, FRESH_SHARE, MOCK_MINUTES, MOCK_QUESTIONS, READY_DOMAIN, READY_MOCKS, READY_OVERALL, clockText, freshnessReason, pctText, readyToBook, remainingMs, scoreOf } from '../../game/mock';
import { hrefMock } from '../../lib/route';
import { useSaveStore, useSnapshot } from '../../save/context';
import { useBank } from './useBank';

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function MockHome() {
  const store = useSaveStore();
  const { save } = useSnapshot();
  const { bank } = useBank();
  const [short, setShort] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) {
      void import('../../dev/mockShort').then((m) => {
        setShort(m.shortMockRequested());
      });
    }
  }, []);

  const mock = save.game.mock;
  const ready = readyToBook(mock.history);
  const active = mock.active;
  const answered = active ? Object.keys(active.answers).length : 0;
  const history = [...mock.history].reverse();

  return (
    <section aria-labelledby="mock-title">
      <h2 id="mock-title" className="text-3xl font-semibold">
        Mock exam
      </h2>
      <p className="mt-2 max-w-prose">
        {MOCK_QUESTIONS} questions in {MOCK_MINUTES} minutes, multiple choice and multiple response only, weighted 30 / 26 / 24 / 20 across the four domains (19 / 17 / 16 / 13 questions). You see no feedback until you submit; an unanswered question counts as wrong. The timer runs from the moment you start and keeps running if you close the app.
      </p>
      <p className="mt-2 max-w-prose text-sm" data-testid="mock-unscored-note">
        <strong>The real exam differs in one way:</strong> it has 65 questions of which only 50 are scored; the other 15 are unscored and are not identified. Here, all {MOCK_QUESTIONS} are scored.
      </p>
      <p className="mt-2 max-w-prose text-sm" data-testid="mock-scaled-note">
        <strong>A raw percentage is not your exam score.</strong> The real exam reports a scaled score from 100 to 1,000 and you need 720 to pass: a scaled score, not a percentage. Scoring is compensatory (you do not have to pass each section, only the exam as a whole), so no raw percentage here can predict your score exactly.
      </p>

      <section className="mt-4 rounded-2xl border-2 border-[var(--line)] bg-[rgba(11,26,43,0.6)] p-3 sm:p-4" aria-labelledby="ready-title" data-testid="ready-panel" data-ready={ready.ready ? 'true' : 'false'}>
        <h3 id="ready-title" className="text-xl font-semibold">
          {ready.ready ? 'Ready to book' : 'Not ready to book yet'}
        </h3>
        <p className="mt-1 max-w-prose text-sm">{ready.reason}</p>
        <p className="mt-1 max-w-prose text-sm text-[var(--fg-muted)]">
          The rule: the last {READY_MOCKS} mocks that count must each score at least {Math.round(READY_OVERALL * 100)}% overall with every domain at least {Math.round(READY_DOMAIN * 100)}%. A mock counts only if at least {Math.round(FRESH_SHARE * 100)}% of its questions were not answered in the {FRESH_DAYS} days before it started. This is a study signal, not a promise.
        </p>
        <p className="mt-1 max-w-prose text-sm">
          Check yourself against AWS&rsquo;s own material, which is linked from the{' '}
          <a className="inline-link" href={AWS_PRACTICE_PAGE} target="_blank" rel="noreferrer noopener">
            AWS Certified Solutions Architect &ndash; Associate page
          </a>
          : the <strong>Official Practice Question Set</strong> (to understand exam-style questions) and the <strong>Official Practice Exam</strong> (to assess your readiness).
        </p>
      </section>

      {active ? (
        <section className="mt-4 rounded-2xl border-2 border-[var(--accent)] bg-[rgba(245,185,66,0.1)] p-3 sm:p-4" aria-labelledby="active-title" data-testid="mock-active">
          <h3 id="active-title" className="text-xl font-semibold">
            A mock is in progress
          </h3>
          <p className="mt-1 text-sm" data-testid="mock-active-status">
            {answered} of {active.questionIds.length} answered, {active.flags.length} flagged. Time left: {clockText(remainingMs(active, new Date()))}.
          </p>
          <p className="mt-1 max-w-prose text-sm">{freshnessReason({ ...active, total: active.questionIds.length })} It used {active.reserveUsed} question{active.reserveUsed === 1 ? '' : 's'} held back for mocks.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a className="btn" href={hrefMock('run')} data-testid="mock-continue">
              Continue the mock
            </a>
            <a className="btn" href={hrefMock('review')}>
              Review screen
            </a>
            {!confirmDiscard ? (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setConfirmDiscard(true);
                }}
              >
                Discard this mock
              </button>
            ) : (
              <span role="alertdialog" aria-label="Discard this mock?" className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">Nothing from it will be recorded.</span>
                <button
                  type="button"
                  className="btn"
                  data-testid="mock-discard-yes"
                  onClick={() => {
                    store.discardMock();
                    setConfirmDiscard(false);
                  }}
                >
                  Yes, discard
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setConfirmDiscard(false);
                  }}
                >
                  Keep it
                </button>
              </span>
            )}
          </div>
        </section>
      ) : (
        <section className="mt-4" aria-labelledby="start-title">
          <h3 id="start-title" className="text-xl font-semibold">
            Start a mock
          </h3>
          <p className="mt-1 max-w-prose text-sm">
            The first two mocks draw from questions held back for mocks (no other mode shows them), so they are new to you. Later mocks use what is left of that set, then live questions, avoiding your last mock and the ones you answered in the last {FRESH_DAYS} days. Mocks never include questions about features newer than the exam guide. Mock answers earn XP, count in your readiness and never commission a building.
          </p>
          {problem && (
            <p role="alert" className="mt-2 rounded-xl border-2 border-[#f87171] p-3">
              {problem}
            </p>
          )}
          <button
            type="button"
            className="btn mt-2"
            data-testid="mock-start"
            disabled={!bank}
            onClick={() => {
              if (!bank) return;
              void store.startMock(bank, short).then((r) => {
                if (r.ok) window.location.hash = hrefMock('run');
                else setProblem(r.message);
              });
            }}
          >
            {short ? 'Start a short practice mock (10 questions, development only)' : `Start a mock exam (${MOCK_QUESTIONS} questions, ${MOCK_MINUTES} minutes)`}
          </button>
        </section>
      )}

      <h3 className="mt-6 text-2xl font-semibold">Your mocks</h3>
      {history.length === 0 ? (
        <p className="mt-2" data-testid="mock-history-empty">
          No mock finished yet.
        </p>
      ) : (
        <ol className="mt-2 grid gap-2" data-testid="mock-history">
          {history.map((m) => (
            <li key={m.id} className="rounded-xl border-2 border-[var(--line)] bg-[rgba(11,26,43,0.6)] p-3" data-testid="mock-history-item" data-counts={m.counts ? 'true' : 'false'}>
              <p className="flex flex-wrap items-center gap-2">
                <a className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4" href={hrefMock('result', m.id)}>
                  {pctText(m.correct, m.total)} ({m.correct} of {m.total})
                </a>
                <span className="text-sm text-[var(--fg-muted)]">{when(m.finishedAt)}</span>
                {m.short && <span className="chip">Short practice</span>}
                {m.expired && <span className="chip">Submitted by the timer</span>}
                <span className="chip border-2" data-kind="counts">
                  {m.counts ? 'Counts' : 'Did not count'}
                </span>
              </p>
              <p className="mt-1 text-sm">
                {['1', '2', '3', '4'].map((d) => `D${d} ${m.domains[d] ? pctText(m.domains[d][0], m.domains[d][1]) : '–'}`).join(' · ')}
                {` · overall ${Math.round(scoreOf(m) * 100)}%`}
              </p>
              <p className="mt-1 text-sm text-[var(--fg-muted)]" data-testid="mock-freshness">
                {freshnessReason(m)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
