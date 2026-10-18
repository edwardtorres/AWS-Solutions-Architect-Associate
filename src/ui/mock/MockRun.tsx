import { useCallback, useState } from 'react';
import { attemptRandom } from '../../lib/rng';
import { hrefMock } from '../../lib/route';
import { present } from '../../questions/present';
import { useSaveStore, useSnapshot } from '../../save/context';
import { ExamClock } from './ExamClock';
import { useBank } from './useBank';

const LETTERS = 'ABCDEFGH';

export default function MockRun({ number }: { number: number | null }) {
  const store = useSaveStore();
  const { save } = useSnapshot();
  const { bank, lookup } = useBank();
  const active = save.game.mock.active;

  const expire = useCallback(() => {
    if (!bank) return;
    const out = store.finishMock(lookup, true);
    if (out) window.location.hash = hrefMock('result', out.record.id);
  }, [bank, lookup, store]);

  // Without a number in the address the exam opens at the first blank question and stays there: answering must not move the page.
  const [opened] = useState<number>(() => {
    const first = store.getSnapshot().save.game.mock.active;
    const firstOpen = first ? first.questionIds.findIndex((id) => !first.answers[id]) : -1;
    return firstOpen === -1 ? 0 : firstOpen;
  });
  const index = active && number !== null && Number.isInteger(number) && number >= 1 && number <= active.questionIds.length ? number - 1 : opened;

  if (!active) {
    return (
      <section aria-labelledby="mock-run-title">
        <h2 id="mock-run-title" className="text-3xl font-semibold">
          Mock exam
        </h2>
        <p className="mt-2" data-testid="mock-none">
          No mock is open. <a className="inline-link" href={hrefMock()}>Go to the mock exam page</a>.
        </p>
      </section>
    );
  }
  if (!bank) return <p role="status">Loading questions…</p>;

  const id = active.questionIds[index] as string;
  const q = lookup(id);
  if (!q) return <p role="alert">A question of this mock is no longer in the bank. <a className="inline-link" href={hrefMock()}>Back</a>.</p>;
  const presented = present(q, attemptRandom(active.seed, q.id));
  const chosen = active.answers[id] ?? [];
  const single = q.format === 'mc';
  const flagged = active.flags.includes(id);
  const total = active.questionIds.length;
  const answeredCount = Object.keys(active.answers).length;

  const pick = (optionIndex: number) => {
    if (single) store.setMockAnswer(id, [optionIndex]);
    else store.setMockAnswer(id, chosen.includes(optionIndex) ? chosen.filter((x) => x !== optionIndex) : [...chosen, optionIndex]);
  };

  return (
    <section aria-labelledby="mock-run-title">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="mock-run-title" className="text-2xl font-semibold">
          Mock exam
        </h2>
        <ExamClock active={active} onExpire={expire} />
        <p className="text-sm text-[var(--fg-muted)]" data-testid="mock-answered">
          {answeredCount} of {total} answered{active.flags.length > 0 ? `, ${active.flags.length} flagged` : ''}
        </p>
      </div>
      <form
        className="mt-3 rounded-2xl border-2 border-[var(--line)] bg-[rgba(11,26,43,0.72)] p-3 sm:p-5"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <p className="text-sm text-[var(--fg-muted)]" data-testid="mock-position">
          Question {index + 1} of {total}
        </p>
        <fieldset className="mt-2">
          <legend className="text-lg leading-snug" data-testid="stem">
            {q.stem}
          </legend>
          <p className="mt-2 text-sm font-semibold">
            {single ? 'Choose one answer.' : `Choose ${q.select} answers.`}
            {!single && <span className="ml-2 font-normal text-[var(--fg-muted)]">Selected: {chosen.length} of {q.select}</span>}
          </p>
          <ul className="mt-2 grid gap-2">
            {presented.options.map((o, i) => (
              <li key={o.index}>
                <label className="option-row" data-checked={chosen.includes(o.index) ? 'true' : 'false'}>
                  <input
                    type={single ? 'radio' : 'checkbox'}
                    name={`mock-${id}`}
                    checked={chosen.includes(o.index)}
                    onChange={() => {
                      pick(o.index);
                    }}
                  />
                  <span>
                    <span className="font-semibold">{LETTERS[i]}.</span> {o.option.text}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn"
            aria-pressed={flagged}
            data-testid="mock-flag"
            onClick={() => {
              store.setMockFlag(id, !flagged);
            }}
          >
            {flagged ? 'Flagged for review (tap to unflag)' : 'Flag for review'}
          </button>
          {chosen.length > 0 && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                store.setMockAnswer(id, []);
              }}
            >
              Clear my answer
            </button>
          )}
        </div>
      </form>
      <nav aria-label="Mock navigation" className="mt-3 flex flex-wrap gap-2">
        {index > 0 && (
          <a className="btn" href={hrefMock('run', index)} data-testid="mock-prev">
            Previous
          </a>
        )}
        {index < total - 1 && (
          <a className="btn" href={hrefMock('run', index + 2)} data-testid="mock-next">
            Next
          </a>
        )}
        <a className="btn" href={hrefMock('review')} data-testid="mock-review-link">
          Review screen
        </a>
      </nav>
      <p className="mt-3 text-sm text-[var(--fg-muted)]">Nothing is graded until you submit from the review screen. Your answers are saved as you go, and the clock keeps running if you close the app.</p>
    </section>
  );
}
