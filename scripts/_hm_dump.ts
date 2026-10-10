import { fetchPage } from './lib/pageCache.ts';
const [url, n = '6000', start = '0'] = process.argv.slice(2);
const page = await fetchPage(url as string);
const text = (page.display ?? page.text).replace(/\s+/g, ' ');
console.log(`## ${page.status} len=${text.length}`);
console.log(text.slice(Number(start), Number(start) + Number(n)));
