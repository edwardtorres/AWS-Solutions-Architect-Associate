/** Research helper: npm run ctx -- <url> <regex> [chars]  prints the page text around each of the first matches. */
process.stdout.on('error', () => process.exit(0));
import { fetchPage } from './lib/pageCache.ts';

const [url, pattern, n = '500'] = process.argv.slice(2);
if (!url || !pattern) {
  console.error('usage: tsx scripts/ctx.ts <url> <regex> [chars]');
  process.exit(2);
}
const page = await fetchPage(url);
const text = page.display ?? page.text;
const re = new RegExp(pattern, 'ig');
let m: RegExpExecArray | null;
let shown = 0;
console.log(`## ${page.status} ${page.finalUrl}`);
while ((m = re.exec(text)) && shown < 3) {
  console.log(`--- ${text.slice(m.index, m.index + Number(n)).replace(/\s+/g, ' ')}`);
  shown += 1;
}
if (shown === 0) console.log('(no match)');
