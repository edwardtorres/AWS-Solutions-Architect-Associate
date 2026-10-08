/** Research helper: npm run page -- <url> [regex] [max]. Prints status and matching context from the cached page text. */
import { fetchPage } from './lib/pageCache.ts';

const [url, pattern, max = '5'] = process.argv.slice(2);
if (!url) {
  console.error('usage: npm run page -- <url> [regex] [max]');
  process.exit(2);
}
const page = await fetchPage(url);
console.log(`${page.status} ${page.finalUrl} (${page.text.length} chars, ${page.ids.length} ids)`);
if (pattern) {
  const re = new RegExp(pattern, 'ig');
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(page.text)) && n < Number(max)) {
    console.log(`\n...${page.text.slice(Math.max(0, m.index - 160), m.index + 420)}...`);
    n += 1;
  }
  if (n === 0) console.log('no match');
}
