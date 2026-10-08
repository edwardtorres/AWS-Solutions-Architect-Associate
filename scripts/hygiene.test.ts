import { describe, expect, it } from 'vitest';
import { NOREPLY, scanCommits, scanText } from './lib/hygiene.ts';

const j = (...p: string[]) => p.join('');

describe('check:hygiene rules', () => {
  it('flags local paths, session links and tokens', () => {
    expect(scanText('a', j('/ho', 'me/someone/project'))).toHaveLength(1);
    expect(scanText('a', j('https://claude.ai/co', 'de/ses', 'sion_ABCDEFGHIJKLMNOPQRSTUV'))).not.toHaveLength(0);
    expect(scanText('a', j('tok', 'en=gh', 'p_', 'a'.repeat(30)))).toHaveLength(1);
    expect(scanText('a', j('AK', 'IA', 'ABCDEFGHIJKLMNOP'))).toHaveLength(1);
    expect(scanText('a', j('arn:aws:iam::', '123456789012', ':role/x'))).toHaveLength(1);
    expect(scanText('a', j('account_id: ', '123456789012'))).toHaveLength(1);
  });
  it('allows ordinary content, including AWS doc links and short numbers', () => {
    expect(scanText('a', 'https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html 720 points of 1000')).toEqual([]);
    expect(scanText('a', 'Account IDs are 12 digits long; never commit one.')).toEqual([]);
  });
  it('requires the noreply address on every commit and no session links in messages', () => {
    const ok = { hash: 'a'.repeat(40), authorEmail: NOREPLY, committerEmail: NOREPLY, message: 'Add things' };
    expect(scanCommits([ok])).toEqual([]);
    expect(scanCommits([{ ...ok, authorEmail: 'me@example.com' }])).toHaveLength(1);
    expect(scanCommits([{ ...ok, message: j('See https://claude.ai/co', 'de/ses', 'sion_ABCDEFGHIJKLMNOPQRSTUV') }]).length).toBeGreaterThan(0);
  });
});
