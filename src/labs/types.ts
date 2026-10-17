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
  /** Service names as keyed in content/labs/services.ts; the plan badge is derived from them. */
  services: string[];
  costs: LabCost[];
  steps: LabStep[];
  traps: LabTrap[];
  /** CloudFormation templates in content/labs/templates (file names). Deleting the stack is the cleanup. */
  templates?: string[];
}

/** Fixed XP for marking a lab complete (once per lab). The debrief earns question XP separately. */
export const LAB_XP = 100;
export const DEBRIEF_SIZE = 3;
