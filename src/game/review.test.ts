import { describe, expect, it } from 'vitest';
import type { Question } from '../content/types';
import { BUILDINGS } from '../data';
import { freshSave, type ItemHistory, type Save } from '../save/schema';
import { DEFAULT_ENV } from './env';
import type { Ctx } from './engine';
import { computeReadiness } from './readiness';
import { recordResult } from './history';
import { buildingsNeedingMaintenance, maintenanceStatus } from './maintenance';
import { DAILY_CAP, INTERVALS, dueDay, dueQueue, intervalDays, remainingToday } from './review';
import { planMaintenance, planReview } from './reviewDraw';
import { abandonReview, completeReview, openSession, submitReviewAnswer } from './reviewSession';
import { backfillByBullet, familyStats, rankBullets, rankTraps } from './weak';
import { stateOf } from './lifecycle';
import { QUESTION_META } from '../questions/meta';

const clockAt = (iso: string, timeZone?: string) => ({ now: () => new Date(iso), timeZone });
const q = (id: string, bullets: string[], extra: Partial<Question> = {}): Question => ({
  id,
  building: id.replace(/-\d{3}$/, ''),
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
const mkBank = (): Question[] => {
  const out: Question[] = [];
  for (let i = 1; i <= 30; i += 1) out.push(q(`gatehouse-${String(i).padStart(3, '0')}`, [['1.2-K3', '1.2-S1', '1.2-S2'][i % 3] as string]));
  for (let i = 1; i <= 8; i += 1) out.push(q(`watchtower-${String(i).padStart(3, '0')}`, ['1.2-K5']));
  out.push(q('gatehouse-900', ['1.2-S1'], { tags: ['mock-reserve'] }));
  return out;
};
const bank = mkBank();
const lookup = (id: string) => bank.find((x) => x.id === id);
const ctx = (iso = '2026-06-10T12:00:00Z'): Ctx => ({ env: DEFAULT_ENV, clock: clockAt(iso), lookup });
const hist = (over: Partial<ItemHistory>): ItemHistory => ({ n: 3, ok: 2, streak: 1, last: '2026-06-09T10:00:00.000Z', lastOk: 1, lastKind: 'inspection', ...over });
const random = () => 0.5;
const withHistory = (h: Record<string, ItemHistory>): Save => ({ ...freshSave(), game: { ...freshSave().game, history: h } });

describe('review intervals', () => {
  it('are 1, 2, 4, 7, 14 and 30 days for a correct run, and a miss comes back the next day', () => {
    expect(INTERVALS).toEqual([1, 2, 4, 7, 14, 30]);
    expect([1, 2, 3, 4, 5, 6, 7, 20].map((streak) => intervalDays({ lastOk: 1, streak }))).toEqual([1, 2, 4, 7, 14, 30, 30, 30]);
    expect(intervalDays({ lastOk: 0, streak: 0 })).toBe(1);
  });
  it('count from the local day of the last answer, in the player’s zone', () => {
    // 23:30 UTC on 9 June is already 10 June in Auckland and still 9 June in New York.
    const h = hist({ last: '2026-06-09T23:30:00.000Z', streak: 2, lastOk: 1 });
    expect(dueDay(h, 'UTC')).toBe('2026-06-11');
    expect(dueDay(h, 'Pacific/Auckland')).toBe('2026-06-12');
    expect(dueDay(h, 'America/New_York')).toBe('2026-06-11');
  });
  it('behave across a 25-hour day (1 Nov 2026 in New York)', () => {
    const h = hist({ last: '2026-10-31T12:00:00.000Z', streak: 1, lastOk: 1 });
    expect(dueDay(h, 'America/New_York')).toBe('2026-11-01');
  });
});

describe('the due queue', () => {
  const live = (id: string) => !!lookup(id) && !lookup(id)?.tags.includes('mock-reserve');
  it('lists what is due on or before today, most overdue first, then the lower run, and skips puzzles and the reserve', () => {
    const h = {
      'gatehouse-001': hist({ last: '2026-06-09T10:00:00Z', streak: 1 }), // due 10 Jun = today
      'gatehouse-002': hist({ last: '2026-06-01T10:00:00Z', streak: 1 }), // due 2 Jun: 8 days overdue
      'gatehouse-003': hist({ last: '2026-06-05T10:00:00Z', streak: 2, lastOk: 1 }), // due 7 Jun: 3 overdue
      'gatehouse-004': hist({ last: '2026-06-09T10:00:00Z', streak: 3 }), // due 13 Jun: not due
      'gatehouse-005': hist({ last: '2026-06-09T10:00:00Z', streak: 0, lastOk: 0 }), // miss: due today
      'gatehouse-900': hist({ last: '2026-05-01T10:00:00Z', streak: 1 }), // reserve: never reviewed
      'puzzle-packet-tracer-001': hist({ last: '2026-05-01T10:00:00Z', streak: 1 }),
      'not-in-the-bank-001': hist({ last: '2026-05-01T10:00:00Z', streak: 1 }),
    };
    const queue = dueQueue(h, live, '2026-06-10', 'UTC');
    expect(queue.map((d) => d.id)).toEqual(['gatehouse-002', 'gatehouse-003', 'gatehouse-005', 'gatehouse-001']);
    expect(queue.map((d) => d.overdue)).toEqual([8, 3, 0, 0]);
  });
  it('treats a miss on a mock as due the next day like any miss', () => {
    const h = { 'gatehouse-001': hist({ last: '2026-06-09T10:00:00Z', streak: 0, lastOk: 0, lastKind: 'mock' }) };
    expect(dueQueue(h, live, '2026-06-10', 'UTC')).toHaveLength(1);
  });
});

describe('planning the daily review', () => {
  const manyDue = (n: number): Record<string, ItemHistory> => Object.fromEntries(bank.filter((x) => x.building === 'gatehouse' && x.id !== 'gatehouse-900').slice(0, n).map((x) => [x.id, hist({ last: '2026-06-01T10:00:00Z', streak: 1 })]));
  const c = ctx();
  it('is capped at 25 answers per local day even when more are due', () => {
    const save = withHistory(manyDue(30));
    const plan = planReview(save, bank, '2026-06-10', c, random);
    expect(plan.questions).toHaveLength(DAILY_CAP);
    expect(plan.dueTotal).toBe(30);
    expect(plan.due).toBe(25);
  });
  it('leaves only what remains of the cap after answers today, and nothing once the cap is reached', () => {
    const save = withHistory(manyDue(30));
    save.game.reviewDay = { day: '2026-06-10', done: 20 };
    expect(planReview(save, bank, '2026-06-10', c, random).questions).toHaveLength(5);
    save.game.reviewDay = { day: '2026-06-10', done: 25 };
    expect(planReview(save, bank, '2026-06-10', c, random)).toMatchObject({ remaining: 0, questions: [] });
    save.game.reviewDay = { day: '2026-06-09', done: 25 }; // yesterday's count does not carry over
    expect(remainingToday(save.game.reviewDay, '2026-06-10')).toBe(25);
  });
  it('tops up from the weakest bullets when fewer are due, never from the reserve or today’s answers', () => {
    const save = withHistory({ 'gatehouse-001': hist({ last: '2026-06-01T10:00:00Z', streak: 1 }), 'gatehouse-004': hist({ last: '2026-06-10T08:00:00Z', streak: 1 }) });
    save.game.byBullet = { '1.2-S1': '0001', '1.2-K5': '1111', '1.2-K3': '1011' };
    const plan = planReview(save, bank, '2026-06-10', c, random);
    expect(plan.questions[0]?.id).toBe('gatehouse-001'); // the due one comes first
    expect(plan.questions).toHaveLength(25);
    const ids = plan.questions.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain('gatehouse-900'); // mock-reserve is never reviewed
    expect(ids).not.toContain('gatehouse-004'); // answered today
    // The weakest bullet (1.2-S1, 1 of 4) contributes before the strongest (1.2-K5, 4 of 4).
    const firstS1 = ids.findIndex((id) => lookup(id)?.bullets.includes('1.2-S1'));
    const firstK5 = ids.findIndex((id) => lookup(id)?.bullets.includes('1.2-K5'));
    expect(firstS1).toBeGreaterThan(-1);
    expect(firstK5 === -1 || firstS1 < firstK5).toBe(true);
  });
  it('plans nothing for a fresh save except a top-up, and the reserve question is never in it', () => {
    const plan = planReview(freshSave(), bank, '2026-06-10', c, random);
    expect(plan.dueTotal).toBe(0);
    expect(plan.questions.map((x) => x.id)).not.toContain('gatehouse-900');
  });
});

describe('a review session', () => {
  const open = (kind: 'review' | 'maintenance' = 'review') => {
    const questions = bank.filter((x) => x.building === 'gatehouse').slice(0, 3);
    return openSession(freshSave(), kind, kind === 'maintenance' ? 'gatehouse' : null, questions, ctx(), random);
  };
  it('logs answers as review, counts them in readiness, pays XP with the repeat rule and never touches a building', () => {
    let s = open();
    const buildings = JSON.stringify(s.buildings);
    const ids = s.game.review?.questionIds ?? [];
    const a = submitReviewAnswer(s, ids[0] as string, [0], ctx()) as NonNullable<ReturnType<typeof submitReviewAnswer>>;
    expect(a).toMatchObject({ correct: true, xp: 20 });
    s = a.save;
    const b = submitReviewAnswer(s, ids[1] as string, [2], ctx()) as NonNullable<ReturnType<typeof submitReviewAnswer>>;
    expect(b).toMatchObject({ correct: false, xp: 0 });
    s = b.save;
    expect(s.game.log.slice(-2).map((e) => e[3])).toEqual(['review', 'review']);
    expect(s.game.recent['1']?.map((e) => e[2])).toEqual(['review', 'review']);
    expect(s.game.history[ids[0] as string]).toMatchObject({ n: 1, ok: 1, lastKind: 'review' });
    expect(s.game.reviewDay).toEqual({ day: '2026-06-10', done: 2 });
    expect(s.game.maint.gatehouse).toBe('10');
    expect(s.game.byBullet[lookup(ids[0] as string)?.bullets[0] as string]).toBe('1');
    expect(JSON.stringify(s.buildings)).toBe(buildings);
    // A repeat of the same question pays a quarter.
    const again = openSession(s, 'review', null, [lookup(ids[0] as string) as Question], ctx('2026-06-11T12:00:00Z'), random);
    expect(submitReviewAnswer(again, ids[0] as string, [0], ctx('2026-06-11T12:00:00Z'))).toMatchObject({ xp: 5 });
  });
  it('counts only daily review answers against the cap, not maintenance sets', () => {
    const s = open('maintenance');
    const r = submitReviewAnswer(s, s.game.review?.questionIds[0] as string, [0], ctx()) as NonNullable<ReturnType<typeof submitReviewAnswer>>;
    expect(r.save.game.reviewDay).toEqual({ day: '', done: 0 });
    expect(r.save.game.maint.gatehouse).toBe('1');
  });
  it('refuses a question outside the session, completes only when all are answered, and can be left', () => {
    let s = open();
    expect(submitReviewAnswer(s, 'watchtower-001', [0], ctx())).toBeNull();
    const ids = s.game.review?.questionIds ?? [];
    expect(completeReview(s, ctx())).toBeNull();
    for (const id of ids) s = (submitReviewAnswer(s, id, [0], ctx()) as NonNullable<ReturnType<typeof submitReviewAnswer>>).save;
    const done = completeReview(s, ctx()) as NonNullable<ReturnType<typeof completeReview>>;
    expect(done.summary).toMatchObject({ kind: 'review', correct: 3, total: 3 });
    expect(done.save.game.review).toBeNull();
    expect(abandonReview(open()).game.review).toBeNull();
  });
});

describe('maintenance', () => {
  const save = (bits: string): Save => ({ ...freshSave(), game: { ...freshSave().game, maint: { gatehouse: bits } } });
  it('needs at least 5 answers in the last 8 and under 60% right, and only on a commissioned building', () => {
    expect(maintenanceStatus(save('0000'), 'gatehouse', 'commissioned').needed).toBe(false); // 4 answers: not enough
    expect(maintenanceStatus(save('00011'), 'gatehouse', 'commissioned')).toMatchObject({ needed: true, n: 5, correct: 2 }); // 40%
    expect(maintenanceStatus(save('00111'), 'gatehouse', 'commissioned').needed).toBe(false); // exactly 60% is fine
    expect(maintenanceStatus(save('01011'), 'gatehouse', 'commissioned').needed).toBe(false);
    expect(maintenanceStatus(save('00001'), 'gatehouse', 'under_construction').needed).toBe(false);
    expect(maintenanceStatus(save('00001'), 'gatehouse', 'surveyed').needed).toBe(false);
    expect(maintenanceStatus(save('10010011'), 'gatehouse', 'commissioned')).toMatchObject({ needed: true, n: 8, correct: 4 }); // 50% of 8
  });
  it('recovers by itself and lists the buildings that need it', () => {
    const states = new Map([['gatehouse', 'commissioned' as const], ['watchtower', 'commissioned' as const]]);
    const s = { ...freshSave(), game: { ...freshSave().game, maint: { gatehouse: '00010', watchtower: '11111' } } };
    expect(buildingsNeedingMaintenance(s, states)).toEqual(['gatehouse']);
    s.game.maint.gatehouse = '00110111'; // five of the last eight right (62%)
    expect(buildingsNeedingMaintenance(s, states)).toEqual([]);
  });
  it('is driven only by review and mock results, kept to the last 8', () => {
    let g = freshSave().game;
    const item = { ok: false, at: 'x', domain: 1, building: 'gatehouse' };
    for (const kind of ['startup', 'inspection', 'placement', 'puzzle', 'lab'] as const) g = { ...g, ...recordResult(g, { ...item, id: `gatehouse-001`, kind }) };
    expect(g.maint).toEqual({});
    for (let i = 0; i < 10; i += 1) g = { ...g, ...recordResult(g, { ...item, id: `gatehouse-001`, kind: i % 2 ? 'review' : 'mock', ok: i < 3 }) };
    expect(g.maint.gatehouse).toBe('10000000'); // the first two of ten fell out of the window of 8
  });
  it('plans five questions, recent misses first, never the reserve', () => {
    const s = freshSave();
    s.game.history = {
      'gatehouse-010': hist({ lastOk: 0, streak: 0, last: '2026-06-08T10:00:00Z' }),
      'gatehouse-011': hist({ lastOk: 0, streak: 0, last: '2026-06-09T10:00:00Z' }),
      'gatehouse-012': hist({ lastOk: 1, streak: 1, ok: 1, n: 2 }),
    };
    const plan = planMaintenance(s, 'gatehouse', bank, random);
    expect(plan).toHaveLength(5);
    expect(plan.slice(0, 3).map((x) => x.id)).toEqual(['gatehouse-011', 'gatehouse-010', 'gatehouse-012']);
    expect(plan.map((x) => x.id)).not.toContain('gatehouse-900');
    expect(plan.every((x) => x.building === 'gatehouse')).toBe(true);
  });
});

describe('Weak Spots', () => {
  it('ranks bullets weakest first and says "not enough data" under 3 answers', () => {
    const rows = rankBullets({ a: '1111', b: '0100', c: '01', d: '1' }, ['a', 'b', 'c', 'd', 'e']);
    expect(rows.map((r) => r.bullet)).toEqual(['b', 'a', 'c', 'd', 'e']);
    expect(rows.find((r) => r.bullet === 'b')).toMatchObject({ n: 4, correct: 1, accuracy: 0.25 });
    expect(rows.find((r) => r.bullet === 'c')).toMatchObject({ n: 2, accuracy: null });
    expect(rows.find((r) => r.bullet === 'e')).toMatchObject({ n: 0, accuracy: null });
  });
  it('breaks accuracy ties by the number of answers behind the score', () => {
    expect(rankBullets({ x: '10', y: '1010', z: '101010' }, ['x', 'y', 'z']).map((r) => r.bullet)).toEqual(['z', 'y', 'x']);
  });
  it('ranks don’t-confuse pairs by misses, leaving out pairs never missed', () => {
    expect(rankTraps({ a: { n: 5, miss: 1 }, b: { n: 4, miss: 3 }, c: { n: 2, miss: 0 }, d: { n: 3, miss: 3 } }).map((t) => t.pair)).toEqual(['d', 'b', 'a']);
  });
  it('pools weak service families over their buildings’ bullets and waits for enough answers', () => {
    const b = [
      { families: ['networking-content-delivery' as const], bullets: ['x1', 'x2'] },
      { families: ['networking-content-delivery' as const, 'compute' as const], bullets: ['x3'] },
      { families: ['database' as const], bullets: ['d1'] },
    ];
    const stats = familyStats({ x1: '00010', x2: '0010', x3: '0001', d1: '1111111111' }, b);
    const net = stats.find((s) => s.family === 'networking-content-delivery');
    expect(net).toMatchObject({ n: 13, correct: 3, weak: true });
    expect(stats.find((s) => s.family === 'compute')).toMatchObject({ n: 4, accuracy: null, weak: false });
    expect(stats.find((s) => s.family === 'database')).toMatchObject({ accuracy: 1, weak: false });
    expect(stats[0]?.family).toBe('networking-content-delivery'); // weak first
  });
  it('backfills the per-bullet figure from the saved results once', () => {
    const save = freshSave();
    const ids = [...QUESTION_META.keys()].filter((id) => QUESTION_META.get(id)?.building === 'gatehouse' && !id.startsWith('puzzle-')).slice(0, 4);
    save.game.recent = { '1': ids.map((id, i) => [id, i === 0 ? 0 : 1, 'inspection'] as [string, 0 | 1, 'inspection']) };
    const filled = backfillByBullet(save, QUESTION_META);
    expect(filled.game.statsBackfilled).toBe(true);
    const total = Object.values(filled.game.byBullet).join('').length;
    expect(total).toBeGreaterThanOrEqual(4);
    expect(backfillByBullet(filled, QUESTION_META)).toBe(filled);
  });
  it('is fed by every counted answer kind through recordResult', () => {
    let g = freshSave().game;
    g = { ...g, ...recordResult(g, { id: 'gatehouse-001', ok: false, kind: 'review', at: 'x', domain: 1, bullets: ['1.2-S1'], traps: ['sg-vs-nacl'], building: 'gatehouse' }) };
    g = { ...g, ...recordResult(g, { id: 'gatehouse-002', ok: true, kind: 'startup', at: 'x', domain: 1, bullets: ['1.2-S1'], traps: ['sg-vs-nacl'], building: 'gatehouse' }) };
    expect(g.byBullet['1.2-S1']).toBe('0'); // start-up checks never count
    expect(g.traps['sg-vs-nacl']).toEqual({ n: 1, miss: 1 });
    for (let i = 0; i < 14; i += 1) g = { ...g, ...recordResult(g, { id: 'gatehouse-003', ok: i % 2 === 0, kind: 'inspection', at: 'x', domain: 1, bullets: ['1.2-S1'] }) };
    expect(g.byBullet['1.2-S1']).toHaveLength(10);
  });
  it('lets review answers move readiness like inspection answers', () => {
    const meta = new Map(bank.map((x) => [x.id, { id: x.id, building: x.building, bullets: x.bullets, difficulty: x.difficulty }]));
    let g = freshSave().game;
    for (let i = 1; i <= 12; i += 1) g = { ...g, ...recordResult(g, { id: `gatehouse-${String(i).padStart(3, '0')}`, ok: true, kind: 'review', at: 'x', domain: 1 }) };
    const r = computeReadiness(g.recent, meta, DEFAULT_ENV);
    expect(r.domains.find((d) => d.domain === 1)).toMatchObject({ answers: 12, accuracy: 1 });
  });
  it('never changes a building state', () => {
    const s = freshSave();
    expect(BUILDINGS.every((b) => stateOf(s, b.id, DEFAULT_ENV) !== 'commissioned')).toBe(true);
  });
});
