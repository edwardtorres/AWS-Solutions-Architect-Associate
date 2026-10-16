import { describe, expect, it } from 'vitest';
import { BUILDINGS } from '../data';
import { freshSave, type Save } from '../save/schema';
import { DEFAULT_ENV } from './env';
import type { Ctx } from './engine';
import { playPuzzle, workbenchAvailability } from './puzzle';
import { computeReadiness } from './readiness';
import { stateOf } from './lifecycle';
import { addDays } from './day';

const clockAt = (iso: string) => ({ now: () => new Date(iso) });
const ctx = (iso = '2026-06-01T12:00:00Z'): Ctx => ({ env: DEFAULT_ENV, clock: clockAt(iso), lookup: () => undefined });
/** Every building commissioned except `target`, which is then surveyed. */
const around = (target: string): Save => {
  const s = freshSave();
  for (const b of BUILDINGS) if (b.id !== target) s.buildings[b.id] = { state: 'commissioned', changedAt: 'x', via: 'inspection' };
  return s;
};

describe('puzzle plays', () => {
  it('are refused while the building is planned', () => {
    const s = freshSave();
    expect(stateOf(s, 'identity-keep', DEFAULT_ENV)).toBe('planned');
    expect(workbenchAvailability(s, 'identity-keep', ctx())).toMatchObject({ ok: false });
    expect(playPuzzle(s, { id: 'puzzle-policy-court-001', building: 'identity-keep', difficulty: 2, correct: true }, ctx())).toBeNull();
  });

  it('open once the building is surveyed, under construction or commissioned', () => {
    const s = around('gatehouse');
    expect(stateOf(s, 'gatehouse', DEFAULT_ENV)).toBe('surveyed');
    expect(workbenchAvailability(s, 'gatehouse', ctx())).toEqual({ ok: true });
    s.buildings.gatehouse = { state: 'under_construction', changedAt: 'x' };
    expect(workbenchAvailability(s, 'gatehouse', ctx())).toEqual({ ok: true });
    s.buildings.gatehouse = { state: 'commissioned', changedAt: 'x', via: 'inspection' };
    expect(workbenchAvailability(s, 'gatehouse', ctx())).toEqual({ ok: true });
  });

  it('earn XP by difficulty, a quarter on repeats, and never change any building state', () => {
    const s = around('gatehouse');
    const before = JSON.stringify(s.buildings);
    const r1 = playPuzzle(s, { id: 'puzzle-packet-tracer-001', building: 'gatehouse', difficulty: 3, correct: true }, ctx()) as NonNullable<ReturnType<typeof playPuzzle>>;
    expect(r1.xp).toBe(40);
    const r2 = playPuzzle(r1.save, { id: 'puzzle-packet-tracer-001', building: 'gatehouse', difficulty: 3, correct: true }, ctx()) as NonNullable<ReturnType<typeof playPuzzle>>;
    expect(r2.xp).toBe(10);
    const r3 = playPuzzle(r2.save, { id: 'puzzle-packet-tracer-002', building: 'gatehouse', difficulty: 2, correct: false }, ctx()) as NonNullable<ReturnType<typeof playPuzzle>>;
    expect(r3.xp).toBe(0);
    expect(r3.save.game.xp).toBe(50);
    expect(JSON.stringify(r3.save.buildings)).toBe(before);
    expect(stateOf(r3.save, 'gatehouse', DEFAULT_ENV)).toBe('surveyed');
  });

  it('are logged with the puzzle attempt type and update the per-item history', () => {
    const s = around('gatehouse');
    const r = playPuzzle(s, { id: 'puzzle-packet-tracer-001', building: 'gatehouse', difficulty: 2, correct: true }, ctx()) as NonNullable<ReturnType<typeof playPuzzle>>;
    expect(r.save.game.log.at(-1)).toEqual(['puzzle-packet-tracer-001', 1, '2026-06-01T12:00:00.000Z', 'puzzle']);
    expect(r.save.game.history['puzzle-packet-tracer-001']).toMatchObject({ n: 1, ok: 1, streak: 1, lastKind: 'puzzle' });
    expect(r.save.game.recent['1']).toEqual([['puzzle-packet-tracer-001', 1, 'puzzle']]);
  });

  it('count towards the daily streak at ten plays and can earn a streak badge', () => {
    let s = around('gatehouse');
    for (let d = 1; d <= 6; d += 1) s.game.days[addDays('2026-06-01', -d)] = 10;
    for (let i = 0; i < 10; i += 1) {
      s = (playPuzzle(s, { id: `packet-tracer-${String(i + 1).padStart(3, '0')}`, building: 'gatehouse', difficulty: 1, correct: true }, ctx()) as NonNullable<ReturnType<typeof playPuzzle>>).save;
    }
    expect(s.game.days['2026-06-01']).toBe(10);
    expect(s.game.bestStreak).toBe(7);
    expect(s.game.badges['streak-7']).toBeTruthy();
  });

  it('on a Foundation earn XP but are not part of any domain, so readiness ignores them', () => {
    const s = around('town-charter');
    const r = playPuzzle(s, { id: 'puzzle-qualifier-sprint-001', building: 'town-charter', difficulty: 2, correct: true }, ctx()) as NonNullable<ReturnType<typeof playPuzzle>>;
    expect(r.xp).toBe(20);
    expect(r.save.game.recent).toEqual({});
  });

  it('feed readiness with at most 8 puzzle plays in a window', () => {
    let s = around('gatehouse');
    const meta = new Map<string, { id: string; building: string; bullets: string[]; difficulty: 1 | 2 | 3 }>();
    for (let i = 0; i < 40; i += 1) {
      const id = `packet-tracer-${String(i + 1).padStart(3, '0')}`;
      meta.set(id, { id, building: 'gatehouse', bullets: ['1.2-K3'], difficulty: 2 });
      s = (playPuzzle(s, { id, building: 'gatehouse', difficulty: 2, correct: i < 20 }, ctx()) as NonNullable<ReturnType<typeof playPuzzle>>).save;
    }
    const d1 = computeReadiness(s.game.recent, meta, DEFAULT_ENV).domains[0];
    // Puzzle plays alone never reach the 10-answer minimum: a domain needs real inspection or placement answers too.
    expect(d1?.answers).toBe(8);
    expect(d1?.value).toBeNull();
    // With 12 right inspection answers before them, the window is 12 right + the 8 most recent puzzle plays (all wrong).
    const base = freshSave();
    for (let i = 0; i < 12; i += 1) {
      const id = `gatehouse-${String(i + 1).padStart(3, '0')}`;
      meta.set(id, { id, building: 'gatehouse', bullets: ['1.2-K3'], difficulty: 2 });
      base.game.recent['1'] = [...(base.game.recent['1'] ?? []), [id, 1, 'inspection']];
    }
    base.game.recent['1'] = [...(base.game.recent['1'] ?? []), ...(s.game.recent['1'] ?? [])];
    const withBase = computeReadiness(base.game.recent, meta, DEFAULT_ENV).domains[0];
    expect(withBase?.answers).toBe(20);
    expect(withBase?.accuracy).toBeCloseTo(12 / 20, 10);
  });
});
