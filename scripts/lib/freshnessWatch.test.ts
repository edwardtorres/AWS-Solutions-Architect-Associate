import { describe, expect, it } from 'vitest';
import { CLEAN, decideIssueAction, findingsHash, markerOf, outcomeOf, reportMarkdown, type CheckResult } from './freshnessWatch';

const ok: CheckResult = { name: 'Exam guide', outcome: 'ok', output: 'check:content OK' };
const changed: CheckResult = { name: 'Cited AWS pages', outcome: 'changed', output: '- [changed] https://docs.aws.amazon.com/a.html\n    hash moved' };
const warned: CheckResult = { name: 'Free Tier offers', outcome: 'warning', output: 'network warning' };

describe('findings hash', () => {
  it('is null when nothing changed, so a clean run is recorded as clean', () => {
    expect(findingsHash([ok, warned])).toBeNull();
  });

  it('is the same for the same findings and differs when they differ', () => {
    const a = findingsHash([changed, ok]);
    expect(a).toMatch(/^[0-9a-f]{12}$/);
    expect(findingsHash([ok, changed])).toBe(a);
    expect(findingsHash([{ ...changed, output: 'another page moved' }, ok])).not.toBe(a);
  });

  it('ignores warnings: a network warning does not change the findings', () => {
    expect(findingsHash([changed, warned])).toBe(findingsHash([changed]));
  });
});

describe('the decision to write', () => {
  const held = (state: 'open' | 'closed', hash: string | null) => ({ state, held: hash });
  const h = 'abc123def456';

  it('creates the first issue for findings and writes nothing for a clean run with no issue', () => {
    expect(decideIssueAction(h, null)).toBe('create');
    expect(decideIssueAction(CLEAN, null)).toBe('none');
  });

  it('comments on an open issue only when the findings differ from the held report', () => {
    expect(decideIssueAction(h, held('open', h))).toBe('none');
    expect(decideIssueAction('ffffffffffff', held('open', h))).toBe('comment');
    expect(decideIssueAction(CLEAN, held('open', h))).toBe('comment');
    expect(decideIssueAction(h, held('open', null))).toBe('comment');
  });

  it('does not reopen a closed issue for findings the owner already closed', () => {
    expect(decideIssueAction(h, held('closed', h))).toBe('none');
    expect(decideIssueAction(CLEAN, held('closed', h))).toBe('none');
  });

  it('opens a new issue after a closed one only when the findings change', () => {
    expect(decideIssueAction('ffffffffffff', held('closed', h))).toBe('create');
    expect(decideIssueAction(CLEAN, held('closed', CLEAN))).toBe('none');
  });
});

describe('the report', () => {
  it('names each changed check and ends with the marker the decisions read', () => {
    const body = reportMarkdown([changed, ok, warned], 'abc123def456', '2026-10-29', 'a1b2c3d');
    expect(body).toContain('### Cited AWS pages');
    expect(body).toContain('hash moved');
    expect(body).not.toContain('### Exam guide');
    expect(body).toContain('Not checked this week');
    expect(body).toContain('Free Tier offers');
    expect(markerOf(body)).toBe('abc123def456');
  });

  it('a clean report says so and carries the clean marker', () => {
    const body = reportMarkdown([ok], CLEAN, '2026-10-29', 'a1b2c3d');
    expect(body).toContain('No change was found');
    expect(body).not.toContain('Close this issue');
    expect(markerOf(body)).toBe(CLEAN);
  });

  it('the latest marker in a thread wins', () => {
    expect(markerOf('<!-- content-freshness:aaaaaaaaaaaa -->\nlater\n<!-- content-freshness:clean -->')).toBe('clean');
    expect(markerOf('no marker here')).toBeNull();
  });
});

describe('exit codes become outcomes', () => {
  it('an unstable read is a warning, labelled as such, and a network failure is a warning too', () => {
    expect(outcomeOf(3)).toEqual({ outcome: 'warning', label: 'unstable read' });
    expect(outcomeOf(2)).toEqual({ outcome: 'warning', label: 'network warning' });
    expect(outcomeOf(1).outcome).toBe('changed');
    expect(outcomeOf(0).outcome).toBe('ok');
    expect(outcomeOf(9).outcome).toBe('error');
  });

  it('an unstable read appears in the report as a warning, never as a finding', () => {
    const unstable: CheckResult = { name: 'Free Tier offers (check:freeplan)', outcome: 'warning', output: 'unstable read', label: 'unstable read' };
    const body = reportMarkdown([unstable], CLEAN, '2026-10-29', 'a1b2c3d');
    expect(body).toContain('unstable read');
    expect(body).not.toContain('### Free Tier offers');
    expect(body).toContain('No change was found');
  });
});
