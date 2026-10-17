import { describe, expect, it } from 'vitest';
import type { Question } from '../content/types';
import { BUILDINGS } from '../data';
import { freshSave, type Save } from '../save/schema';
import { addDays } from './day';
import { DEFAULT_ENV } from './env';
import type { Ctx } from './engine';
import { accountClock, addMonths, completeLab, drawDebrief, setAccountCreated, setNote, setStep, startDebrief, submitDebriefAnswer, suggestSchedule, type LabRef } from './lab';
import { stateOf } from './lifecycle';
import { LAB_XP } from '../labs/types';

const clockAt = (iso: string) => ({ now: () => new Date(iso) });
const ctxWith = (lookup: Ctx['lookup'], iso = '2026-06-01T12:00:00Z'): Ctx => ({ env: DEFAULT_ENV, clock: clockAt(iso), lookup });

const LAB: LabRef = { id: 'lab-04-vpc', bullets: ['1.2-S1', '1.2-S2', '1.2-K3'], required: ['c1', 'c2', 'v1'] };

const q = (id: string, bullets: string[], extra: Partial<Question> = {}): Question => ({
  id,
  building: 'gatehouse',
  bullets,
  format: 'mc',
  select: 1,
  difficulty: 2,
  stem: 'stem',
  options: [
    { text: 'a', correct: true, why: 'w' },
    { text: 'b', correct: false, why: 'w' },
    { text: 'c', correct: false, why: 'w' },
    { text: 'd', correct: false, why: 'w' },
  ],
  tags: [],
  evidence: [],
  ...extra,
});
const bank: Question[] = [
  q('gatehouse-001', ['1.2-S1']),
  q('gatehouse-002', ['1.2-S2']),
  q('gatehouse-003', ['1.2-K3']),
  q('gatehouse-004', ['1.2-S1']),
  q('gatehouse-005', ['1.2-S2'], { tags: ['mock-reserve'] }),
  q('watchtower-001', ['1.2-K5']),
];
const lookup = (id: string) => bank.find((x) => x.id === id);
const tickAll = (s: Save): Save => LAB.required.reduce((acc, id) => setStep(acc, LAB.id, id, true), s);

describe('lab steps and notes', () => {
  it('ticks and unticks steps and keeps notes per step', () => {
    let s = setStep(freshSave(), LAB.id, 's1', true);
    s = setNote(s, LAB.id, 's1', 'the console looked different');
    expect(s.labs.progress[LAB.id]).toEqual({ steps: { s1: true }, notes: { s1: 'the console looked different' } });
    s = setStep(s, LAB.id, 's1', false);
    s = setNote(s, LAB.id, 's1', '   ');
    expect(s.labs.progress[LAB.id]).toEqual({ steps: {}, notes: {} });
  });
  it('caps a note at 1000 characters', () => {
    expect(setNote(freshSave(), LAB.id, 's1', 'x'.repeat(5000)).labs.progress[LAB.id]?.notes.s1).toHaveLength(1000);
  });
  it('accepts only a calendar date for the account clock', () => {
    expect(setAccountCreated(freshSave(), '2026-09-01').labs.accountCreated).toBe('2026-09-01');
    expect(setAccountCreated(freshSave(), 'tomorrow').labs.accountCreated).toBeNull();
    expect(setAccountCreated(setAccountCreated(freshSave(), '2026-09-01'), null).labs.accountCreated).toBeNull();
  });
});

describe('completing a lab', () => {
  it('needs the cleanup checklist and verification ticked, and says which are missing', () => {
    const s = setStep(freshSave(), LAB.id, 'c1', true);
    const r = completeLab(s, LAB, ctxWith(lookup));
    expect(r).toMatchObject({ ok: false, missing: ['c2', 'v1'] });
  });
  it('pays the fixed XP once, records the time and never changes a building', () => {
    const base = freshSave();
    const before = JSON.stringify(base.buildings);
    const r = completeLab(tickAll(base), LAB, ctxWith(lookup));
    if (!r.ok) throw new Error('should complete');
    expect(r.xp).toBe(LAB_XP);
    expect(r.save.game.xp).toBe(LAB_XP);
    expect(r.save.labs.progress[LAB.id]?.completedAt).toBe('2026-06-01T12:00:00.000Z');
    expect(JSON.stringify(r.save.buildings)).toBe(before);
    expect(stateOf(r.save, 'gatehouse', DEFAULT_ENV)).toBe('planned');
    const again = completeLab(r.save, LAB, ctxWith(lookup, '2026-06-02T12:00:00Z'));
    expect(again).toMatchObject({ ok: true, xp: 0 });
    if (again.ok) expect(again.save.game.xp).toBe(LAB_XP);
  });
});

describe('the debrief', () => {
  const done = (): Save => {
    const r = completeLab(tickAll(freshSave()), LAB, ctxWith(lookup));
    if (!r.ok) throw new Error('should complete');
    return r.save;
  };
  const rnd = () => 0.4;

  it('is locked until the lab is complete', () => {
    expect(startDebrief(tickAll(freshSave()), LAB, bank, ctxWith(lookup), rnd)).toMatchObject({ ok: false });
  });
  it('draws three live questions from the lab bullets, never the mock reserve, one per bullet where possible', () => {
    const picked = drawDebrief(bank, LAB.bullets, { random: rnd });
    expect(picked).toHaveLength(3);
    expect(picked.some((x) => x.tags.includes('mock-reserve'))).toBe(false);
    expect(picked.some((x) => x.id === 'watchtower-001')).toBe(false);
    expect(new Set(picked.flatMap((x) => x.bullets)).size).toBe(3);
  });
  it('resumes an unfinished debrief with the same questions', () => {
    const a = startDebrief(done(), LAB, bank, ctxWith(lookup), rnd);
    if (!a.ok) throw new Error('should start');
    const b = startDebrief(a.save, LAB, bank, ctxWith(lookup), () => 0.9);
    expect(b).toMatchObject({ ok: true, resumed: true });
    if (b.ok) expect(b.debrief.questionIds).toEqual(a.debrief.questionIds);
  });
  it('logs answers as the lab attempt type, counts them in readiness lists, pays question XP, and touches no building', () => {
    const a = startDebrief(done(), LAB, bank, ctxWith(lookup), rnd);
    if (!a.ok) throw new Error('should start');
    let s = a.save;
    const buildings = JSON.stringify(s.buildings);
    const xp0 = s.game.xp;
    const ids = a.debrief.questionIds;
    const results = ids.map((id, i) => {
      const r = submitDebriefAnswer(s, LAB.id, id, i === 0 ? [1] : [0], ctxWith(lookup));
      if (!r) throw new Error('answer refused');
      s = r.save;
      return r;
    });
    expect(results.map((r) => r.correct)).toEqual([false, true, true]);
    expect(results.map((r) => r.finished)).toEqual([false, false, true]);
    expect(s.game.xp).toBe(xp0 + 40);
    expect(s.game.log.slice(-3).map((e) => e[3])).toEqual(['lab', 'lab', 'lab']);
    expect(s.game.history[ids[0] as string]).toMatchObject({ n: 1, ok: 0, lastKind: 'lab' });
    expect(s.game.recent['1']).toHaveLength(3);
    expect(s.game.recent['1']?.every((e) => e[2] === 'lab')).toBe(true);
    expect(s.labs.progress[LAB.id]?.debrief).toMatchObject({ correct: 2 });
    expect(JSON.stringify(s.buildings)).toBe(buildings);
    // Finished: further answers are refused, and a new debrief avoids the last questions where it can.
    expect(submitDebriefAnswer(s, LAB.id, ids[0] as string, [0], ctxWith(lookup))).toBeNull();
    const again = startDebrief(s, LAB, bank, ctxWith(lookup), rnd);
    expect(again).toMatchObject({ ok: true, resumed: false });
  });
  it('refuses answers for questions that are not part of the debrief', () => {
    const a = startDebrief(done(), LAB, bank, ctxWith(lookup), rnd);
    if (!a.ok) throw new Error('should start');
    expect(submitDebriefAnswer(a.save, LAB.id, 'watchtower-001', [0], ctxWith(lookup))).toBeNull();
  });
  it('every domain-1 building exists for the readiness list used above', () => {
    expect(BUILDINGS.some((b) => b.id === 'gatehouse')).toBe(true);
  });
});

describe('the account clock', () => {
  it('adds calendar months and clamps to the end of a shorter month', () => {
    expect(addMonths('2026-03-15', 6)).toBe('2026-09-15');
    expect(addMonths('2026-08-31', 6)).toBe('2027-02-28');
    expect(addMonths('2027-08-31', 6)).toBe('2028-02-29');
    expect(addMonths('2026-10-31', 4)).toBe('2027-02-28');
  });
  it('is null without a creation date, counts days left, and expires on the end day', () => {
    expect(accountClock(null, '2026-10-17')).toBeNull();
    const c = accountClock('2026-09-01', '2026-10-17');
    expect(c).toMatchObject({ ends: '2027-03-01', daysElapsed: 46, expired: false });
    expect(c?.daysLeft).toBe(135);
    expect(c?.used).toBeGreaterThan(0.2);
    expect(accountClock('2026-09-01', '2027-03-01')).toMatchObject({ daysLeft: 0, expired: true, used: 1 });
    expect(accountClock('2026-09-01', '2027-04-01')?.expired).toBe(true);
  });
  it('treats a creation date in the future as day zero', () => {
    expect(accountClock('2026-11-01', '2026-10-17')).toMatchObject({ daysElapsed: 0, expired: false });
  });
});

describe('the suggested schedule', () => {
  const labs = Array.from({ length: 10 }, (_, i) => ({ id: `lab-${i + 1}`, minutes: 60 }));
  it('is null when under a week is left and empty when nothing remains', () => {
    expect(suggestSchedule(labs, '2026-10-17', 6)).toBeNull();
    expect(suggestSchedule([], '2026-10-17', 60)).toEqual([]);
  });
  it('keeps recommended order, never splits a lab, and fits every lab into the weeks left', () => {
    const plan = suggestSchedule(labs, '2026-10-17', 28) ?? [];
    expect(plan.length).toBeLessThanOrEqual(4);
    expect(plan.flatMap((w) => w.labs.map((l) => l.id))).toEqual(labs.map((l) => l.id));
    expect(plan[0]?.start).toBe('2026-10-17');
    expect(plan[1]?.start).toBe(addDays('2026-10-17', 7));
    expect(Math.max(...plan.map((w) => w.minutes))).toBeLessThanOrEqual(240);
  });
  it('puts everything in the one week left when only one week remains', () => {
    const plan = suggestSchedule(labs, '2026-10-17', 8) ?? [];
    expect(plan).toHaveLength(1);
    expect(plan[0]?.labs).toHaveLength(10);
  });
});
