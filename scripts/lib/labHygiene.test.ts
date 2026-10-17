import { describe, expect, it } from 'vitest';
import { scanText } from './hygiene';

describe('hygiene rules for lab content', () => {
  const email = ['someone', '@', 'example.com'].join('');
  it('flags emails and 12-digit numbers only inside lab content', () => {
    expect(scanText('content/labs/lab-01.ts:1', `type ${email} here`).map((f) => f.rule)).toContain('email address in lab content');
    expect(scanText('content/labs/lab-01.ts:1', 'account 123456789012 here').map((f) => f.rule)).toContain('12-digit number in lab content (account id?)');
    expect(scanText('docs/reviews/labs-notes/x.md', 'account 123456789012 here')).not.toHaveLength(0);
    expect(scanText('src/other.ts', `${email} 123456789012`)).toHaveLength(0);
  });
  it('flags access keys and ARNs with account numbers everywhere', () => {
    expect(scanText('content/labs/x.ts', ['arn:aws:iam:', ':', '123456789012', ':role/x'].join('')).map((f) => f.rule)).toContain('AWS account id in an ARN');
  });
});
