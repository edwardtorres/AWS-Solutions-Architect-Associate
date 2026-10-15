/**
 * npx tsx scripts/post-guide-scan.ts [feature-id]
 * Lists which questions (and note blocks) match each registry feature's patterns, whether they declare it,
 * and which options match the predecessor patterns. Used while building and checking content/post-guide.json.
 */
import { loadNotesBundle, loadQuestionsBundle } from './lib/loadNotes.ts';
import { questionBody } from './lib/questionChecks.ts';
import { everyBlock } from './lib/notesChecks.ts';

async function main() {
  const only = process.argv[2];
  const { questions, postGuide } = await loadQuestionsBundle();
  const bundle = await loadNotesBundle();
  for (const f of postGuide.features) {
    if (only && f.id !== only) continue;
    const re = f.patterns.map((p) => new RegExp(p, 'i'));
    const pre = (f.predecessorPatterns ?? []).map((p) => new RegExp(p, 'i'));
    const hits = questions.filter((q) => re.some((r) => r.test(questionBody(q))));
    console.log(`\n## ${f.id} (${f.introduced}, ${f.certainty}): ${hits.length} questions`);
    for (const q of hits) {
      const declared = (q.postGuide ?? []).includes(f.id);
      const key = (q.postGuideKey ?? []).includes(f.id);
      const predOpts = q.options.filter((o) => pre.some((r) => r.test(o.text))).length;
      console.log(`  ${q.id}${q.tags.includes('mock-reserve') ? ' [R]' : ''}${q.tags.includes('placement-eligible') ? ' [P]' : ''} declared=${declared} key=${key} predecessorOptions=${predOpts}`);
    }
    const blocks = [...everyBlock(bundle)].filter(({ block }) => re.some((r) => r.test(block.text)));
    if (blocks.length > 0) console.log(`  notes blocks: ${blocks.length} (${[...new Set(blocks.map((b) => b.where.split(' ')[0]))].join(', ')})`);
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
