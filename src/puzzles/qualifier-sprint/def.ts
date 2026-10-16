import type { Evaluation, ExhibitSection, Field, PuzzleDef, Rule } from '../types';

export type QualifierId = 'overhead' | 'cost' | 'secure' | 'available';

export const QUALIFIERS: readonly { id: QualifierId; label: string }[] = [
  { id: 'overhead', label: 'LEAST operational overhead' },
  { id: 'cost', label: 'MOST cost-effective' },
  { id: 'secure', label: 'MOST secure' },
  { id: 'available', label: 'HIGHEST availability' },
];

export interface SprintOption {
  id: string;
  text: string;
}

/**
 * One scenario shown four times, once per qualifier. Each answer is authored and rests on one sourced fact
 * (`facts[q]`: a verbatim AWS sentence that makes that option the best fit for that qualifier).
 */
export interface SprintData {
  /** 4 or 5 designs that all work; they differ in what they optimise. */
  options: SprintOption[];
  answers: Record<QualifierId, string>;
  facts: Record<QualifierId, { text: string; src: string; quote: string }>;
}

const factRule = (q: QualifierId, f: SprintData['facts'][QualifierId]): Rule => ({ id: `fact-${q}`, text: f.text, src: f.src, quote: f.quote });

export const def: PuzzleDef<SprintData> = {
  type: 'qualifier-sprint',
  rules: [],
  fields(s): Field[] {
    return QUALIFIERS.map((q) => ({ id: q.id, prompt: `${q.label}: which design fits best?`, multi: false, options: s.options.map((o) => ({ id: o.id, label: o.text })) }));
  },
  exhibit(s): ExhibitSection[] {
    return [{ title: 'The designs', kind: 'table', head: ['Design', 'What it is'], rows: s.options.map((o, i) => [String.fromCharCode(65 + i), o.text]) }];
  },
  scenarioRules: (s) => QUALIFIERS.map((q) => factRule(q.id, s.facts[q.id])),
  evaluate(s): Evaluation | null {
    const ids = new Set(s.options.map((o) => o.id));
    const answer: Record<string, string[]> = {};
    for (const q of QUALIFIERS) {
      const a = s.answers[q.id];
      if (!a || !ids.has(a)) return null;
      answer[q.id] = [a];
    }
    return { answer, trace: QUALIFIERS.map((q) => ({ rule: `fact-${q.id}`, note: `${q.label}: ${s.options.find((o) => o.id === s.answers[q.id])?.text ?? ''}` })) };
  },
};
