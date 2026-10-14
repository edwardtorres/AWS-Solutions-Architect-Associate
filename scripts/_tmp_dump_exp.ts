import { fetchPage } from './lib/pageCache.ts';
import { writeFileSync } from 'node:fs';
const [out, ...urls] = process.argv.slice(2);
for (const u of urls) {
  const p = await fetchPage(u);
  const name = u.split('/').slice(-2).join('_').replace(/[^a-zA-Z0-9_.-]/g,'');
  const t = (p.display ?? p.text ?? '').split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/).join('\n');
  writeFileSync(`${out}/${name}.txt`, t);
  console.log(name, t.length);
}
