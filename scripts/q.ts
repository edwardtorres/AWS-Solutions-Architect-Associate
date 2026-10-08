/**
 * Research helper: npm run q -- <url> <regex> [<regex> ...]
 * Prints the sentences of the page that match each pattern, in the page's own capitalisation,
 * ready to paste into a quote. Pages are cached in .cache/.
 */
import { fetchPage } from './lib/pageCache.ts';

const [url, ...patterns] = process.argv.slice(2);
if (!url || patterns.length === 0) {
  console.error('usage: npm run q -- <url> <regex> [<regex> ...]');
  process.exit(2);
}
const page = await fetchPage(url);
let text = page.display;
if (!text) {
  const again = await fetchPage(url, { fresh: true });
  text = again.display ?? again.text;
}
console.log(`## ${page.status} ${page.finalUrl}`);
const sentences = (text ?? '').split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/);
for (const pat of patterns) {
  const re = new RegExp(pat, 'i');
  const hits = sentences.filter((s) => re.test(s)).slice(0, 4);
  console.log(`- /${pat}/ -> ${hits.length} hit(s)`);
  for (const h of hits) console.log(`    "${h.length > 420 ? `${h.slice(0, 420)}…` : h}"`);
}
