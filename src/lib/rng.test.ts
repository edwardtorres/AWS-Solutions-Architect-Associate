import { describe, expect, it } from 'vitest';
import { mulberry32, renderRandom, shuffle } from './rng';

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it('shuffles without losing or duplicating items, and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(input, mulberry32(7));
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('puts every item in every position over many shuffles (no fixed answer positions)', () => {
    const counts = Array.from({ length: 4 }, () => new Map<string, number>());
    const rand = mulberry32(2026);
    for (let i = 0; i < 4000; i += 1) {
      shuffle(['a', 'b', 'c', 'd'], rand).forEach((v, pos) => {
        const m = counts[pos] as Map<string, number>;
        m.set(v, (m.get(v) ?? 0) + 1);
      });
    }
    for (const m of counts) for (const v of ['a', 'b', 'c', 'd']) expect(m.get(v) ?? 0).toBeGreaterThan(800);
  });

  it('honours the dev seed only in dev builds', () => {
    globalThis.__SAA_SEED__ = 5;
    expect(renderRandom()()).toBe(mulberry32(5)());
    globalThis.__SAA_SEED__ = undefined;
  });
});
