import type { LabProgress } from '../save/schema';
import type { Lab } from './types';

export const EXPORT_WARNING = 'Do not paste account IDs, ARNs with account numbers, access keys or email addresses into a problem note.';

/** Plain text of one lab's progress and problem notes, for pasting back to the author. Notes are the owner's own words. */
export function exportLabNotes(labs: readonly { lab: Lab; progress: LabProgress | undefined }[], day: string): string {
  const out: string[] = ['Region Builder lab notes', `Exported: ${day}`, EXPORT_WARNING, ''];
  for (const { lab, progress } of labs) {
    const ticked = lab.steps.filter((s) => progress?.steps[s.id]).length;
    out.push(`== Lab ${lab.n}: ${lab.title} (${lab.id})`, `Steps ticked: ${ticked} of ${lab.steps.length}. Completed: ${progress?.completedAt ? 'yes' : 'no'}.`);
    const noted = lab.steps.flatMap((s, i) => (progress?.notes[s.id] ? [{ s, i }] : []));
    if (noted.length === 0) out.push('No problems reported.');
    for (const { s, i } of noted) out.push('', `Step ${i + 1} [${s.id}]${s.kind && s.kind !== 'do' ? ` (${s.kind})` : ''}: ${s.text}`, `Problem: ${progress?.notes[s.id] ?? ''}`);
    out.push('');
  }
  return out.join('\n').trimEnd() + '\n';
}
