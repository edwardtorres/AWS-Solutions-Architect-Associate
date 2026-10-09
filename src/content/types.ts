/** Shared by the app and by scripts/. Pure types, no runtime code. */

export type Status = 'preview' | 'deprecated' | 'retired' | 'closed';

export interface Quote {
  /** Source id from content/sources.json. */
  src: string;
  /** A verbatim excerpt of the page text (whitespace and quote characters are normalised when checked). */
  text: string;
}

/**
 * One cited statement. `text` supports `**bold**`, `code` and `{{term:glossary-id}}`.
 * Every number in `text` must appear in one of the block's quotes (or be listed in `allow`).
 */
export interface Block {
  text: string;
  sources: string[];
  quotes?: Quote[];
  status?: Status;
  /** Number tokens that are structural rather than factual claims (e.g. "four" strategies). */
  allow?: string[];
}

export interface Source {
  id: string;
  url: string;
  title: string;
  kind: 'aws' | 'azure';
}

export interface BulletNote {
  /** Official outline bullet id, e.g. "1.1-K4". */
  id: string;
  concepts: Block[];
  /** In-scope service names involved (as written in the exam guide). */
  services: string[];
  design: Block[];
}

export interface Cue {
  /** Phrase to look for in a question stem. */
  phrase: string;
  /** What it points to. */
  points: string;
  /** The sourced fact that justifies the cue. */
  fact: Block;
}

export interface Example {
  title: string;
  kind: 'iam-policy' | 'resource-policy' | 'bucket-policy' | 'key-policy' | 'lifecycle' | 'cidr' | 'routes' | 'rules' | 'other';
  /** Always true: examples are illustrative, never copy-paste configuration. */
  illustrative: true;
  code: string;
  /** What each part does, line by line. */
  explanation: Block[];
}

export interface AzureNote {
  /** Azure concept the learner already knows. */
  concept: string;
  aws: string;
  /** How the two map. Needs at least one Microsoft Learn source and one AWS source. */
  mapping: Block;
  /** Where the analogy breaks. Same source rule. */
  breaks: Block;
}

export interface BuildingNotes {
  building: string;
  overview: Block[];
  /** "What SAA adds beyond your project": portfolio buildings only. */
  beyondProject?: Block[];
  bullets: BulletNote[];
  cues: Cue[];
  examples: Example[];
  /** Ids from content/dont-confuse.json shown on this building's page. */
  confuse: string[];
  azure?: AzureNote[];
}

export interface GlossaryTerm {
  id: string;
  term: string;
  aliases?: string[];
  definition: Block;
}

export interface ConfuseItem {
  name: string;
  points: Block[];
}

export interface ConfusePair {
  id: string;
  title: string;
  /** True for the pairs the brief requires. */
  required: boolean;
  /** Building whose notes own this comparison. */
  home: string;
  items: ConfuseItem[];
  /** "Pick A when ..., pick B when ..." statements. */
  choose: Block[];
  /** The classic exam trap. */
  trap?: Block;
}

export interface RenamedService {
  id: string;
  /** Name used in the exam guide's lists (what questions use). */
  examGuideName: string;
  /** The other name that appears on AWS pages or in older material. */
  otherName: string;
  /** Which name is current on AWS pages, or how the two relate. */
  relation: Block;
}
