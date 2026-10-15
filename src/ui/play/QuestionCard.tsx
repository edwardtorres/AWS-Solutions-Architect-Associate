import { useId, useState } from 'react';
import type { Presented } from '../../questions/present';

interface Props {
  presented: Presented;
  position: number;
  total: number;
  onSubmit: (chosen: number[]) => void;
}

const LETTERS = 'ABCDEFGH';

/** One question: radios for multiple choice, checkboxes for multiple response. Submit needs exactly the stated count. */
export function QuestionCard({ presented, position, total, onSubmit }: Props) {
  const { question, options } = presented;
  const [chosen, setChosen] = useState<number[]>([]);
  const group = useId();
  const single = question.format === 'mc';
  const ready = chosen.length === question.select;
  const toggle = (index: number) => {
    setChosen((c) => (single ? [index] : c.includes(index) ? c.filter((x) => x !== index) : [...c, index]));
  };
  return (
    <form
      className="rounded-2xl border-2 border-[var(--line)] bg-[rgba(11,26,43,0.72)] p-3 sm:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onSubmit(chosen);
      }}
    >
      <p className="text-sm text-[var(--fg-muted)]" data-testid="progress">
        Question {position} of {total}
      </p>
      <fieldset className="mt-2">
        <legend className="text-lg leading-snug" data-testid="stem">
          {question.stem}
        </legend>
        <p className="mt-2 text-sm font-semibold" id={`${group}-hint`}>
          {single ? 'Choose one answer.' : `Choose ${question.select} answers.`}
          {!single && <span className="ml-2 font-normal text-[var(--fg-muted)]">Selected: {chosen.length} of {question.select}</span>}
        </p>
        <ul className="mt-2 grid gap-2">
          {options.map((o, i) => (
            <li key={o.index}>
              <label className="option-row" data-checked={chosen.includes(o.index) ? 'true' : 'false'}>
                <input
                  type={single ? 'radio' : 'checkbox'}
                  name={group}
                  checked={chosen.includes(o.index)}
                  aria-describedby={`${group}-hint`}
                  onChange={() => {
                    toggle(o.index);
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
      <button type="submit" className="btn mt-4" disabled={!ready}>
        {position === total ? 'Submit and finish' : 'Submit answer'}
      </button>
    </form>
  );
}
