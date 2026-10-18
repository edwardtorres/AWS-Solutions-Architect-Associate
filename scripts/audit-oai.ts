/**
 * npx tsx scripts/audit-oai.ts
 * Lists every question option that names origin access identity (OAI) or origin access control (OAC), with its correct flag, and flags
 * any wrong OAI option whose explanation rejects it in favour of OAC (the exam guide predates OAC, so OAI must not be marked wrong for that reason).
 */
import { loadQuestionsBundle } from './lib/loadNotes.ts';

const OAI = /origin access identit|\boai\b/i;
const OAC = /origin access control|\boac\b/i;
const { questions } = await loadQuestionsBundle();
let flagged = 0;
let listed = 0;
for (const q of questions) {
  for (const [i, o] of q.options.entries()) {
    if (!OAI.test(o.text) && !OAC.test(o.text)) continue;
    listed += 1;
    const kind = OAI.test(o.text) ? 'OAI' : 'OAC';
    const bad = kind === 'OAI' && !o.correct && (OAC.test(o.why) || /recommend|legacy|newer|replac|deprecat/i.test(o.why));
    if (bad) flagged += 1;
    console.log(`${bad ? 'FLAG ' : '     '}${q.id} option ${i + 1} ${kind} ${o.correct ? 'CORRECT' : 'wrong  '} postGuide=${(q.postGuide ?? []).join(',') || '-'}\n       option: ${o.text.slice(0, 110)}\n       why:    ${o.why.slice(0, 160)}`);
  }
}
console.log(`\n${listed} OAI/OAC options listed, ${flagged} flagged (a wrong OAI option explained by OAC, recommendation or legacy status).`);
process.exit(flagged > 0 ? 1 : 0);
