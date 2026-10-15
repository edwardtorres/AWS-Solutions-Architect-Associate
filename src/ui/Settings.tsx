import { lazy, Suspense, useState } from 'react';
import { exportFlags } from '../game/flags';
import { loadQuestions } from '../questions/pool';
import { useSaveStore, useSnapshot } from '../save/context';

const QuestionBrowser = lazy(() => import('./QuestionBrowser'));

/**
 * Settings. The question browser has no route and no link: it opens only from here, after a
 * warning, and only lives in component state, so there is no URL that shows the answer key.
 */
export default function Settings() {
  const [asking, setAsking] = useState(false);
  const [open, setOpen] = useState(false);
  const store = useSaveStore();
  const { save } = useSnapshot();
  const [exported, setExported] = useState<string | null>(null);

  const doExport = async () => {
    const bank = await loadQuestions();
    const byId = new Map(bank.map((q) => [q.id, q]));
    const text = exportFlags(save.game.flags, (id) => byId.get(id));
    setExported(text);
    try {
      const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'region-builder-flags.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      /* the text is shown below as a fallback */
    }
  };

  return (
    <details className="mt-4 rounded-2xl border-2 border-[var(--line)] bg-[rgba(11,26,43,0.72)] p-3 sm:p-4">
      <summary className="flex min-h-11 cursor-pointer items-center font-display text-xl font-semibold">Settings</summary>
      <section aria-labelledby="flags-heading" className="mt-2">
        <h3 id="flags-heading" className="text-lg font-semibold">
          Flagged questions ({save.game.flags.length})
        </h3>
        <p className="mt-1 max-w-prose text-sm text-[var(--fg-muted)]">
          Flags you add on a result screen are saved in this browser only. Export them as text to send with a correction.
        </p>
        {save.game.flags.length > 0 && (
          <ul className="mt-2 grid gap-2" data-testid="flag-list">
            {save.game.flags.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--line)] p-2 text-sm">
                <span className="font-semibold">{f.questionId}</span>
                <span className="min-w-0 flex-1 break-words">{f.note || '(no note)'}</span>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    store.removeFlag(f.id);
                  }}
                >
                  Remove flag
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="btn mt-2"
          disabled={save.game.flags.length === 0}
          onClick={() => {
            void doExport();
          }}
        >
          Export flags
        </button>
        {exported !== null && (
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--line)] p-2 text-xs" data-testid="flags-export">
            {exported}
          </pre>
        )}
      </section>
      <section aria-labelledby="browse-heading" className="mt-6">
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
