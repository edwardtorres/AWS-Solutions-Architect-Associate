/** npx tsx scripts/print-question.ts <id>... : prints questions as Markdown (for the audit). */
import { loadQuestionsBundle } from './lib/loadNotes.ts';

async function main() {
  const ids = process.argv.slice(2);
  const { questions } = await loadQuestionsBundle();
  for (const id of ids) {
    const q = questions.find((x) => x.id === id);
    if (!q) throw new Error(`no question ${id}`);
    const L = 'ABCDEFGH';
    console.log(`#### ${q.id} (${q.format === 'mc' ? 'multiple choice' : `multiple response, choose ${q.select}`}, level ${q.difficulty}; bullets ${q.bullets.join(', ') || 'none (Foundation)'}; tags ${q.tags.join(', ') || 'none'})\n`);
    console.log(`${q.stem}\n`);
    q.options.forEach((o, i) => console.log(`- **${L[i]}.** ${o.text}`));
    console.log('\n**Key:** ' + q.options.flatMap((o, i) => (o.correct ? [L[i]] : [])).join(' and ') + '\n');
    q.options.forEach((o, i) => console.log(`- ${L[i]} (${o.correct ? 'correct' : 'wrong'}): ${o.why}`));
    console.log('\nEvidence sources: ' + [...new Set(q.evidence.map((e) => e.src))].join(', ') + '\n');
  }
}
main().catch((e: unknown) => { console.error(e); process.exit(1); });
