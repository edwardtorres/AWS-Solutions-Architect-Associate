/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { DEFAULT_ENV } from '../../src/game/env';
import { drawMock } from '../../src/game/mockDraw';
import type { ItemHistory } from '../../src/save/schema';
import { loadQuestionsBundle } from './loadNotes';

/** The draw against the real question bank: exact weights, no post-guide question, and how the 130 reserve questions are used. */
describe('the mock draw on the real bank', async () => {
  const { questions } = await loadQuestionsBundle();
  let s = 11;
  const random = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const input = (history: Record<string, ItemHistory>, lastMockIds: string[]) => ({
    bank: questions,
    history,
    seen: {},
    startDay: '2026-06-10',
    timeZone: 'UTC',
    total: 65,
    weights: DEFAULT_ENV.weights,
    domainOf: DEFAULT_ENV.domainOf,
    lastMockIds,
    random,
  });
  const answered = (ids: string[]): Record<string, ItemHistory> => Object.fromEntries(ids.map((id) => [id, { n: 1, ok: 1, streak: 1, last: '2026-06-10T10:00:00.000Z', lastOk: 1, lastKind: 'mock' } as ItemHistory]));
  const byDomain = (qs: { building: string }[]) => [1, 2, 3, 4].map((d) => qs.filter((q) => DEFAULT_ENV.domainOf(q.building) === d).length);

  it('has 130 reserve questions and none of them is post-guide', () => {
    const reserve = questions.filter((q) => q.tags.includes('mock-reserve'));
    expect(reserve).toHaveLength(130);
    expect(reserve.some((q) => q.tags.includes('post-guide'))).toBe(false);
  });
  it('draws the first two mocks from the reserve, then a third from what is left plus live questions', () => {
    const one = drawMock(input({}, []));
    expect(one.questions).toHaveLength(65);
    expect(byDomain(one.questions)).toEqual([19, 17, 16, 13]);
    expect(one.reserveUsed).toBe(65);
    const two = drawMock(input(answered(one.questions.map((q) => q.id)), one.questions.map((q) => q.id)));
    expect(byDomain(two.questions)).toEqual([19, 17, 16, 13]);
    expect(two.reserveUsed).toBeGreaterThanOrEqual(63);
    expect(two.questions.some((q) => one.questions.some((o) => o.id === q.id))).toBe(false);
    console.log(`mock 1 reserve ${one.reserveUsed}/65 ${JSON.stringify(one.perDomain)}; mock 2 reserve ${two.reserveUsed}/65 ${JSON.stringify(two.perDomain)}`);
    const three = drawMock(input(answered([...one.questions, ...two.questions].map((q) => q.id)), two.questions.map((q) => q.id)));
    expect(byDomain(three.questions)).toEqual([19, 17, 16, 13]);
    expect(three.reserveUsed).toBe(130 - one.reserveUsed - two.reserveUsed);
    for (const m of [one, two, three]) {
      expect(m.questions.some((q) => q.tags.includes('post-guide'))).toBe(false);
      expect(new Set(m.questions.map((q) => q.id)).size).toBe(65);
      expect(m.questions.some((q) => DEFAULT_ENV.domainOf(q.building) === null)).toBe(false);
    }
    console.log(`mock 3 reserve ${three.reserveUsed}/65`);
  });
});
