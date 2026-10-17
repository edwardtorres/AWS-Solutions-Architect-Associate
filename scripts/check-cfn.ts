/**
 * npm run check:cfn
 * Validates every CloudFormation template in content/labs/templates with cfn-lint. cfn-lint is a Python tool: it is used
 * from PATH, or from .cache/venv (created here on first run with `python3 -m venv` and `pip install cfn-lint`).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEMPLATE_DIR } from './lib/loadLabs.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const venv = join(root, '.cache/venv');

function findLint(): string {
  if (spawnSync('cfn-lint', ['--version'], { encoding: 'utf8' }).status === 0) return 'cfn-lint';
  const local = join(venv, 'bin/cfn-lint');
  if (!existsSync(local)) {
    console.log('cfn-lint not found: installing it into .cache/venv ...');
    execFileSync('python3', ['-m', 'venv', venv], { stdio: 'inherit' });
    execFileSync(join(venv, 'bin/pip'), ['install', '-q', 'cfn-lint'], { stdio: 'inherit' });
  }
  return local;
}

const files = existsSync(TEMPLATE_DIR) ? readdirSync(TEMPLATE_DIR).filter((f) => /\.(ya?ml|json)$/.test(f)).sort() : [];
if (files.length === 0) {
  console.log('check:cfn OK: no templates yet');
  process.exit(0);
}
const lint = findLint();
const r = spawnSync(lint, files.map((f) => join(TEMPLATE_DIR, f)), { encoding: 'utf8' });
if (r.status !== 0) {
  console.error(`check:cfn FAILED:\n${r.stdout}${r.stderr}`);
  process.exit(1);
}
console.log(`check:cfn OK: ${files.length} template(s) pass cfn-lint`);
