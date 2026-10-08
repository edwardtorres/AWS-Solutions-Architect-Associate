export interface Finding {
  where: string;
  rule: string;
  excerpt: string;
}

export const NOREPLY = '12915571+edwardtorres@users.noreply.github.com';

// Patterns are assembled from fragments so this file does not match itself.
const j = (...parts: string[]) => parts.join('');

const RULES: { rule: string; re: RegExp }[] = [
  { rule: 'local file path', re: new RegExp(j('(?:/ho', 'me/|/ro', 'ot/|/Us', 'ers/|/tm', 'p/claude|[A-Za-z]:\\\\Us', 'ers\\\\)[A-Za-z0-9._-]*')) },
  { rule: 'session link', re: new RegExp(j('claude\\.ai/(?:co', 'de|ch', 'at)/[A-Za-z0-9_-]+')) },
  { rule: 'session id', re: new RegExp(j('ses', 'sion_[A-Za-z0-9]{16,}')) },
  { rule: 'GitHub token', re: new RegExp(j('(?:gh[pousr]_|github_', 'pat_)[A-Za-z0-9_]{20,}')) },
  { rule: 'AWS access key id', re: new RegExp(j('\\b(?:AK', 'IA|AS', 'IA)[A-Z0-9]{16}\\b')) },
  { rule: 'AWS account id in an ARN', re: new RegExp(j('arn:aws[a-z-]*:[a-z0-9-]*:[a-z0-9-]*:\\d{12}:')) },
  { rule: 'AWS account id', re: new RegExp(j('(?:account[ _-]?id|account number)["\']?\\s*[:=]\\s*["\']?\\d{12}\\b'), 'i') },
  { rule: 'private key block', re: new RegExp(j('-----BEGIN [A-Z ]*PRIV', 'ATE KEY-----')) },
  { rule: 'bearer or basic credential', re: new RegExp(j('(?:Bear', 'er|Bas', 'ic) [A-Za-z0-9._~+/=-]{20,}')) },
  { rule: 'URL with credentials', re: new RegExp(j('https?://[^/\\s:@]+:[^/\\s@]+@')) },
  { rule: 'slack or API token', re: new RegExp(j('\\b(?:xo', 'x[abp]-|s', 'k-ant-|s', 'k-[A-Za-z0-9]{32})[A-Za-z0-9-]*')) },
];

export function scanText(where: string, text: string): Finding[] {
  const out: Finding[] = [];
  text.split('\n').forEach((line, i) => {
    for (const { rule, re } of RULES) {
      const m = re.exec(line);
      if (m) out.push({ where: `${where}:${i + 1}`, rule, excerpt: m[0].slice(0, 60) });
    }
  });
  return out;
}

export interface CommitInfo {
  hash: string;
  authorEmail: string;
  committerEmail: string;
  message: string;
}

export function scanCommits(commits: readonly CommitInfo[]): Finding[] {
  const out: Finding[] = [];
  for (const c of commits) {
    const short = c.hash.slice(0, 8);
    if (c.authorEmail !== NOREPLY) out.push({ where: `commit ${short}`, rule: 'author is not the noreply address', excerpt: c.authorEmail });
    if (c.committerEmail !== NOREPLY) out.push({ where: `commit ${short}`, rule: 'committer is not the noreply address', excerpt: c.committerEmail });
    out.push(...scanText(`commit ${short} message`, c.message));
  }
  return out;
}
