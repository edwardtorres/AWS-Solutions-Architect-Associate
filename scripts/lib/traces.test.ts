import { describe, expect, it } from 'vitest';
import { loadPuzzles } from './loadPuzzles';
import { dedupeTrace } from '../../src/puzzles/types';

describe('explanation traces', () => {
  it('merges lines with the same note and keeps every rule', () => {
    const ev = dedupeTrace({ answer: {}, trace: [{ rule: 'a', note: 'x' }, { rule: 'b', note: 'x' }, { rule: 'c', note: 'y' }] });
    expect(ev?.trace).toEqual([{ rule: 'a', note: 'x', also: ['b'] }, { rule: 'c', note: 'y' }]);
  });

  it('no explanation of any scenario repeats a line', async () => {
    const mods = await loadPuzzles();
    expect(mods.size).toBe(7);
    for (const [type, mod] of mods) {
      for (const s of mod.scenarios) {
        const ev = mod.def.evaluate(s.data);
        if (!ev) continue;
        const notes = ev.trace.map((t) => t.note.trim());
        const dup = notes.filter((n, i) => notes.indexOf(n) !== i);
        expect(dup, `${type} ${s.id}`).toEqual([]);
        const lines = notes.flatMap((n) => n.split('\n').map((l) => l.trim()).filter(Boolean));
        expect(lines.filter((n, i) => lines.indexOf(n) !== i), `${type} ${s.id} (lines)`).toEqual([]);
      }
    }
  });
});
