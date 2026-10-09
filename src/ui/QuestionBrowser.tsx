import { useEffect, useMemo, useState } from 'react';
import { BUILDING_BY_ID, BUILDINGS } from '../data';
import type { Question } from '../content/types';
import { loadQuestions, eligible } from '../questions/pool';
import { isCorrect, present } from '../questions/present';

interface Props {
  /** Tests pass questions directly; the app loads them lazily. */
  questions?: readonly Question[];
}

function Item({ question }: { question: Question }) {
  const presented = useMemo(() => present(question), [question]);
  const [chosen, setChosen] = useState<number[]>([]);
  const [shown, setShown] = useState(false);
  const toggle = (index: number) => {
    setChosen((c) => (question.format === 'mc' ? [index] : c.includes(index) ? c.filter((x) => x !== index) : [...c, index]));
  };
  const letters = 'ABCDEFGH';
  return (
    <li className="rounded-xl border border-[var(--line)] p-3">
      <p className="text-xs text-[var(--fg-muted)]">
        {question.id} · {question.format === 'mc' ? 'multiple choice' : `multiple response (choose ${question.select})`} · level {question.difficulty}
      </p>
      <p className="mt-1">{question.stem}</p>
      <ul className="mt-2 grid gap-2">
        {presented.options.map((o, i) => (
          <li key={o.index}>
            <label className="flex min-h-11 cursor-pointer items-start gap-2 rounded-lg border border-[var(--line)] p-2">
              <input
                type={question.format === 'mc' ? 'radio' : 'checkbox'}
                name={question.id}
                checked={chosen.includes(o.index)}
                onChange={() => {
                  toggle(o.index);
                }}
                className="mt-1"
              />
              <span>
                <span className="font-semibold">{letters[i]}.</span> {o.option.text}
                {shown && (
                  <span className="mt-1 block text-sm">
                    <strong>{o.option.correct ? 'Correct. ' : 'Not this one. '}</strong>
                    {o.option.why}
                  </span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn mt-2"
        onClick={() => {
          setShown((s) => !s);
        }}
      >
        {shown ? 'Hide answer' : 'Show answer'}
      </button>
      {shown && (
        <p role="status" className="mt-2 text-sm">
          {chosen.length === 0 ? 'You chose nothing.' : isCorrect(question, chosen) ? 'Your choice is correct.' : 'Your choice is not correct.'} Based on AWS
          documentation: {question.evidence.map((e) => e.src).join(', ')}.
        </p>
      )}
    </li>
  );
}

export default function QuestionBrowser({ questions }: Props) {
  const [all, setAll] = useState<readonly Question[] | null>(questions ?? null);
  const [building, setBuilding] = useState('');
  useEffect(() => {
    if (questions) return;
    let live = true;
    void loadQuestions().then((qs) => {
      if (live) setAll(qs);
    });
    return () => {
      live = false;
    };
  }, [questions]);

  // The browser never shows the mock reserve.
  const list = useMemo(() => (all ? eligible(all, 'browse') : []), [all]);
  const ids = useMemo(() => [...new Set(list.map((q) => q.building))], [list]);
  const shown = building ? list.filter((q) => q.building === building) : [];

  if (!all) return <p role="status">Loading…</p>;
  if (list.length === 0) return <p className="mt-3 text-sm">No questions are available yet.</p>;
  return (
    <div className="mt-3">
      <label className="block text-sm font-semibold" htmlFor="qb-building">
        Building
      </label>
      <select
        id="qb-building"
        className="mt-1 min-h-11 w-full max-w-md rounded-lg border-2 border-[var(--line)] bg-[var(--bg)] px-2"
        value={building}
        onChange={(e) => {
          setBuilding(e.target.value);
        }}
      >
        <option value="">Choose a building…</option>
        {BUILDINGS.filter((b) => ids.includes(b.id)).map((b) => (
          <option key={b.id} value={b.id}>
            {b.name} ({list.filter((q) => q.building === b.id).length})
          </option>
        ))}
      </select>
      {building && (
        <>
          <h4 className="mt-3 text-base font-semibold">{BUILDING_BY_ID.get(building)?.name}</h4>
          <ol className="mt-2 grid gap-3">
            {shown.map((q) => (
              <Item key={q.id} question={q} />
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
