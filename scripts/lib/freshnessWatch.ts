import { createHash } from 'node:crypto';

/** The label the watch puts on its issues. It must exist before the first issue is created. */
export const ISSUE_LABEL = 'content-freshness';
export const ISSUE_TITLE = 'Content freshness: AWS pages or the exam guide changed';
/** The hash a clean run holds. A report with findings holds the hash of those findings. */
export const CLEAN = 'clean';

const MARKER = /<!-- content-freshness:([0-9a-f]{12}|clean) -->/g;

export type Outcome = 'ok' | 'changed' | 'warning' | 'error';

export interface CheckResult {
  name: string;
  outcome: Outcome;
  /** The check's own output, with the lines that name what changed. */
  output: string;
}

/** A hash of the findings only, so the same findings give the same hash on every run. Null when nothing changed. */
export function findingsHash(results: readonly CheckResult[]): string | null {
  const changed = results.filter((r) => r.outcome === 'changed');
  if (changed.length === 0) return null;
  const text = changed.map((r) => `${r.name}\n${r.output.trim()}`).join('\n---\n');
  return createHash('sha256').update(text).digest('hex').slice(0, 12);
}

/** The Markdown body of the issue or comment: one section per check that reported something, then the hidden marker. */
export function reportMarkdown(results: readonly CheckResult[], hash: string, runDate: string, commit: string): string {
  const sections = results.filter((r) => r.outcome === 'changed');
  const warnings = results.filter((r) => r.outcome === 'warning').map((r) => `- ${r.name}`);
  const lines = [`Checked on ${runDate} at ${commit}.`, ''];
  if (sections.length === 0) {
    lines.push('No change was found by the checks that ran this week.', '');
  } else {
    lines.push('Each section is the output of one check that reported a change.', '');
    for (const r of sections) lines.push(`### ${r.name}`, '', '```text', r.output.trim(), '```', '');
  }
  if (warnings.length > 0) {
    lines.push('Not checked this week (network warnings, not changes):', ...warnings, '');
  }
  if (sections.length > 0) {
    lines.push(
      'Review the changes, then fix the notes, questions, puzzles or labs they affect (the output names them). Close this issue when that is done. The watch comments again only when the findings change, and opens a new issue only then.',
      '',
    );
  }
  lines.push(`<!-- content-freshness:${hash} -->`);
  return lines.join('\n');
}

/** The hash the newest marker in a text holds, or null when there is none. */
export function markerOf(text: string): string | null {
  let last: string | null = null;
  for (const m of text.matchAll(MARKER)) last = m[1] ?? null;
  return last;
}

/** What the watch holds for the newest issue with the label: its state, and the hash of its latest report. */
export interface HeldReport {
  state: 'open' | 'closed';
  held: string | null;
}

export type IssueAction = 'none' | 'create' | 'comment';

/**
 * Decides what to write. A report is written only when it differs from the one the issue already holds, so a stable finding
 * is reported once. A closed issue means the owner has reviewed it: a new issue appears only when the findings change.
 */
export function decideIssueAction(hash: string, newest: HeldReport | null): IssueAction {
  const clean = hash === CLEAN;
  if (newest === null) return clean ? 'none' : 'create';
  if (newest.held === hash) return 'none';
  if (newest.state === 'closed') return clean ? 'none' : 'create';
  return 'comment';
}
