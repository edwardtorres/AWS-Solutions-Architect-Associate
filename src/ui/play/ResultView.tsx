import { useState } from 'react';
import type { Question } from '../../content/types';
import type { Shared } from '../../content/store';
import { hrefConfuse } from '../../lib/route';
import { attemptRandom } from '../../lib/rng';
import { useSaveStore, useSnapshot } from '../../save/context';
import { present } from '../../questions/present';

export interface ResultItem {
  question: Question;
  /** Authored option indices the player chose. */
  chosen: number[];
  correct: boolean;
}

const LETTERS = 'ABCDEFGH';

function FlagControl({ questionId, chosen }: { questionId: string; chosen: number[] }) {
  const store = useSaveStore();
  const { save } = useSnapshot();
  const existing = save.game.flags.find((f) => f.questionId === questionId);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  if (existing) {
    return (
      <div className="mt-3" data-testid="flag-done">
        <p role="status" className="text-sm">
          Flagged{existing.note ? `: “${existing.note}”` : '.'} It is saved in this browser and listed in Settings.
        </p>
        <button
          type="button"
          className="btn mt-1"
          onClick={() => {
            store.removeFlag(existing.id);
          }}
        >
          Remove flag
        </button>
      </div>
    );
  }
  if (!open) {
    return (
      <button
        type="button"
        className="btn mt-3"
        onClick={() => {
          setOpen(true);
        }}
      >
        Flag this question
      </button>
    );
  }
  const noteId = `flag-note-${questionId}`;
  return (
    <form
      className="mt-3"
      onSubmit={(e) => {
        e.preventDefault();
        store.addFlag(questionId, note, chosen);
        setOpen(false);
        setNote('');
      }}
    >
      <label htmlFor={noteId} className="block text-sm font-semibold">
        What is wrong or unclear? (optional, kept on this device)
      </label>
      <textarea
        id={noteId}
        className="note-field mt-1"
        maxLength={500}
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
        }}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="submit" className="btn">
          Save flag
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setOpen(false);
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function ResultCard({ item, index, seed, shared }: { item: ResultItem; index: number; seed: number; shared: Shared | null }) {
  const { question, chosen, correct } = item;
  const presented = present(question, attemptRandom(seed, question.id));
  const trap = question.tags.filter((t) => t.startsWith('trap:')).map((t) => t.slice(5));
  const pairs = shared ? trap.flatMap((id) => shared.confuse.filter((c) => c.id === id)) : [];
  const text = (i: number) => question.options[i]?.text ?? '';
  const keyed = question.options.flatMap((o, i) => (o.correct ? [i] : []));
  const sources = [...new Set(question.evidence.map((e) => e.src))].flatMap((id) => {
    const s = shared?.sources.get(id);
    return s ? [s] : [];
  });
  return (
    <li className="rounded-2xl border-2 border-[var(--line)] bg-[rgba(11,26,43,0.72)] p-3 sm:p-5" data-testid="result-card" data-correct={correct ? 'true' : 'false'}>
      <h3 className="text-lg font-semibold">
        Question {index + 1}: {correct ? 'Correct' : 'Not correct'}
      </h3>
      <p className="mt-1">{question.stem}</p>
      <dl className="mt-2 grid gap-1 text-sm">
        <div>
          <dt className="inline font-semibold">Your answer: </dt>
          <dd className="inline" data-testid="my-answer">{chosen.length === 0 ? '(none)' : chosen.map(text).join(' | ')}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">The key: </dt>
          <dd className="inline" data-testid="the-key">{keyed.map(text).join(' | ')}</dd>
        </div>
      </dl>
      <ul className="mt-3 grid gap-2">
        {presented.options.map((o, i) => {
          const mine = chosen.includes(o.index);
          const mark = o.option.correct ? 'key' : mine ? 'wrong' : 'none';
          return (
            <li key={o.index} className="option-row" data-mark={mark}>
              <span>
                <span className="font-semibold">{LETTERS[i]}.</span> {o.option.text}
                <span className="mt-1 block text-sm">
                  <strong>
                    {o.option.correct ? 'Key' : 'Not the key'}
                    {mine ? ' · your answer' : ''}.
                  </strong>{' '}
                  {o.option.why}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {sources.length > 0 && (
        <div className="mt-3 text-sm">
          <p className="font-semibold">Sources (AWS)</p>
          <ul className="mt-1 grid gap-1">
            {sources.map((s) => (
              <li key={s.id}>
                <a className="inline-flex min-h-11 items-center underline underline-offset-4" href={s.url} target="_blank" rel="noreferrer noopener">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {pairs.length > 0 && (
        <p className="mt-2 text-sm">
          Often confused:{' '}
          {pairs.map((p) => (
            <a key={p.id} className="inline-flex min-h-11 items-center underline underline-offset-4" href={hrefConfuse(p.id)}>
              {p.title}
            </a>
          ))}
        </p>
      )}
      <FlagControl questionId={question.id} chosen={chosen} />
    </li>
  );
}
