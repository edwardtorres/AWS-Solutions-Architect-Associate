/**
 * npm run freshness:watch [-- --dry-run]
 * The weekly content watch (.github/workflows/content-freshness.yml). Runs the three network checks (cited AWS pages, the live
 * exam guide, the Free Tier offers). A network-class failure (exit 2) is retried with backoff and then reported as a warning;
 * it never opens an issue. A change (exit 1) is reported: one issue labelled content-freshness is opened, or the open one gets
 * a comment, only when the findings differ from the report the issue already holds. Uses the workflow's GITHUB_TOKEN only.
 * --dry-run prints the report and never calls GitHub. The job never blocks a deploy: it is not a dependency of one.
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CLEAN, ISSUE_LABEL, ISSUE_TITLE, decideIssueAction, findingsHash, markerOf, outcomeOf, reportMarkdown, type CheckResult, type HeldReport } from './lib/freshnessWatch.ts';
import { EXIT_NETWORK } from './lib/network.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BACKOFF_MS = [2_000, 4_000, 8_000];
const CHECKS: { name: string; args: string[] }[] = [
  { name: 'Cited AWS pages (check:freshness)', args: ['scripts/check-freshness.ts'] },
  { name: 'Exam guide, live (check:content -- --live)', args: ['scripts/check-content.ts', '--live'] },
  { name: 'Free Tier offers (check:freeplan)', args: ['scripts/check-freeplan.ts'] },
];

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
const dryRun = process.argv.includes('--dry-run');

/** Runs one check, retrying network-class failures with backoff. Any other exit code is a real result. */
async function runCheck(check: { name: string; args: string[] }): Promise<CheckResult> {
  for (let attempt = 0; ; attempt += 1) {
    const run = spawnSync('npx', ['tsx', ...check.args], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      shell: process.platform === 'win32',
    });
    if (run.status === EXIT_NETWORK && attempt < BACKOFF_MS.length) {
      console.log(`${check.name}: network failure; retrying in ${BACKOFF_MS[attempt]! / 1000} s`);
      await sleep(BACKOFF_MS[attempt]!);
      continue;
    }
    const { outcome, label } = outcomeOf(run.status);
    const output = `${run.stdout ?? ''}${run.stderr ?? ''}`.trim();
    console.log(`${check.name}: ${label}${attempt > 0 ? ` (after ${attempt} retr${attempt === 1 ? 'y' : 'ies'})` : ''}`);
    return { name: check.name, outcome, output: output || '(no output)', label };
  }
}

/** A GitHub REST call against this repository. Rate limits and server errors are retried; the token never leaves the header. */
async function github(method: 'GET' | 'POST', path: string, body?: unknown): Promise<unknown> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are needed to read or write the issue');
  for (let attempt = 0; ; attempt += 1) {
    const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'saa-region-builder-freshness-watch',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.ok) return res.status === 204 ? null : res.json();
    if (res.status === 422 && path === '/labels') return null; // the label already exists
    if ((res.status === 429 || res.status >= 500) && attempt < BACKOFF_MS.length) {
      await sleep(BACKOFF_MS[attempt]!);
      continue;
    }
    throw new Error(`GitHub ${method} ${path.split('?')[0]} -> ${res.status}`);
  }
}

interface IssueRecord {
  number: number;
  state: 'open' | 'closed';
  body: string | null;
  pull_request?: unknown;
}

/** The newest issue with the label, and the hash its latest report holds (a later comment wins over the body). */
async function newestHeld(): Promise<{ number: number; held: HeldReport } | null> {
  const issues = (await github('GET', `/issues?labels=${ISSUE_LABEL}&state=all&sort=created&direction=desc&per_page=5`)) as IssueRecord[];
  const issue = issues.find((i) => i.pull_request === undefined);
  if (!issue) return null;
  const comments = (await github('GET', `/issues/${issue.number}/comments?per_page=100`)) as { body: string }[];
  const fromComments = [...comments].reverse().map((c) => markerOf(c.body)).find((m) => m !== null) ?? null;
  return { number: issue.number, held: { state: issue.state, held: fromComments ?? markerOf(issue.body ?? '') } };
}

function summary(results: CheckResult[], hash: string | null): string {
  const rows = results.map((r) => `| ${r.name} | ${r.outcome} |`);
  return [
    '## Content freshness watch',
    '',
    '| Check | Result |',
    '| --- | --- |',
    ...rows,
    '',
    hash === null ? 'No change found in this run.' : `Findings hash \`${hash}\`.`,
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const results: CheckResult[] = [];
  for (const check of CHECKS) results.push(await runCheck(check));
  const failed = results.filter((r) => r.outcome === 'error');
  const hash = findingsHash(results);
  const text = summary(results, hash);
  console.log(`\n${text}`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  if (failed.length > 0) {
    console.error(`The watch could not run: ${failed.map((r) => r.name).join(', ')}. See the output above.`);
    process.exit(1);
  }

  const runDate = new Date().toISOString().slice(0, 10);
  const commit = process.env.GITHUB_SHA ? process.env.GITHUB_SHA.slice(0, 7) : 'a local checkout';
  const report = reportMarkdown(results, hash ?? CLEAN, runDate, commit);
  if (dryRun) {
    console.log(`--- report (dry run, no GitHub calls) ---\n${report}`);
    return;
  }
  // A check that could not run says nothing about the content, so a clean result is not recorded in that case.
  if (hash === null && results.some((r) => r.outcome === 'warning')) {
    console.log('Not deciding on the issue: a check could not run (network warning).');
    return;
  }

  const newest = await newestHeld();
  const action = decideIssueAction(hash ?? CLEAN, newest?.held ?? null);
  if (action === 'create') {
    await github('POST', '/labels', { name: ISSUE_LABEL, color: '0e8a16', description: 'Weekly content watch findings' });
    await github('POST', '/issues', { title: ISSUE_TITLE, body: report, labels: [ISSUE_LABEL] });
    console.log('Opened an issue with the findings.');
  } else if (action === 'comment' && newest) {
    await github('POST', `/issues/${newest.number}/comments`, { body: report });
    console.log(`Commented on issue #${newest.number}: the findings differ from the report it holds.`);
  } else {
    console.log('No issue change: the report matches the one the newest issue holds, or there is nothing to report.');
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
