/**
 * Append one entry to content/sources.ts without hand-editing the file.
 * Usage: npx tsx scripts/add-source.ts <id> <url> "<title>" [azure]
 * Refuses a duplicate id or URL. Safe to run from several shells at once (lock file).
 */
import { closeSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const [id, url, title, kindArg] = process.argv.slice(2);
if (!id || !url || !title) {
  console.error('usage: add-source.ts <id> <url> "<title>" [azure]');
  process.exit(2);
}
const kind = kindArg === 'azure' ? 'azure' : 'aws';
const FILE = new URL('../content/sources.ts', import.meta.url);
const LOCK = new URL('../content/.sources.lock', import.meta.url);

async function lock(): Promise<void> {
  for (let i = 0; i < 100; i++) {
    try {
      closeSync(openSync(LOCK, 'wx'));
      return;
    } catch {
      await sleep(100);
    }
  }
  throw new Error('could not take the sources lock');
}

await lock();
let code = 0;
try {
  const text = readFileSync(FILE, 'utf8');
  if (new RegExp(`'${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`).test(text)) {
    console.error(`source id already exists: ${id}`);
    code = 1;
  }
  const bare = url.replace(/#.*$/, '');
  const docsPrefix = 'https://docs.aws.amazon.com';
  const learnPrefix = 'https://learn.microsoft.com/en-us/azure';
  const asTemplate = (u: string) => (u.startsWith(docsPrefix) ? '${D}' + u.slice(docsPrefix.length) : u.startsWith(learnPrefix) ? '${L}' + u.slice(learnPrefix.length) : u);
  const dupe = text.split('\n').find((l) => l.includes(asTemplate(bare)) || l.includes(bare));
  if (code === 0 && dupe && (dupe.includes(`${asTemplate(bare)}\``) || dupe.includes(`${bare}\``) || dupe.includes(`${bare}'`))) {
    console.error(`source URL already exists: ${dupe.trim().slice(0, 140)}`);
    code = 1;
  }
  if (code === 0) {
    const quote = asTemplate(url) === url ? "'" : '`';
    const entry = `  ${kind}('${id}', ${quote}${asTemplate(url)}${quote}, '${title.replace(/'/g, "\\'")}'),\n`;
    const i = text.lastIndexOf('];\n\nexport default sources;');
    if (i < 0) throw new Error('could not find the end of the sources array');
    writeFileSync(FILE, text.slice(0, i) + entry + text.slice(i));
    console.log(`added ${kind} source ${id}`);
  }
} finally {
  unlinkSync(LOCK);
}
process.exit(code);
