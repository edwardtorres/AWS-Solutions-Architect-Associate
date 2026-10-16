import { describe, expect, it } from 'vitest';
import { BUILDINGS } from '../data';
import { drawAttempt } from '../game/draw';
import { mulberry32 } from '../lib/rng';
import { QUESTION_META } from './meta';
import { eligible, isPostGuide, isReserve, loadQuestions } from './pool';

describe('draws over the real bank', () => {
  it('every building supplies a start-up, inspection and (portfolio) placement draw that obeys the rules', async () => {
    const bank = await loadQuestions();
    for (const b of BUILDINGS) {
      for (let seed = 1; seed <= 4; seed += 1) {
        const rnd = mulberry32(seed * 7919);
        const s = drawAttempt('startup', b.id, bank, { random: rnd, bullets: b.bullets });
        expect(s, `${b.id} start-up`).toHaveLength(2);
        const i = drawAttempt('inspection', b.id, bank, { random: rnd, bullets: b.bullets });
        expect(i, `${b.id} inspection`).toHaveLength(5);
        expect(new Set(i.map((q) => q.id)).size).toBe(5);
        expect(i.some(isReserve)).toBe(false);
        expect(i.every((q) => q.building === b.id)).toBe(true);
        expect(i.some((q) => q.difficulty >= 2), `${b.id} difficulty`).toBe(true);
        // Bullets are covered where the draw can: with 5 questions and at most 5 bullets, every bullet appears.
        for (const bullet of b.bullets) expect(i.some((q) => q.bullets.includes(bullet)), `${b.id} ${bullet}`).toBe(true);
        const prev = i.map((q) => q.id);
        const again = drawAttempt('inspection', b.id, bank, { random: rnd, prevIds: prev, bullets: b.bullets });
        // With fewer than 10 live questions the pool cannot avoid every repeat; it must avoid all it can.
        const live = eligible(bank, 'inspection').filter((q) => q.building === b.id).length;
        expect(again.filter((q) => prev.includes(q.id)).length, `${b.id} avoids previous`).toBeLessThanOrEqual(Math.max(0, 10 - live));
        if (b.portfolio && b.portfolio.length > 0) {
          const p = drawAttempt('placement', b.id, bank, { random: rnd, bullets: b.bullets });
          expect(p, `${b.id} placement`).toHaveLength(5);
          expect(p.every((q) => q.tags.includes('placement-eligible') && !isReserve(q))).toBe(true);
        }
      }
    }
  });

  it('no non-mock mode returns a mock-reserve question; the mock never returns a post-guide one', async () => {
    const bank = await loadQuestions();
    for (const mode of ['startup', 'inspection', 'placement', 'review', 'debrief'] as const) {
      expect(eligible(bank, mode).some(isReserve)).toBe(false);
    }
    expect(eligible(bank, 'mock').some(isPostGuide)).toBe(false);
  });

  it('the generated meta lists every question', async () => {
    const bank = await loadQuestions();
    // The meta also lists the puzzle scenarios (ids `<type>-NNN`); every question must be there.
    const questionIds = new Set(bank.map((q) => q.id));
    expect([...QUESTION_META.keys()].filter((id) => questionIds.has(id))).toHaveLength(bank.length);
    expect(QUESTION_META.size).toBeGreaterThan(bank.length);
    for (const q of bank) {
      const m = QUESTION_META.get(q.id);
      expect(m?.building).toBe(q.building);
      expect(m?.bullets).toEqual(q.bullets);
      expect(m?.difficulty).toBe(q.difficulty);
    }
  });
});
