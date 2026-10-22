import { describe, expect, it } from 'vitest';
import scenarios from '../../../content/puzzles/qualifier-sprint';
import { QUALIFIERS, def } from './def';
import { MIN_SCENARIOS } from '../types';

describe('qualifier-sprint scenarios', () => {
  it('has enough sets with ascending unique ids (003, 005, 007 and 013 were dropped; ids are never reused)', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(MIN_SCENARIOS['qualifier-sprint']);
    const nums = scenarios.map((s) => Number(s.id.slice(-3)));
    expect(nums).toEqual([...new Set(nums)].sort((a, b) => a - b));
    expect(nums).not.toContain(3);
    expect(nums).not.toContain(5);
    expect(nums).not.toContain(7);
    scenarios.forEach((s) => {
      expect(s.id).toMatch(/^puzzle-qualifier-sprint-\d{3}$/);
      expect(s.type).toBe('qualifier-sprint');
      expect(s.building).toBe('town-charter');
      expect(s.bullets).toEqual([]);
      expect([1, 2, 3]).toContain(s.difficulty);
    });
  });

  it.each(scenarios.map((s) => [s.id, s] as const))('%s evaluates and is well formed', (_id, s) => {
    const ev = def.evaluate(s.data);
    expect(ev).not.toBeNull();
    const ids = s.data.options.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(4);
    expect(ids.length).toBeLessThanOrEqual(5);
    for (const q of QUALIFIERS) {
      expect(ids).toContain(s.data.answers[q.id]);
      expect(ev!.answer[q.id]).toEqual([s.data.answers[q.id]]);
      const f = s.data.facts[q.id];
      expect(f.quote.length).toBeGreaterThanOrEqual(20);
      expect(f.text.length).toBeGreaterThan(10);
      expect(f.src.length).toBeGreaterThan(0);
    }
    expect(new Set(Object.values(s.data.answers)).size).toBeGreaterThanOrEqual(3);
    expect(def.evaluate(s.data)).toEqual(ev);
    expect(def.scenarioRules!(s.data)).toHaveLength(4);
  });

  it('refuses an answer that is not an option', () => {
    const s = scenarios[0]!;
    expect(def.evaluate({ ...s.data, answers: { ...s.data.answers, cost: 'zzz' } })).toBeNull();
  });

  it('does not always put the same qualifier on the same option position', () => {
    const positions = new Set(scenarios.map((s) => s.data.options.findIndex((o) => o.id === s.data.answers.overhead)));
    expect(positions.size).toBeGreaterThanOrEqual(3);
  });
});
