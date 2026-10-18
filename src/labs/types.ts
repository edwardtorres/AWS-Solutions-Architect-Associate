/**
 * Hands-on labs. Labs run in the owner's own AWS account, so Claude Code cannot test them: every step cites an AWS page
 * (`src` is an id in content/sources.ts, whose URL may carry a section anchor) and carries one verbatim sentence from
 * that page (`quote`, verified by `check:links`). Labs never state prices.
 */

/** What the owner sees on a lab. Derived from `Lab.services` (see content/labs/services.ts), never typed by hand. */
export type PlanFit = 'free' | 'paid' | 'unconfirmed';

export const PLAN_LABEL: Record<PlanFit, string> = {
  free: 'Free plan compatible',
  paid: 'Paid plan only',
  unconfirmed: 'Free plan availability not confirmed',
};

/** A resource that bills while it exists. Shown as a "bills while running" badge on every step that creates it. */
export interface LabCost {
  id: string;
  /** What bills, in plain words (for example "NAT gateway"). */
  resource: string;
  /** The documented billing basis, in the words of the page (never an amount). */
  basis: string;
  src: string;
  quote: string;
}

export type StepKind = 'do' | 'check' | 'cleanup' | 'verify';

export interface LabStep {
  /** Unique within the lab. */
  id: string;
  /** `do` by default. `cleanup` steps form the cleanup checklist; `verify` steps prove nothing billable remains. */
  kind?: StepKind;
  /** One or two imperative sentences. Link to the section through `src`; no long click paths. */
  text: string;
  src: string;
  quote: string;
  /** Billable or extra steps are optional; `alt` is the free or cheaper way to learn the same thing. */
  optional?: boolean;
  alt?: string;
  /** Ids of `Lab.costs` created or kept running by this step. */
  costs?: string[];
  /** The screen shows account IDs, ARNs, access keys or email addresses: the app warns not to paste them into problem notes. */
  sensitive?: boolean;
  /** What the owner should see on their own screen. Must not depend on a value the owner cannot predict. */
  checkpoint?: string;
  /** A CloudShell command (verification or tooling). Never contains an account ID, ARN with digits, key or email. */
  code?: string;
  /** Registry ids (content/post-guide.json) of features newer than the exam guide that this step uses or discusses. Required wherever the text matches a registry pattern. */
  newer?: string[];
  /** A note for exam day or for choosing between designs, with its own cited sentence. */
  callout?: { text: string; src: string; quote: string };
}

/** A "don't confuse" pair the lab lets the owner see for themselves. */
export interface LabTrap {
  /** Id in content/dont-confuse.ts. */
  pair: string;
  text: string;
  src: string;
  quote: string;
  /** The step where the difference shows. */
  step: string;
}

/** A warning the owner must acknowledge before a lab's steps appear. A read-only walkthrough is offered instead. */
export interface LabGate {
  title: string;
  /** The warning, written only from the cited sentences. */
  text: string;
  /** The label of the acknowledgement checkbox. */
  ack: string;
  /** What to do instead of running the lab. */
  alternative: string;
  cites: { src: string; quote: string }[];
}

export interface Lab {
  /** `lab-NN-slug`. */
  id: string;
  /** 1 to 14, the recommended order. */
  n: number;
  title: string;
  goal: string;
  /** Estimated hands-on minutes, including cleanup. */
  minutes: number;
  /** Mapped buildings (ids) and the outline bullets this lab practises (each belongs to a mapped building). */
  buildings: string[];
  bullets: string[];
  /** Lab ids to finish first. */
  needs: string[];
  /** Post-guide features named in the title, goal or cost text (steps carry their own `newer`). */
  newer?: string[];
  /** Shown first on the Labs page's order: the lab is scheduled last (its id and number stay stable). */
  last?: true;
  /** A warning to acknowledge before the steps appear. */
  gate?: LabGate;
  /** Service names as keyed in content/labs/services.ts; the plan badge is derived from them. */
  services: string[];
  costs: LabCost[];
  steps: LabStep[];
  traps: LabTrap[];
  /** CloudFormation templates in content/labs/templates (file names). Deleting the stack is the cleanup. */
  templates?: string[];
}

/** Display and schedule order: the number, except labs marked `last`, which go to the end. */
export const labOrder = <T extends { n: number; last?: boolean }>(labs: readonly T[]): T[] => [...labs].sort((a, b) => Number(!!a.last) - Number(!!b.last) || a.n - b.n);

/** Fixed XP for marking a lab complete (once per lab). The debrief earns question XP separately. */
export const LAB_XP = 100;
export const DEBRIEF_SIZE = 3;

/** What the Labs page, the Workshop section and the engine need without loading the lab text (generated: src/labs/meta.ts). */
export interface LabMeta {
  id: string;
  n: number;
  title: string;
  goal: string;
  minutes: number;
  buildings: readonly string[];
  bullets: readonly string[];
  needs: readonly string[];
  services: readonly string[];
  plan: PlanFit;
  /** Scheduled last on the Labs page. */
  last: boolean;
  /** Registry ids of the post-guide features any step (or the lab text) uses: the lab is labelled "newer than the exam guide". */
  newer: readonly string[];
  /** Its steps stay hidden until a warning is acknowledged. */
  gated: boolean;
  /** Names of the resources that bill while they exist. */
  billable: readonly string[];
  steps: number;
  /** Step ids that must be ticked before completion: the cleanup checklist and the verification. */
  required: readonly string[];
  templates: number;
}
