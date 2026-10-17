/**
 * Puzzle contract. A puzzle type is a `PuzzleDef<S>` (rules + how to show a scenario + the evaluator) and a list of
 * scenarios (`content/puzzles/<type>.ts`). Answers are never stored: `evaluate` computes them from the scenario, and
 * returns `null` when the cited rules do not settle the case (a refusal). `check:content` rejects any scenario that
 * hits a refusal.
 */
export type PuzzleType =
  | 'policy-court'
  | 'packet-tracer'
  | 'disaster-bunker'
  | 'cold-cellar'
  | 'purchase-planner'
  | 'architecture-builder'
  | 'qualifier-sprint';

export const PUZZLE_TYPES: readonly PuzzleType[] = [
  'policy-court',
  'packet-tracer',
  'disaster-bunker',
  'cold-cellar',
  'purchase-planner',
  'architecture-builder',
  'qualifier-sprint',
];

export const PUZZLE_TYPE_NAME: Record<PuzzleType, string> = {
  'policy-court': 'Policy Court',
  'packet-tracer': 'Packet Tracer',
  'disaster-bunker': 'Disaster Bunker drill',
  'cold-cellar': 'Cold Cellar planner',
  'purchase-planner': 'Purchase Planner',
  'architecture-builder': 'Architecture Builder',
  'qualifier-sprint': 'Qualifier Sprint',
};

/** Minimum scenarios per type (checked by check:content). */
export const MIN_SCENARIOS: Record<PuzzleType, number> = {
  'policy-court': 18,
  'packet-tracer': 18,
  'disaster-bunker': 14,
  'cold-cellar': 14,
  'purchase-planner': 14,
  'architecture-builder': 9,
  'qualifier-sprint': 11,
};

/** A documented rule an evaluator applies. `quote` is a verbatim sentence from the AWS page `src` (verified by check:links). */
export interface Rule {
  id: string;
  /** The rule in plain words, as the evaluator applies it. */
  text: string;
  /** Source id in content/sources.ts (AWS pages only). */
  src: string;
  quote: string;
  /** Post-guide registry ids this rule depends on (content/post-guide.json). A rule that matches a registry feature must declare it here; no scenario's answer may depend on such a rule. */
  newer?: string[];
}

/** One thing the player answers. Options are shown in the given order for puzzles; ids are what the evaluator returns. */
export interface Field {
  id: string;
  prompt: string;
  /** True: any number of options may be chosen (full credit needs exactly the right set). */
  multi: boolean;
  options: { id: string; label: string }[];
}

/** What the player reads. Generic so one renderer shows every type. */
export type ExhibitSection =
  | { title: string; kind: 'text'; text: string }
  | { title: string; kind: 'code'; text: string }
  | { title: string; kind: 'table'; head: string[]; rows: string[][] };
export type Exhibit = ExhibitSection[];

/** Computed answer: field id to the option ids that are correct. */
export type Answer = Record<string, string[]>;

export interface Evaluation {
  answer: Answer;
  /** Which rules decided it and what each concluded, in order. Rule ids refer to `PuzzleDef.rules`. */
  trace: TraceLine[];
}

/** One line of the explanation. `also` lists further rules that support the same line (lines with the same note are merged, so no line is printed twice). */
export interface TraceLine {
  rule: string;
  note: string;
  also?: string[];
}

/** Merges trace lines that share a note into one line; the later rules move to `also`. */
export function dedupeTrace(ev: Evaluation | null): Evaluation | null {
  if (!ev) return ev;
  const trace: TraceLine[] = [];
  for (const t of ev.trace) {
    const prev = trace.find((x) => x.note === t.note);
    if (!prev) {
      trace.push({ ...t });
      continue;
    }
    for (const r of [t.rule, ...(t.also ?? [])]) if (r !== prev.rule && !(prev.also ?? []).includes(r)) prev.also = [...(prev.also ?? []), r];
  }
  return { ...ev, trace };
}

export interface PuzzleDef<S> {
  type: PuzzleType;
  rules: Rule[];
  fields(s: S): Field[];
  exhibit(s: S): Exhibit;
  /** Null when the rules do not settle the case. */
  evaluate(s: S): Evaluation | null;
  /** Extra sourced facts that belong to one scenario (Qualifier Sprint, Architecture Builder). Verified like `rules`. */
  scenarioRules?(s: S): Rule[];
}

export interface ScenarioHeader {
  /** `puzzle-<type>-NNN`, for example `puzzle-policy-court-001` (the prefix keeps puzzle ids apart from question ids). */
  id: string;
  type: PuzzleType;
  /** Building whose Workbench lists it. */
  building: string;
  /** Outline bullets of that building this puzzle practises (none for the Foundation Town Charter). */
  bullets: string[];
  difficulty: 1 | 2 | 3;
  title: string;
  /** The situation in a few sentences. */
  story: string;
}

export interface Scenario<S> extends ScenarioHeader {
  data: S;
}

/** What the loader gives back for one type. */
export interface PuzzleModule {
  def: PuzzleDef<unknown>;
  scenarios: Scenario<unknown>[];
}
