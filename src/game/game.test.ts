import { describe, expect, it } from 'vitest';
import type { Question } from '../content/types';
import { buildGraph } from '../lib/graph';
import { mulberry32 } from '../lib/rng';
import { freshSave, type Save } from '../save/schema';
import { addDays, dayDiff, localDay, type Clock } from './day';
import { BADGES } from './badges';
import { abandonAttempt, addFlag, completeAttempt, markNotesOpened, removeFlag, submitAnswer, type Ctx } from './engine';
import { startAttempt } from './start';
import type { GameEnv } from './env';
import { exportFlags } from './flags';
import { drawAttempt } from './draw';
import { inspectionLockedUntil, nextAction, placementAvailability, startupAvailability, stateOf } from './lifecycle';
import { computeReadiness, type QMeta } from './readiness';
import { rankFor, RANKS } from './ranks';
import { streakInfo, longestStreak } from './streak';
import { xpForAnswer } from './xp';
import { recordResult } from './history';

// Synthetic city: sq (start) -> a -> b ; sq -> c (portfolio). Districts: square, citadel, harbor, express, treasury.
const ids = ['sq', 'a', 'b', 'c', 'h1', 'e1', 't1'];
const graph = buildGraph(ids, [
  { from: 'sq', to: 'a' },
  { from: 'a', to: 'b' },
  { from: 'sq', to: 'c' },
  { from: 'sq', to: 'h1' },
  { from: 'sq', to: 'e1' },
  { from: 'sq', to: 't1' },
]);
const district: Record<string, string> = { sq: 'square', a: 'citadel', b: 'citadel', c: 'citadel', h1: 'harbor', e1: 'express', t1: 'treasury' };
const bulletsMap: Record<string, string[]> = { sq: [], a: ['1.1-K1', '1.1-K2'], b: ['1.2-K1'], c: ['1.3-K1'], h1: ['2.1-K1'], e1: ['3.1-K1'], t1: ['4.1-K1'] };
const domains: Record<string, number | null> = { square: null, citadel: 1, harbor: 2, express: 3, treasury: 4 };
const env: GameEnv = {
  graph,
  startIds: new Set(['sq']),
  buildingIds: ids,
  portfolio: new Set(['c']),
  districtOf: (id) => district[id] ?? '',
  bulletsOf: (id) => bulletsMap[id] ?? [],
  domainOf: (id) => domains[district[id] ?? ''] ?? null,
  weights: { 1: 30, 2: 26, 3: 24, 4: 20 },
};

let counter = 0;
const q = (building: string, over: Partial<Question> = {}): Question => {
  counter += 1;
  return {
    id: `${building}-${String(counter).padStart(3, '0')}`,
    building,
    bullets: bulletsMap[building]?.slice(0, 1) ?? [],
    format: 'mc',
    select: 1,
    difficulty: 2,
    stem: 'stem',
    options: [
      { text: 'right', correct: true, why: 'x' },
      { text: 'b', correct: false, why: 'x' },
      { text: 'c', correct: false, why: 'x' },
      { text: 'd', correct: false, why: 'x' },
    ],
    tags: [],
    evidence: [],
    ...over,
  };
};
const mk = (building: string, n: number, over: Partial<Question> = {}) => Array.from({ length: n }, (_, i) => q(building, { bullets: [bulletsMap[building]?.[i % Math.max(1, bulletsMap[building]?.length ?? 1)] ?? ''].filter(Boolean), ...over }));
const bank: Question[] = [
  ...mk('sq', 14, { bullets: [] }),
  ...mk('a', 10),
  ...mk('b', 10),
  ...mk('c', 10, { tags: ['placement-eligible'] }),
  ...mk('c', 4),
  ...mk('a', 3, { tags: ['mock-reserve'] }),
  ...mk('h1', 8),
  ...mk('e1', 8),
  ...mk('t1', 8),
];
const byId = new Map(bank.map((x) => [x.id, x]));

function clockAt(iso: string, timeZone?: string): { clock: Clock; set: (iso: string) => void } {
  let t = new Date(iso);
  return { clock: { now: () => t, timeZone }, set: (v) => { t = new Date(v); } };
}
const ctxOf = (clock: Clock): Ctx => ({ env, clock, lookup: (id) => byId.get(id) });
const wrongIndex = (question: Question) => question.options.findIndex((o) => !o.correct);
const rightIndex = (question: Question) => question.options.findIndex((o) => o.correct);

function answerAll(save: Save, ctx: Ctx, rights: boolean[]): Save {
  let s = save;
  const a = s.game.active as NonNullable<Save['game']['active']>;
  a.questionIds.forEach((id, i) => {
    const question = byId.get(id) as Question;
    const pick = rights[i] ? rightIndex(question) : wrongIndex(question);
    s = (submitAnswer(s, id, [pick], ctx) as { save: Save }).save;
  });
  return s;
}

function run(save: Save, kind: 'startup' | 'inspection' | 'placement', building: string, ctx: Ctx, rights: boolean[], seed = 1) {
  const started = startAttempt(save, kind, building, bank, ctx, mulberry32(seed));
  if (!started.ok) return { started, save, summary: null };
  const answered = answerAll(started.save, ctx, rights);
  const done = completeAttempt(answered, ctx);
  return { started, save: (done as NonNullable<typeof done>).save, summary: (done as NonNullable<typeof done>).summary };
}

describe('local days and DST', () => {
  it('computes the calendar date in a zone', () => {
    expect(localDay(new Date('2026-03-01T03:30:00Z'), 'America/New_York')).toBe('2026-02-28');
    expect(localDay(new Date('2026-03-01T05:30:00Z'), 'America/New_York')).toBe('2026-03-01');
  });
  it('treats 1 Nov 2026 (clocks go back) as one day with a repeated hour', () => {
    const tz = 'America/New_York';
    // 01:30 EDT and 01:30 EST are the same calendar day.
    expect(localDay(new Date('2026-11-01T05:30:00Z'), tz)).toBe('2026-11-01');
    expect(localDay(new Date('2026-11-01T06:30:00Z'), tz)).toBe('2026-11-01');
    // 23:59 local on 31 Oct is still the 31st; 00:00 EDT on 1 Nov is the 1st.
    expect(localDay(new Date('2026-11-01T03:59:59Z'), tz)).toBe('2026-10-31');
    expect(localDay(new Date('2026-11-01T04:00:00Z'), tz)).toBe('2026-11-01');
    // The 25-hour day ends at 00:00 EST on 2 Nov = 05:00Z.
    expect(localDay(new Date('2026-11-02T04:59:59Z'), tz)).toBe('2026-11-01');
    expect(localDay(new Date('2026-11-02T05:00:00Z'), tz)).toBe('2026-11-02');
  });
  it('adds days by calendar, across month, year and DST changes', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(dayDiff('2026-10-31', '2026-11-02')).toBe(2);
  });
});

describe('unlock propagation and lifecycle', () => {
  it('derives planned and surveyed from commissioned prerequisites', () => {
    const { clock } = clockAt('2026-06-01T12:00:00Z');
    const ctx = ctxOf(clock);
    let s = freshSave();
    expect(stateOf(s, 'sq', env)).toBe('surveyed');
    expect(stateOf(s, 'a', env)).toBe('planned');
    s = markNotesOpened(s, 'sq', ctx);
    s = run(s, 'startup', 'sq', ctx, [true, true], 1).save;
    expect(stateOf(s, 'sq', env)).toBe('under_construction');
    expect(stateOf(s, 'a', env)).toBe('planned'); // under construction does not unlock
    s = run(s, 'inspection', 'sq', ctx, [true, true, true, true, true], 2).save;
    expect(stateOf(s, 'sq', env)).toBe('commissioned');
    expect(stateOf(s, 'a', env)).toBe('surveyed');
    expect(stateOf(s, 'b', env)).toBe('planned');
  });

  it('start-up needs surveyed state and opened notes', () => {
    const { clock } = clockAt('2026-06-01T12:00:00Z');
    const ctx = ctxOf(clock);
    const s = freshSave();
    expect(startupAvailability(s, 'sq', env)).toMatchObject({ ok: false, code: 'notes-first' });
    expect(startupAvailability(s, 'a', env)).toMatchObject({ ok: false, code: 'wrong-state' });
    const opened = markNotesOpened(s, 'sq', ctx);
    expect(startupAvailability(opened, 'sq', env)).toEqual({ ok: true });
    expect(startAttempt(s, 'startup', 'sq', bank, ctx, mulberry32(1)).ok).toBe(false);
  });

  it('a failed start-up check changes nothing and the retry draws different questions', () => {
    const { clock } = clockAt('2026-06-01T12:00:00Z');
    const ctx = ctxOf(clock);
    let s = markNotesOpened(freshSave(), 'sq', ctx);
    const r1 = run(s, 'startup', 'sq', ctx, [true, false], 1);
    expect(r1.summary?.passed).toBe(false);
    expect(stateOf(r1.save, 'sq', env)).toBe('surveyed');
    const first = r1.save.game.startups.sq?.prevIds ?? [];
    s = r1.save;
    const second = startAttempt(s, 'startup', 'sq', bank, ctx, mulberry32(9));
    expect(second.ok && second.attempt.questionIds.some((id) => first.includes(id))).toBe(false);
  });

  it('inspection needs under construction and passes at 4 of 5 but not 3 of 5', () => {
    const { clock } = clockAt('2026-06-01T12:00:00Z');
    const ctx = ctxOf(clock);
    let s = markNotesOpened(freshSave(), 'sq', ctx);
    expect(startAttempt(s, 'inspection', 'sq', bank, ctx, mulberry32(1)).ok).toBe(false);
    s = run(s, 'startup', 'sq', ctx, [true, true]).save;
    const three = run(s, 'inspection', 'sq', ctx, [true, true, true, false, false]);
    expect(three.summary).toMatchObject({ passed: false, correct: 3, need: 4 });
    expect(stateOf(three.save, 'sq', env)).toBe('under_construction');
    const four = run(three.save, 'inspection', 'sq', ctx, [true, true, true, true, false], 5);
    expect(four.summary).toMatchObject({ passed: true, correct: 4, commissioned: true });
    expect(four.save.buildings.sq?.via).toBe('inspection');
    expect(stateOf(four.save, 'sq', env)).toBe('commissioned');
    // The commissioning bonus is paid once.
    expect(four.summary?.bonus).toBe(50);
  });

  it('refuses a second attempt while one is active and resumes the same one', () => {
    const { clock } = clockAt('2026-06-01T12:00:00Z');
    const ctx = ctxOf(clock);
    const s = markNotesOpened(freshSave(), 'sq', ctx);
    const first = startAttempt(s, 'startup', 'sq', bank, ctx, mulberry32(1));
    if (!first.ok) throw new Error('should start');
    const again = startAttempt(first.save, 'startup', 'sq', bank, ctx, mulberry32(999));
    expect(again).toMatchObject({ ok: true, resumed: true });
    if (again.ok) expect(again.attempt.questionIds).toEqual(first.attempt.questionIds);
    const other = startAttempt(first.save, 'placement', 'c', bank, ctx, mulberry32(2));
    expect(other).toMatchObject({ ok: false });
    expect(completeAttempt(first.save, ctx)).toBeNull(); // not all answered
  });

  it('nextAction follows the lifecycle', () => {
    const { clock } = clockAt('2026-06-01T12:00:00Z');
    const ctx = ctxOf(clock);
    let s = freshSave();
    expect(nextAction(s, 'a', env, '2026-06-01')).toBe('locked-planned');
    expect(nextAction(s, 'sq', env, '2026-06-01')).toBe('notes');
    s = markNotesOpened(s, 'sq', ctx);
    expect(nextAction(s, 'sq', env, '2026-06-01')).toBe('startup');
    s = run(s, 'startup', 'sq', ctx, [true, true]).save;
    expect(nextAction(s, 'sq', env, '2026-06-01')).toBe('inspection');
    s = run(s, 'inspection', 'sq', ctx, [true, true, true, true, true]).save;
    expect(nextAction(s, 'sq', env, '2026-06-01')).toBe('done');
  });
});

describe('inspection retry lock', () => {
  const setup = (zone?: string, at = '2026-06-01T12:00:00Z') => {
    const c = clockAt(at, zone);
    const ctx = ctxOf(c.clock);
    let s = markNotesOpened(freshSave(), 'sq', ctx);
    s = run(s, 'startup', 'sq', ctx, [true, true]).save;
    return { ...c, ctx, s };
  };
  it('locks after the second failure in a local day and unlocks the next day', () => {
    const { ctx, s, set } = setup();
    const f1 = run(s, 'inspection', 'sq', ctx, [false, false, false, false, false], 1);
    expect(f1.summary?.locked).toBe(false);
    const f2 = run(f1.save, 'inspection', 'sq', ctx, [false, false, false, false, false], 2);
    expect(f2.summary?.locked).toBe(true);
    expect(inspectionLockedUntil(f2.save, 'sq', '2026-06-01')).toBe('2026-06-02');
    const blocked = startAttempt(f2.save, 'inspection', 'sq', bank, ctx, mulberry32(3));
    expect(blocked).toMatchObject({ ok: false, availability: { code: 'locked' } });
    expect(blocked.ok ? '' : blocked.availability.message).toMatch(/tomorrow/);
    set('2026-06-02T08:00:00Z');
    expect(startAttempt(f2.save, 'inspection', 'sq', bank, ctx, mulberry32(3)).ok).toBe(true);
  });
  it('one failure does not lock, and a failure yesterday does not count today', () => {
    const { ctx, s, set } = setup();
    const f1 = run(s, 'inspection', 'sq', ctx, [false, false, false, false, false], 1);
    set('2026-06-02T12:00:00Z');
    const f2 = run(f1.save, 'inspection', 'sq', ctx, [false, false, false, false, false], 2);
    expect(f2.summary?.locked).toBe(false);
    expect(f2.save.game.inspections.sq?.fails).toBe(1);
  });
  it('the lock lifts at local midnight across the 1 Nov 2026 clock change', () => {
    const tz = 'America/New_York';
    const { ctx, s, set } = setup(tz, '2026-11-01T05:10:00Z'); // 01:10 EDT on 1 Nov
    const f1 = run(s, 'inspection', 'sq', ctx, [false, false, false, false, false], 1);
    set('2026-11-01T06:10:00Z'); // 01:10 EST, same local day
    const f2 = run(f1.save, 'inspection', 'sq', ctx, [false, false, false, false, false], 2);
    expect(f2.summary?.locked).toBe(true);
    set('2026-11-02T04:59:00Z'); // 23:59 EST on 1 Nov: still locked
    expect(startAttempt(f2.save, 'inspection', 'sq', bank, ctx, mulberry32(3)).ok).toBe(false);
    set('2026-11-02T05:00:00Z'); // 00:00 EST on 2 Nov
    expect(startAttempt(f2.save, 'inspection', 'sq', bank, ctx, mulberry32(3)).ok).toBe(true);
  });
  it('walking away from an inspection counts as a failure', () => {
    const { ctx, s } = setup();
    const st = startAttempt(s, 'inspection', 'sq', bank, ctx, mulberry32(1));
    if (!st.ok) throw new Error('start');
    const left = abandonAttempt(st.save, ctx);
    expect(left.game.active).toBeNull();
    expect(left.game.inspections.sq?.fails).toBe(1);
  });
  it('inspection draws avoid the previous attempt', () => {
    const { ctx, s } = setup();
    const f1 = run(s, 'inspection', 'sq', ctx, [false, false, false, false, false], 1);
    const prev = f1.save.game.inspections.sq?.prevIds ?? [];
    const next = startAttempt(f1.save, 'inspection', 'sq', bank, ctx, mulberry32(2));
    expect(next.ok && next.attempt.questionIds.filter((id) => prev.includes(id))).toEqual([]);
  });
});

describe('placement', () => {
  const setup = (at = '2026-06-01T12:00:00Z', zone?: string) => {
    const c = clockAt(at, zone);
    return { ...c, ctx: ctxOf(c.clock) };
  };
  it('is portfolio-only and works while planned', () => {
    const { ctx } = setup();
    const s = freshSave();
    expect(stateOf(s, 'c', env)).toBe('planned');
    expect(placementAvailability(s, 'c', env, '2026-06-01')).toEqual({ ok: true });
    expect(placementAvailability(s, 'a', env, '2026-06-01')).toMatchObject({ code: 'not-portfolio' });
    expect(startAttempt(s, 'placement', 'a', bank, ctx, mulberry32(1)).ok).toBe(false);
  });
  it('needs all 5 right, uses only placement-eligible questions, commissions with via placement and unlocks dependents', () => {
    const { ctx } = setup();
    const s = freshSave();
    const st = startAttempt(s, 'placement', 'c', bank, ctx, mulberry32(1));
    if (!st.ok) throw new Error('start');
    expect(st.attempt.questionIds).toHaveLength(5);
    expect(st.attempt.questionIds.every((id) => byId.get(id)?.tags.includes('placement-eligible'))).toBe(true);
    const fail = run(s, 'placement', 'c', ctx, [true, true, true, true, false]);
    expect(fail.summary).toMatchObject({ passed: false, correct: 4 });
    expect(stateOf(fail.save, 'c', env)).toBe('planned');
    const pass = run(s, 'placement', 'c', ctx, [true, true, true, true, true]);
    expect(pass.summary).toMatchObject({ passed: true, commissioned: true });
    expect(pass.save.buildings.c).toMatchObject({ state: 'commissioned', via: 'placement' });
  });
  it('allows one attempt started per local day and resumes after a reload', () => {
    const { ctx, set } = setup();
    const s = freshSave();
    const fail = run(s, 'placement', 'c', ctx, [false, false, false, false, false]);
    const again = startAttempt(fail.save, 'placement', 'c', bank, ctx, mulberry32(2));
    expect(again).toMatchObject({ ok: false, availability: { code: 'placement-used' } });
    set('2026-06-02T09:00:00Z');
    expect(startAttempt(fail.save, 'placement', 'c', bank, ctx, mulberry32(2)).ok).toBe(true);
  });
  it('counts the attempt when it starts, so abandoning does not give a free retry', () => {
    const { ctx } = setup();
    const st = startAttempt(freshSave(), 'placement', 'c', bank, ctx, mulberry32(1));
    if (!st.ok) throw new Error('start');
    const left = abandonAttempt(st.save, ctx);
    expect(startAttempt(left, 'placement', 'c', bank, ctx, mulberry32(2)).ok).toBe(false);
    // But the unfinished attempt itself resumes.
    expect(startAttempt(st.save, 'placement', 'c', bank, ctx, mulberry32(2))).toMatchObject({ ok: true, resumed: true });
  });
  it('the placement day follows local time across the 1 Nov 2026 change', () => {
    const tz = 'America/New_York';
    const { ctx, set } = setup('2026-11-01T05:30:00Z', tz); // 01:30 EDT
    const fail = run(freshSave(), 'placement', 'c', ctx, [false, false, false, false, false]);
    set('2026-11-01T06:30:00Z'); // 01:30 EST: same local day
    expect(startAttempt(fail.save, 'placement', 'c', bank, ctx, mulberry32(2)).ok).toBe(false);
    set('2026-11-02T04:59:00Z'); // 23:59 EST
    expect(startAttempt(fail.save, 'placement', 'c', bank, ctx, mulberry32(2)).ok).toBe(false);
    set('2026-11-02T05:00:00Z');
    expect(startAttempt(fail.save, 'placement', 'c', bank, ctx, mulberry32(2)).ok).toBe(true);
  });
  it('is not offered once commissioned', () => {
    const { ctx } = setup();
    const pass = run(freshSave(), 'placement', 'c', ctx, [true, true, true, true, true]);
    expect(placementAvailability(pass.save, 'c', env, '2026-06-02')).toMatchObject({ code: 'already-commissioned' });
  });
});

describe('draw rules', () => {
  it('never returns mock-reserve and covers each bullet where possible', () => {
    for (let seed = 1; seed < 40; seed += 1) {
      const picked = drawAttempt('inspection', 'a', bank, { random: mulberry32(seed), bullets: env.bulletsOf('a') });
      expect(picked).toHaveLength(5);
      expect(new Set(picked.map((x) => x.id)).size).toBe(5);
      expect(picked.some((x) => x.tags.includes('mock-reserve'))).toBe(false);
      expect(picked.some((x) => x.difficulty >= 2)).toBe(true);
      for (const b of env.bulletsOf('a')) expect(picked.some((x) => x.bullets.includes(b))).toBe(true);
    }
  });
  it('forces a difficulty 2 or 3 question into an inspection when most are easy', () => {
    const easy = [...mk('a', 12, { difficulty: 1 }), q('a', { difficulty: 3 })];
    for (let seed = 1; seed < 30; seed += 1) {
      expect(drawAttempt('inspection', 'a', easy, { random: mulberry32(seed), bullets: env.bulletsOf('a') }).some((x) => x.difficulty >= 2)).toBe(true);
    }
  });
  it('prefers less-seen questions and the start-up check has 2 questions', () => {
    const seen = Object.fromEntries(bank.filter((x) => x.building === 'b').slice(0, 5).map((x) => [x.id, 3]));
    const picked = drawAttempt('inspection', 'b', bank, { random: mulberry32(4), seen, bullets: env.bulletsOf('b') });
    expect(picked.every((x) => !(x.id in seen))).toBe(true);
    expect(drawAttempt('startup', 'b', bank, { random: mulberry32(4), bullets: env.bulletsOf('b') })).toHaveLength(2);
  });
  it('falls back to previous questions when the pool is too small to avoid them', () => {
    const small = mk('a', 5);
    const picked = drawAttempt('inspection', 'a', small, { random: mulberry32(1), prevIds: small.map((x) => x.id), bullets: env.bulletsOf('a') });
    expect(picked).toHaveLength(5);
  });
});

describe('scoring, XP and ranks', () => {
  it('gives full credit only: a multiple-response answer must be exactly the keyed set', () => {
    const { clock } = clockAt('2026-06-01T12:00:00Z');
    const ctx = ctxOf(clock);
    const mr = q('sq', {
      format: 'mr',
      select: 2,
      options: [
        { text: 'r1', correct: true, why: '' },
        { text: 'r2', correct: true, why: '' },
        { text: 'w1', correct: false, why: '' },
        { text: 'w2', correct: false, why: '' },
        { text: 'w3', correct: false, why: '' },
      ],
    });
    const custom: Ctx = { ...ctx, lookup: (id) => (id === mr.id ? mr : byId.get(id)) };
    const base = markNotesOpened(freshSave(), 'sq', ctx);
    const withActive = (): Save => ({ ...base, game: { ...base.game, active: { id: 'x', kind: 'startup', building: 'sq', questionIds: [mr.id], seed: 1, startedAt: '', day: '2026-06-01', answers: {} } } });
    expect(submitAnswer(withActive(), mr.id, [0, 1], custom)?.correct).toBe(true);
    expect(submitAnswer(withActive(), mr.id, [0], custom)?.correct).toBe(false);
    expect(submitAnswer(withActive(), mr.id, [0, 2], custom)?.correct).toBe(false);
    expect(submitAnswer(withActive(), mr.id, [0, 1, 2], custom)?.correct).toBe(false);
  });
  it('awards XP by difficulty and a quarter for repeats', () => {
    expect([1, 2, 3].map((d) => xpForAnswer(d as 1 | 2 | 3, true, 0))).toEqual([10, 20, 40]);
    expect([1, 2, 3].map((d) => xpForAnswer(d as 1 | 2 | 3, true, 1))).toEqual([3, 5, 10]);
    expect(xpForAnswer(3, false, 0)).toBe(0);
  });
  it('accumulates XP, the seen count and the bonus through an attempt, and ignores a double submit', () => {
    const { clock } = clockAt('2026-06-01T12:00:00Z');
    const ctx = ctxOf(clock);
    let s = markNotesOpened(freshSave(), 'sq', ctx);
    const r = run(s, 'startup', 'sq', ctx, [true, true]);
    expect(r.save.game.xp).toBe(40); // two difficulty-2 questions at 20
    expect(Object.values(r.save.game.seen)).toEqual([1, 1]);
    const id = Object.keys(r.save.game.seen)[0] as string;
    s = r.save;
    const again = submitAnswer(s, id, [0], ctx);
    expect(again).toBeNull(); // no active attempt
    const second = run(s, 'inspection', 'sq', ctx, [true, true, true, true, true], 3);
    expect(second.save.game.xp).toBeGreaterThanOrEqual(40 + 50);
  });
  it('maps XP to ranks', () => {
    expect(RANKS[0]?.name).toBe('Surveyor');
    expect(rankFor(0).rank.name).toBe('Surveyor');
    expect(rankFor(149).rank.name).toBe('Surveyor');
    expect(rankFor(150).rank.name).toBe('Apprentice');
    expect(rankFor(13000).rank.name).toBe('Chief Architect');
    expect(rankFor(99999).next).toBeNull();
  });
});

describe('answer history', () => {
  it('summarises every answer per item and feeds the readiness lists, with start-up checks left out', () => {
    const { clock } = clockAt('2026-06-01T12:00:00Z');
    const ctx = ctxOf(clock);
    let s = markNotesOpened(freshSave(), 'sq', ctx);
    s = run(s, 'startup', 'sq', ctx, [true, false]).save;
    expect(Object.values(s.game.history)).toHaveLength(2);
    expect(Object.values(s.game.history).map((h) => h.lastKind)).toEqual(['startup', 'startup']);
    expect(s.game.recent).toEqual({}); // Foundations have no domain, and start-up checks never count
    s = run(s, 'startup', 'sq', ctx, [true, true], 5).save;
    s = run(s, 'inspection', 'sq', ctx, [true, true, true, true, true], 6).save;
    const total = Object.values(s.game.history).reduce((n, h) => n + h.n, 0);
    expect(total).toBe(s.game.log.length);
    const repeated = Object.values(s.game.history).filter((h) => h.n > 1);
    for (const h of repeated) expect(h.streak).toBeLessThanOrEqual(h.n);
  });
  it('keeps history and the domain lists when the answer log is trimmed', () => {
    const { clock } = clockAt('2026-06-01T12:00:00Z');
    const ctx = ctxOf(clock);
    let s = markNotesOpened(freshSave(), 'a', ctx);
    s = { ...s, buildings: { ...s.buildings, a: { state: 'under_construction', changedAt: 'x' } }, game: { ...s.game, log: Array.from({ length: 4000 }, (_, i) => [`old-${i}`, 1, 'x', 'inspection'] as Save['game']['log'][number]) } };
    s = run(s, 'inspection', 'a', ctx, [true, true, true, true, true]).save;
    expect(s.game.log).toHaveLength(4000);
    expect(s.game.log.some((e) => e[0] === 'old-0')).toBe(false);
    expect(Object.keys(s.game.history)).toHaveLength(5);
    expect(s.game.recent['1']).toHaveLength(5);
  });
});

describe('streaks', () => {
  const days = (map: Record<string, number>) => map;
  it('counts a day only at 10 questions', () => {
    expect(streakInfo(days({ '2026-06-01': 9 }), '2026-06-01')).toEqual({ current: 0, countedToday: false });
    expect(streakInfo(days({ '2026-06-01': 10 }), '2026-06-01')).toEqual({ current: 1, countedToday: true });
  });
  it('keeps yesterday’s streak alive until today ends, and resets after a gap', () => {
    const d = days({ '2026-05-30': 12, '2026-05-31': 10 });
    expect(streakInfo(d, '2026-06-01').current).toBe(2);
    expect(streakInfo(d, '2026-06-02').current).toBe(0);
  });
  it('runs across the 1 Nov 2026 clock change and longest streak works', () => {
    const d = days({ '2026-10-31': 10, '2026-11-01': 10, '2026-11-02': 10, '2026-11-05': 10 });
    expect(streakInfo(d, '2026-11-02').current).toBe(3);
    expect(longestStreak(d)).toBe(3);
  });
  it('records the best streak while answering', () => {
    const c = clockAt('2026-06-01T12:00:00Z');
    const ctx = ctxOf(c.clock);
    let s = markNotesOpened(freshSave(), 'sq', ctx);
    s.game.days['2026-05-31'] = 10;
    s = run(s, 'startup', 'sq', ctx, [true, true]).save;
    s = { ...s, game: { ...s.game, days: { ...s.game.days, '2026-06-01': 9 } } };
    s = run(s, 'inspection', 'sq', ctx, [true, true, true, true, true], 7).save;
    expect(s.game.bestStreak).toBe(2);
  });
});

describe('badges', () => {
  it('has the ten required badges', () => {
    expect(BADGES.map((b) => b.id).sort()).toEqual(['district-citadel', 'district-express', 'district-harbor', 'district-treasury', 'flawless', 'foundations', 'portfolio', 'streak-30', 'streak-7', 'whole-city']);
  });
  it('awards flawless for 5 of 5 only, foundations, portfolio and districts, once', () => {
    const { clock } = clockAt('2026-06-01T12:00:00Z');
    const ctx = ctxOf(clock);
    let s = markNotesOpened(freshSave(), 'sq', ctx);
    s = run(s, 'startup', 'sq', ctx, [true, true]).save;
    const four = run(s, 'inspection', 'sq', ctx, [true, true, true, true, false], 3);
    expect(four.summary?.newBadges).toContain('foundations');
    expect(four.summary?.newBadges).not.toContain('flawless');
    const s2 = markNotesOpened(freshSave(), 'sq', ctx);
    const s3 = run(s2, 'startup', 'sq', ctx, [true, true]).save;
    const five = run(s3, 'inspection', 'sq', ctx, [true, true, true, true, true], 3);
    expect(five.summary?.newBadges).toEqual(expect.arrayContaining(['flawless', 'foundations']));
    const place = run(five.save, 'placement', 'c', ctx, [true, true, true, true, true]);
    expect(place.summary?.newBadges).toContain('portfolio');
    expect(Object.keys(place.save.game.badges)).toEqual(expect.arrayContaining(['flawless', 'foundations', 'portfolio']));
  });
  it('awards 7 and 30 day streaks and the whole city', () => {
    const { clock } = clockAt('2026-06-30T12:00:00Z');
    const ctx = ctxOf(clock);
    let s = freshSave();
    for (let i = 0; i < 30; i += 1) s.game.days[addDays('2026-06-30', -i)] = 10;
    for (const id of ids) s.buildings[id] = { state: 'commissioned', changedAt: 'x', via: 'inspection' };
    s = markNotesOpened(s, 'sq', ctx);
    const placed = run({ ...s, buildings: { ...s.buildings, c: { state: 'under_construction', changedAt: 'x' } } }, 'placement', 'c', ctx, [true, true, true, true, true]);
    expect(placed.summary?.newBadges).toEqual(expect.arrayContaining(['streak-7', 'streak-30', 'whole-city', 'district-citadel', 'district-harbor', 'district-express', 'district-treasury']));
  });
});

describe('readiness', () => {
  const meta = new Map<string, QMeta>();
  const add = (building: string, n: number, bullet: string) => {
    for (let i = 0; i < n; i += 1) meta.set(`${building}-m${i}`, { id: `${building}-m${i}`, building, bullets: [bullet], difficulty: 2 });
  };
  add('a', 40, '1.1-K1');
  add('h1', 40, '2.1-K1');
  add('e1', 40, '3.1-K1');
  add('t1', 40, '4.1-K1');
  type Kind = 'inspection' | 'startup' | 'placement' | 'puzzle';
  const entry = (building: string, i: number, correct: boolean, kind: Kind = 'inspection') => ({ id: `${building}-m${i}`, ok: correct, kind, domain: env.domainOf(building) });
  /** Builds the readiness lists the way the engine does: one recordResult per answer, in order. */
  const recentOf = (entries: ReturnType<typeof entry>[]) => {
    let g = freshSave().game;
    for (const e of entries) g = { ...g, ...recordResult(g, { ...e, at: '2026-06-01T00:00:00.000Z' }) };
    return g.recent;
  };
  it('shows a dash until a domain has 10 counted answers and ignores start-up checks', () => {
    const log = [...Array.from({ length: 30 }, (_, i) => entry('a', i, true, 'startup')), ...Array.from({ length: 9 }, (_, i) => entry('a', i, true))];
    const r = computeReadiness(recentOf(log), meta, env);
    expect(r.domains[0]).toMatchObject({ answers: 9, value: null });
    expect(r.overall).toBeNull();
    const ten = computeReadiness(recentOf([...log, entry('a', 9, true)]), meta, env);
    expect(ten.domains[0]?.value).not.toBeNull();
  });
  it('multiplies recent accuracy by bullet coverage and weights domains 30/26/24/20', () => {
    const full = (b: string) => Array.from({ length: 10 }, (_, i) => entry(b, i, true));
    const log = [...full('a'), ...full('h1'), ...full('e1'), ...full('t1')];
    // Domain 1 has 4 bullets (a, b, c) and only one is covered: coverage 0.25. The others have 1 bullet: coverage 1.
    const r = computeReadiness(recentOf(log), meta, env);
    expect(r.domains.map((d) => d.value)).toEqual([0.25, 1, 1, 1]);
    expect(r.overall).toBeCloseTo(0.3 * 0.25 + 0.26 + 0.24 + 0.2, 10);
  });
  it('uses only the latest 30 answers for accuracy and counts placements', () => {
    const old = Array.from({ length: 40 }, (_, i) => entry('h1', i, false));
    const latest = Array.from({ length: 30 }, (_, i) => entry('h1', i, true, 'placement'));
    const r = computeReadiness(recentOf([...old, ...latest]), meta, env);
    expect(r.domains[1]?.accuracy).toBe(1);
  });
  it('lets at most the 8 most recent puzzle plays into a domain window', () => {
    // 30 correct inspection answers, then 20 wrong puzzle plays: only 8 puzzle plays count, so 22 of the last 30 are right.
    const good = Array.from({ length: 30 }, (_, i) => entry('h1', i, true));
    const puzzles = Array.from({ length: 20 }, (_, i) => entry('h1', i, false, 'puzzle'));
    const r = computeReadiness(recentOf([...good, ...puzzles]), meta, env);
    expect(r.domains[1]?.answers).toBe(38);
    expect(r.domains[1]?.accuracy).toBeCloseTo(22 / 30, 10);
  });
  it('keeps the older puzzle plays out even when they were good, and the newest 8 in', () => {
    const old = Array.from({ length: 12 }, (_, i) => entry('h1', i, true, 'puzzle'));
    const base = Array.from({ length: 30 }, (_, i) => entry('h1', i, false));
    const recent = Array.from({ length: 8 }, (_, i) => entry('h1', i, true, 'puzzle'));
    const r = computeReadiness(recentOf([...old, ...base, ...recent]), meta, env);
    // Stream = 30 wrong inspection answers + the 8 newest puzzle plays; the last 30 = 22 wrong + 8 right puzzle plays.
    expect(r.domains[1]?.answers).toBe(38);
    expect(r.domains[1]?.accuracy).toBeCloseTo(8 / 30, 10);
  });
  it('never changes a readiness figure when the recent lists are pruned', () => {
    const many = Array.from({ length: 400 }, (_, i) => entry('h1', i % 40, i % 3 !== 0, i % 7 === 0 ? 'puzzle' : 'inspection'));
    const full = computeReadiness(recentOf(many), meta, env).domains[1];
    const tail = computeReadiness(recentOf(many.slice(-130)), meta, env).domains[1];
    expect(full?.accuracy).toBe(tail?.accuracy);
    expect(full?.coverage).toBe(tail?.coverage);
  });
});

describe('flags', () => {
  it('adds, exports and removes flags', () => {
    const { clock } = clockAt('2026-06-01T12:00:00Z');
    const question = byId.get(bank[0]?.id as string) as Question;
    let s = addFlag(freshSave(), question.id, '  unclear wording  ', [1], { clock });
    expect(s.game.flags).toHaveLength(1);
    const text = exportFlags(s.game.flags, (id) => byId.get(id));
    expect(text).toContain(`Question: ${question.id}`);
    expect(text).toContain('My note: unclear wording');
    expect(text).toContain('My answer: b');
    expect(text).toContain('The key: right');
    s = removeFlag(s, s.game.flags[0]?.id as string);
    expect(s.game.flags).toHaveLength(0);
    expect(exportFlags([], () => undefined)).toMatch(/No flagged/);
  });
});
