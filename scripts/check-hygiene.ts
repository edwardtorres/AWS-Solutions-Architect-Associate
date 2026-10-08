/** Fails if tracked files or commits contain private links, session links, tokens, account IDs or local paths. */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scanCommits, scanText, type CommitInfo, type Finding } from './lib/hygiene.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const SKIP = /(^|\/)(package-lock\.json)$|\.(woff2?|png|jpg|ico)$/;
const files = git('ls-files', '-co', '--exclude-standard', '-z').split('\0').filter((f) => f && !SKIP.test(f));

const findings: Finding[] = [];
for (const f of files) {
  let text: string;
  try {
    text = readFileSync(`${root}/${f}`, 'utf8');
  } catch {
    continue;
  }
  findings.push(...scanText(f, text));
}

let commits: CommitInfo[] = [];
try {
  const raw = git('log', '--format=%H%x1f%ae%x1f%ce%x1f%B%x1e');
  commits = raw
    .split('\x1e')
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      const [hash = '', authorEmail = '', committerEmail = '', message = ''] = r.split('\x1f');
      return { hash, authorEmail, committerEmail, message };
    });
} catch {
  /* no commits yet */
}
findings.push(...scanCommits(commits));

if (findings.length > 0) {
  console.error(`check:hygiene FAILED (${findings.length}):`);
  for (const f of findings) console.error(`  - ${f.where}: ${f.rule}: ${f.excerpt}`);
  process.exit(1);
}
console.log(`check:hygiene OK: ${files.length} files and ${commits.length} commits scanned`);
