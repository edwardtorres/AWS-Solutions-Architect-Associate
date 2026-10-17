import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Lab } from '../../src/labs/types.ts';

const root = fileURLToPath(new URL('../../content/labs', import.meta.url));
export const TEMPLATE_DIR = join(root, 'templates');

/** Reads content/labs/lab-NN-*.ts (default export: one Lab) and the CloudFormation templates beside them. */
export async function loadLabs(): Promise<{ labs: Lab[]; templates: Map<string, string> }> {
  const labs: Lab[] = [];
  if (existsSync(root)) {
    for (const f of readdirSync(root).filter((x) => /^lab-\d{2}-.*\.ts$/.test(x)).sort()) {
      const mod = (await import(pathToFileURL(join(root, f)).href)) as { default: Lab };
      labs.push(mod.default);
    }
  }
  const templates = new Map<string, string>();
  if (existsSync(TEMPLATE_DIR)) for (const f of readdirSync(TEMPLATE_DIR).filter((x) => /\.(ya?ml|json)$/.test(x)).sort()) templates.set(f, readFileSync(join(TEMPLATE_DIR, f), 'utf8'));
  return { labs, templates };
}
