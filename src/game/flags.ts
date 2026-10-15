import type { Question } from '../content/types';
import type { Flag } from '../save/schema';

/** Plain-text export the player can paste back: question id, note, the chosen answer and the key. */
export function exportFlags(flags: readonly Flag[], lookup: (id: string) => Question | undefined): string {
  if (flags.length === 0) return 'No flagged questions.\n';
  const lines: string[] = [`Flagged questions (${flags.length})`, ''];
  for (const f of flags) {
    const q = lookup(f.questionId);
    lines.push(`Question: ${f.questionId}`);
    lines.push(`Flagged: ${f.at}`);
    lines.push(`My note: ${f.note.trim() || '(none)'}`);
    if (q) {
      lines.push(`My answer: ${f.myAnswer.length === 0 ? '(no answer)' : f.myAnswer.map((i) => q.options[i]?.text ?? `option ${i + 1}`).join(' | ')}`);
      lines.push(`The key: ${q.options.filter((o) => o.correct).map((o) => o.text).join(' | ')}`);
    } else {
      lines.push(`My answer (authored option numbers): ${f.myAnswer.map((i) => i + 1).join(', ') || '(no answer)'}`);
      lines.push('The key: (question not found in this version of the app)');
    }
    lines.push('');
  }
  return `${lines.join('\n')}`;
}
