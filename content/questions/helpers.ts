import type { Difficulty, Question, QuestionOption } from '../../src/content/types.ts';

/** [option text, explanation]. For a correct option the explanation says why it is right; for a wrong one, which requirement it fails. */
export type Opt = readonly [text: string, why: string];

interface Base {
  id: string;
  building: string;
  /** Official outline bullet ids; leave empty for Foundations. */
  bullets?: string[];
  d: Difficulty;
  /** `placement-eligible`, `mock-reserve`, `trap:<pair-id>`. */
  tags?: string[];
  stem: string;
  /** "src-id|verbatim excerpt" strings; a bare string is tied to the first listed source. */
  evidence: string[];
  era?: string;
}

function evidenceOf(list: string[]): Question['evidence'] {
  return list.map((q) => {
    const i = q.indexOf('|');
    if (i <= 0 || !/^[a-z0-9-]+$/.test(q.slice(0, i))) throw new Error(`evidence needs a "source-id|quote" form: ${q.slice(0, 50)}`);
    return { src: q.slice(0, i), text: q.slice(i + 1) };
  });
}

/** Places correct options at the given positions and fills the rest with wrong options in the given order. */
function place(correct: readonly Opt[], wrong: readonly Opt[], slots: readonly number[], id: string): QuestionOption[] {
  const total = correct.length + wrong.length;
  if (new Set(slots).size !== correct.length || slots.some((s) => s < 0 || s >= total)) throw new Error(`${id}: bad slots`);
  const out: QuestionOption[] = [];
  let c = 0;
  let w = 0;
  for (let i = 0; i < total; i += 1) {
    if (slots.includes(i)) {
      const [text, why] = correct[c++] as Opt;
      out.push({ text, correct: true, why });
    } else {
      const [text, why] = wrong[w++] as Opt;
      out.push({ text, correct: false, why });
    }
  }
  return out;
}

/** Multiple choice: one correct option and three wrong ones. `slot` is the authored position (0 to 3) of the correct option. */
export function mc(s: Base & { correct: Opt; wrong: readonly [Opt, Opt, Opt]; slot: number }): Question {
  return {
    id: s.id,
    building: s.building,
    bullets: s.bullets ?? [],
    format: 'mc',
    select: 1,
    difficulty: s.d,
    stem: s.stem,
    options: place([s.correct], s.wrong, [s.slot], s.id),
    tags: s.tags ?? [],
    evidence: evidenceOf(s.evidence),
    ...(s.era ? { era: s.era } : {}),
  };
}

/** Multiple response: 2 or 3 correct options among 5 or more. `slots` are the authored positions of the correct options. */
export function mr(s: Base & { correct: readonly Opt[]; wrong: readonly Opt[]; slots: readonly number[] }): Question {
  return {
    id: s.id,
    building: s.building,
    bullets: s.bullets ?? [],
    format: 'mr',
    select: s.correct.length,
    difficulty: s.d,
    stem: s.stem,
    options: place(s.correct, s.wrong, s.slots, s.id),
    tags: s.tags ?? [],
    evidence: evidenceOf(s.evidence),
    ...(s.era ? { era: s.era } : {}),
  };
}
