import { describe, expect, it } from 'vitest';
import type { Question } from '../content/types';
import { mulberry32 } from '../lib/rng';
import { draw, eligible, isReserve, type DrawMode } from './pool';
import { isCorrect, present } from './present';

const make = (id: string, tags: string[], building = 'b1', bullets = ['1.1-K1']): Question => ({
  id,
  building,
  bullets,
  format: 'mc',
  select: 1,
  difficulty: 2,
  stem: id,
  options: [
    { text: 'a', correct: true, why: 'x' },
    { text: 'b', correct: false, why: 'x' },
    { text: 'c', correct: false, why: 'x' },
    { text: 'd', correct: false, why: 'x' },
  ],
  tags,
  evidence: [],
});

const bank = [make('live', []), make('placed', ['placement-eligible']), make('reserve', ['mock-reserve']), make('other', [], 'b2', ['1.2-K1'])];

describe('question pool', () => {
  const modes: DrawMode[] = ['startup', 'inspection', 'placement', 'review', 'debrief', 'browse'];
  it('never returns a mock-reserve question outside the mock', () => {
    for (const mode of modes) {
      expect(eligible(bank, mode).some(isReserve)).toBe(false);
      for (let seed = 0; seed < 20; seed += 1) {
        expect(draw(bank, mode, 10, mulberry32(seed)).some(isReserve)).toBe(false);
      }
    }
    expect(eligible(bank, 'mock').some(isReserve)).toBe(true);
  });

  it('placement only uses placement-eligible questions', () => {
    expect(eligible(bank, 'placement').map((q) => q.id)).toEqual(['placed']);
  });

  it('filters by building and bullet and respects the count', () => {
    expect(draw(bank, 'review', 10, mulberry32(1), { building: 'b2' }).map((q) => q.id)).toEqual(['other']);
    expect(draw(bank, 'review', 10, mulberry32(1), { bullet: '1.1-K1' }).map((q) => q.id).sort()).toEqual(['live', 'placed']);
    expect(draw(bank, 'review', 1, mulberry32(1))).toHaveLength(1);
    expect(draw(bank, 'review', 0, mulberry32(1))).toHaveLength(0);
  });
});

describe('question presentation', () => {
  it('shuffles options without losing any and grades by authored index', () => {
    const q = make('q', []);
    const orders = new Set<string>();
    for (let seed = 0; seed < 30; seed += 1) {
      const p = present(q, mulberry32(seed));
      expect(p.options.map((o) => o.index).sort()).toEqual([0, 1, 2, 3]);
      orders.add(p.options.map((o) => o.index).join(''));
    }
    expect(orders.size).toBeGreaterThan(5);
    expect(isCorrect(q, [0])).toBe(true);
    expect(isCorrect(q, [1])).toBe(false);
    expect(isCorrect(q, [0, 1])).toBe(false);
  });

  it('grades multiple response as all or nothing', () => {
    const q = make('m', []);
    q.format = 'mr';
    q.select = 2;
    q.options[1]!.correct = true;
    expect(isCorrect(q, [0, 1])).toBe(true);
    expect(isCorrect(q, [0])).toBe(false);
    expect(isCorrect(q, [0, 1, 2])).toBe(false);
  });
});
