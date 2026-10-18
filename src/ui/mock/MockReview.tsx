import { useCallback, useState } from 'react';
import { hrefMock } from '../../lib/route';
import { useSaveStore, useSnapshot } from '../../save/context';
import { ExamClock } from './ExamClock';
import { useBank } from './useBank';

export default function MockReview() {
  const store = useSaveStore();
  const { save } = useSnapshot();
  const { bank, lookup } = useBank();
  const [confirming, setConfirming] = useState(false);
  const active = save.game.mock.active;

  const submit = useCallback(
    (expired: boolean) => {
      if (!bank) return;
      const out = store.finishMock(lookup, expired);
      if (out) window.location.hash = hrefMock('result', out.record.id);
    },
    [bank, lookup, store],
  );
  const expire = useCallback(() => {
    submit(true);
  }, [submit]);

  if (!active) {
    return (
      <section aria-labelledby="mock-review-title">
        <h2 id="mock-review-title" className="text-3xl font-semibold">
          Review screen
        </h2>
        <p className="mt-2">
          No mock is open. <a className="inline-link" href={hrefMock()}>Go to the mock exam page</a>.
        </p>
      </section>
    );
  }
  const unanswered = active.questionIds.filter((id) => !active.answers[id]);
  return (
    <section aria-labelledby="mock-review-title">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="mock-review-title" className="text-2xl font-semibold">
          Review screen
        </h2>
        <ExamClock active={active} onExpire={expire} />
      </div>
      <p className="mt-2 text-sm" data-testid="mock-review-counts">
        {active.questionIds.length - unanswered.length} answered, {unanswered.length} unanswered, {active.flags.length} flagged. Tap a number to jump to that question.
      </p>
      <ol className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-12" data-testid="mock-review-grid">
        {active.questionIds.map((id, i) => {
          const answered = !!active.answers[id];
          const flagged = active.flags.includes(id);
          return (
            <li key={id}>
              <a
                className="flex min-h-11 flex-col items-center justify-center rounded-lg border-2 px-1 text-sm font-semibold"
                data-answered={answered ? 'true' : 'false'}
                data-flagged={flagged ? 'true' : 'false'}
                href={hrefMock('run', i + 1)}
              >
                <span>
                  <span className="visually-hidden">Question </span>
                  {i + 1}
                </span>
                <span className="text-[0.7rem] font-normal">
                  {answered ? 'answered' : 'blank'}
                  {flagged ? ', flagged' : ''}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {unanswered.length > 0 && (
          <a className="btn" href={hrefMock('run', active.questionIds.indexOf(unanswered[0] as string) + 1)}>
            First unanswered
          </a>
        )}
        {active.flags.length > 0 && (
          <a className="btn" href={hrefMock('run', active.questionIds.indexOf(active.flags[0] as string) + 1)}>
            First flagged
          </a>
        )}
        {!confirming ? (
          <button
            type="button"
            className="btn"
            data-testid="mock-submit"
            disabled={!bank}
            onClick={() => {
              setConfirming(true);
            }}
          >
            Submit the exam
          </button>
        ) : (
          <span role="alertdialog" aria-label="Submit the exam?" className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-[var(--accent)] p-2">
            <span className="text-sm font-semibold">{unanswered.length > 0 ? `${unanswered.length} unanswered question${unanswered.length === 1 ? '' : 's'} will count as wrong. ` : ''}Submit now? You cannot change answers afterwards.</span>
            <button
              type="button"
              className="btn"
              data-testid="mock-submit-yes"
              onClick={() => {
                submit(false);
              }}
            >
              Yes, submit
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setConfirming(false);
              }}
            >
              Keep working
            </button>
          </span>
        )}
      </div>
    </section>
  );
}
