import { lazy, Suspense, useState } from 'react';

const QuestionBrowser = lazy(() => import('./QuestionBrowser'));

/**
 * Settings. The question browser has no route and no link: it opens only from here, after a
 * warning, and only lives in component state, so there is no URL that shows the answer key.
 */
export default function Settings() {
  const [asking, setAsking] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <details className="mt-4 rounded-2xl border-2 border-[var(--line)] bg-[rgba(11,26,43,0.72)] p-3 sm:p-4">
      <summary className="flex min-h-11 cursor-pointer items-center font-display text-xl font-semibold">Settings</summary>
      <section aria-labelledby="browse-heading" className="mt-2">
        <h3 id="browse-heading" className="text-lg font-semibold">
          Browse questions
        </h3>
        <p className="mt-1 max-w-prose text-sm text-[var(--fg-muted)]">
          Lists every practice question with its answer and explanation. Use it to check your notes, not to prepare for an inspection.
        </p>
        {!open && !asking && (
          <button
            type="button"
            className="btn mt-3"
            onClick={() => {
              setAsking(true);
            }}
          >
            Browse questions
          </button>
        )}
        {asking && !open && (
          <div role="alertdialog" aria-labelledby="warn-title" aria-describedby="warn-body" className="mt-3 rounded-xl border-2 border-[var(--accent)] p-3">
            <p id="warn-title" className="font-semibold">
              Before you open the answers
            </p>
            <p id="warn-body" className="mt-1 max-w-prose text-sm">
              Browsing answers makes inspections and mock exams less meaningful, because you may remember a question instead of working it out.
              Open the browser only if you accept that.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setOpen(true);
                  setAsking(false);
                }}
              >
                I understand, open the browser
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setAsking(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {open && (
          <>
            <button
              type="button"
              className="btn mt-3"
              onClick={() => {
                setOpen(false);
              }}
            >
              Close the browser
            </button>
            <Suspense fallback={<p role="status">Loading…</p>}>
              <QuestionBrowser />
            </Suspense>
          </>
        )}
      </section>
    </details>
  );
}
