import { describe, expect, it } from 'vitest';
import type { Question } from '../content/types';
import { freshSave, type ItemHistory, type MockRecord, type Save } from '../save/schema';
import { DEFAULT_ENV } from './env';
import type { Ctx } from './engine';
import { computeReadiness } from './readiness';
import { FRESH_SHARE, MOCK_MS, answeredRecently, clockText, discardMock, finishMock, freshness, freshnessReason, isExpired, openMock, quotas, readyToBook, remainingMs, setMockAnswer, setMockFlag } from './mock';
import { drawMock } from './mockDraw';
import { stateOf } from './lifecycle';

const clockAt = (iso: string) => ({ now: () => new Date(iso) });
const START = '2026-06-10T12:00:00.000Z';
const bankLookup = (bank: readonly Question[]) => (id: string) => bank.find((q) => q.id === id);

const q = (id: string, bullets: string[], extra: Partial<Question> = {}): Question => ({
  id,
  building: id.replace(/-\d{3,}$/, ''),
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
/** Per domain: a building with three bullets, `reserve` reserve questions, `live` live ones and 3 post-guide ones. Plus a Foundation. */
const DOMAIN_BUILDINGS: Record<number, { building: string; bullets: string[] }> = {
  1: { building: 'gatehouse', bullets: ['1.2-K3', '1.2-S1', '1.2-S2'] },
  2: { building: 'blueprint-hall', bullets: ['2.1-K4', '2.1-K10', '2.1-S1'] },
  3: { building: 'freight-depot', bullets: ['3.1-K1', '3.1-K2', '3.1-K3'] },
  4: { building: 'ledger-office', bullets: ['4.1-K1', '4.1-K2', '4.1-K3'] },
};
const mkBank = (reserve: Record<number, number> = { 1: 39, 2: 34, 3: 31, 4: 26 }, live = 60): Question[] => {
  const out: Question[] = [];
  for (const d of [1, 2, 3, 4]) {
    const { building, bullets } = DOMAIN_BUILDINGS[d] as { building: string; bullets: string[] };
    for (let i = 1; i <= (reserve[d] ?? 0); i += 1) out.push(q(`${building}-${String(i).padStart(3, '0')}`, [bullets[i % 3] as string], { tags: ['mock-reserve'] }));
    for (let i = 1; i <= live; i += 1) out.push(q(`${building}-${String(200 + i).padStart(3, '0')}`, [bullets[i % 3] as string]));
    for (let i = 1; i <= 3; i += 1) out.push(q(`${building}-${String(900 + i).padStart(3, '0')}`, [bullets[0] as string], { tags: ['post-guide'] }));
  }
  out.push(q('pillar-plaza-001', []), q('pillar-plaza-002', []));
  return out;
};
const base = (bank: readonly Question[], over: Partial<Parameters<typeof drawMock>[0]> = {}) => ({
  bank,
  history: {} as Record<string, ItemHistory>,
  seen: {} as Record<string, number>,
  startDay: '2026-06-10',
  timeZone: 'UTC',
  total: 65,
  weights: DEFAULT_ENV.weights,
  domainOf: DEFAULT_ENV.domainOf,
  lastMockIds: [] as string[],
  random: (() => {
    let s = 7;
    return () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  })(),
  ...over,
});
const domainOf = (qq: Question) => DEFAULT_ENV.domainOf(qq.building);

describe('mock quotas', () => {
  it('are exact by the exam weights: 19 / 17 / 16 / 13 for 65 questions and 3 / 3 / 2 / 2 for 10', () => {
    expect(quotas(65, DEFAULT_ENV.weights)).toEqual({ 1: 19, 2: 17, 3: 16, 4: 13 });
    expect(quotas(10, DEFAULT_ENV.weights)).toEqual({ 1: 3, 2: 3, 3: 2, 4: 2 });
    expect(Object.values(quotas(65, DEFAULT_ENV.weights)).reduce((a, b) => a + b, 0)).toBe(65);
  });
});

describe('the mock draw', () => {
  const bank = mkBank();
  it('draws 65 with exact domain weights, never a post-guide question or a Foundation', () => {
    const d = drawMock(base(bank));
    expect(d.questions).toHaveLength(65);
    const by = [1, 2, 3, 4].map((n) => d.questions.filter((x) => domainOf(x) === n).length);
    expect(by).toEqual([19, 17, 16, 13]);
    expect(d.questions.some((x) => x.tags.includes('post-guide'))).toBe(false);
    expect(d.questions.some((x) => x.building === 'pillar-plaza')).toBe(false);
    expect(new Set(d.questions.map((x) => x.id)).size).toBe(65);
  });
  it('uses the reserve first: the first mock is all reserve, the second takes the rest of it, then live questions', () => {
    const first = drawMock(base(bank));
    expect(first.reserveUsed).toBe(65);
    expect(first.questions.every((x) => x.tags.includes('mock-reserve'))).toBe(true);
    // The first mock was taken: its questions are now answered.
    const history = Object.fromEntries(first.questions.map((x) => [x.id, { n: 1, ok: 1, streak: 1, last: START, lastOk: 1, lastKind: 'mock' } as ItemHistory]));
    const second = drawMock(base(bank, { history, lastMockIds: first.questions.map((x) => x.id) }));
    // Domain 3 holds 31 reserve questions for 16 + 16 slots: the second mock gets 15 of them and one live question.
    expect(second.perDomain[3]).toEqual({ reserve: 15, live: 1 });
    expect(second.reserveUsed).toBe(64);
    const overlap = second.questions.filter((x) => first.questions.some((f) => f.id === x.id));
    expect(overlap).toHaveLength(0);
    // Both mocks together used 129 of the 130 reserve questions; a third takes the one left (domain 1) and fills the rest with live questions.
    const history2 = { ...history, ...Object.fromEntries(second.questions.map((x) => [x.id, { n: 1, ok: 1, streak: 1, last: START, lastOk: 1, lastKind: 'mock' } as ItemHistory])) };
    const third = drawMock(base(bank, { history: history2, lastMockIds: second.questions.map((x) => x.id) }));
    expect(third.reserveUsed).toBe(1);
    expect(third.perDomain[1]).toEqual({ reserve: 1, live: 18 });
    expect(third.questions).toHaveLength(65);
  });
  it('completes a domain short of reserve from live questions so the weights hold', () => {
    const thin = mkBank({ 1: 5, 2: 34, 3: 31, 4: 26 });
    const d = drawMock(base(thin));
    expect(d.perDomain[1]).toEqual({ reserve: 5, live: 14 });
    expect(d.questions.filter((x) => domainOf(x) === 1)).toHaveLength(19);
    expect(d.reserveUsed).toBe(5 + 17 + 16 + 13);
  });
  it('avoids the last mock’s questions and prefers ones not answered in the last 14 days when the pool allows', () => {
    const noReserve = mkBank({}, 80);
    const live = noReserve.filter((x) => !x.tags.includes('post-guide') && x.building !== 'pillar-plaza');
    const last = live.slice(0, 40).map((x) => x.id);
    const d = drawMock(base(noReserve, { lastMockIds: last }));
    expect(d.questions.filter((x) => last.includes(x.id))).toHaveLength(0);
    // Recently answered questions (5 days ago) are left for last; 20-day-old answers are fine.
    const recent = Object.fromEntries(live.slice(40, 120).map((x) => [x.id, { n: 1, ok: 1, streak: 1, last: '2026-06-05T10:00:00.000Z', lastOk: 1, lastKind: 'inspection' } as ItemHistory]));
    const old = Object.fromEntries(live.slice(120, 200).map((x) => [x.id, { n: 1, ok: 1, streak: 1, last: '2026-05-01T10:00:00.000Z', lastOk: 1, lastKind: 'inspection' } as ItemHistory]));
    const d2 = drawMock(base(noReserve, { history: { ...recent, ...old } }));
    const fresh = d2.questions.filter((x) => !recent[x.id]).length;
    expect(fresh).toBe(65);
  });
  it('spreads each domain across its bullets', () => {
    const d = drawMock(base(bank));
    for (const n of [1, 2, 3, 4]) {
      const counts = (DOMAIN_BUILDINGS[n] as { bullets: string[] }).bullets.map((b) => d.questions.filter((x) => domainOf(x) === n && x.bullets.includes(b)).length);
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    }
  });
  it('is deterministic for the same random stream', () => {
    expect(drawMock(base(bank)).questions.map((x) => x.id)).toEqual(drawMock(base(bank)).questions.map((x) => x.id));
  });
});

describe('freshness', () => {
  const h = (daysAgo: number): ItemHistory => ({ n: 1, ok: 1, streak: 1, last: new Date(Date.parse(START) - daysAgo * 86_400_000).toISOString(), lastOk: 1, lastKind: 'inspection' });
  it('treats an answer within 14 calendar days of the start as recent', () => {
    expect(answeredRecently(h(14), '2026-06-10', 'UTC')).toBe(true);
    expect(answeredRecently(h(15), '2026-06-10', 'UTC')).toBe(false);
    expect(answeredRecently(undefined, '2026-06-10', 'UTC')).toBe(false);
  });
  it('counts only when at least half the questions were not answered in those days', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `gatehouse-${i + 1}`);
    const hist = (n: number) => Object.fromEntries(ids.slice(0, n).map((id) => [id, h(3)]));
    expect(freshness(ids, hist(5), '2026-06-10', 'UTC')).toEqual({ fresh: 5, total: 10, counts: true });
    expect(freshness(ids, hist(6), '2026-06-10', 'UTC')).toEqual({ fresh: 4, total: 10, counts: false });
    expect(FRESH_SHARE).toBe(0.5);
    const odd = Array.from({ length: 65 }, (_, i) => `x-${i}`);
    expect(freshness(odd, Object.fromEntries(odd.slice(0, 32).map((id) => [id, h(1)])), '2026-06-10', 'UTC').counts).toBe(true); // 33 of 65 fresh
    expect(freshness(odd, Object.fromEntries(odd.slice(0, 33).map((id) => [id, h(1)])), '2026-06-10', 'UTC').counts).toBe(false); // 32 of 65 fresh
  });
  it('explains why a mock did or did not count', () => {
    expect(freshnessReason({ fresh: 20, counts: false, short: false, total: 65 })).toMatch(/did not count: only 20 of 65 questions \(31%\)/);
    expect(freshnessReason({ fresh: 40, counts: true, short: false, total: 65 })).toMatch(/It counts: 40 of 65/);
    expect(freshnessReason({ fresh: 10, counts: false, short: true, total: 10 })).toMatch(/never counts/);
  });
});

describe('the exam clock', () => {
  const bank = mkBank();
  const drawn = drawMock(base(bank)).questions.map((x) => x.id);
  const ctxAt = (iso: string): Ctx => ({ env: DEFAULT_ENV, clock: clockAt(iso), lookup: bankLookup(bank) });
  const open = (): Save => openMock(freshSave(), { questionIds: drawn, reserveUsed: 65, seed: 1, short: false }, ctxAt(START));
  it('is computed from the saved start time, so it keeps running across a reload and expires while the app is closed', () => {
    const s = open();
    const a = s.game.mock.active!;
    expect(a.durationMs).toBe(MOCK_MS);
    expect(remainingMs(a, new Date(START))).toBe(130 * 60_000);
    // "Reload" after 40 minutes: the same saved state gives 90 minutes left.
    const reloaded = JSON.parse(JSON.stringify(s)) as Save;
    expect(remainingMs(reloaded.game.mock.active!, new Date('2026-06-10T12:40:00.000Z'))).toBe(90 * 60_000);
    expect(isExpired(a, new Date('2026-06-10T14:09:59.000Z'))).toBe(false);
    expect(isExpired(a, new Date('2026-06-10T14:10:00.000Z'))).toBe(true);
    // Three days later (app closed the whole time) it is simply expired, and never negative.
    expect(remainingMs(a, new Date('2026-06-13T12:00:00.000Z'))).toBe(0);
  });
  it('formats the clock', () => {
    expect(clockText(130 * 60_000)).toBe('2:10:00');
    expect(clockText(59_001)).toBe('0:01:00');
    expect(clockText(0)).toBe('0:00:00');
  });
  it('keeps answers and flags while open, with nothing graded', () => {
    let s = open();
    s = setMockAnswer(s, drawn[0] as string, [0]);
    s = setMockFlag(s, drawn[1] as string, true);
    expect(s.game.mock.active?.answers).toEqual({ [drawn[0] as string]: [0] });
    expect(s.game.mock.active?.flags).toEqual([drawn[1]]);
    expect(Object.keys(s.game.history)).toHaveLength(0);
    expect(s.game.xp).toBe(0);
    expect(setMockAnswer(s, 'not-in-the-mock', [0])).toBe(s);
    s = setMockAnswer(s, drawn[0] as string, []);
    s = setMockFlag(s, drawn[1] as string, false);
    expect(s.game.mock.active?.answers).toEqual({});
    expect(s.game.mock.active?.flags).toEqual([]);
  });
  it('records the freshness fixed at the start and counts the start', () => {
    const s = open();
    expect(s.game.mock.started).toBe(1);
    expect(s.game.mock.active).toMatchObject({ fresh: 65, counts: true, reserveUsed: 65, short: false });
    const stale = { ...freshSave() };
    stale.game.history = Object.fromEntries(drawn.slice(0, 50).map((id) => [id, { n: 1, ok: 1, streak: 1, last: '2026-06-08T10:00:00.000Z', lastOk: 1, lastKind: 'inspection' } as ItemHistory]));
    const t = openMock(stale, { questionIds: drawn, reserveUsed: 65, seed: 1, short: false }, ctxAt(START));
    expect(t.game.mock.active).toMatchObject({ fresh: 15, counts: false });
    const short = openMock(freshSave(), { questionIds: drawn.slice(0, 10), reserveUsed: 0, seed: 1, short: true }, ctxAt(START));
    expect(short.game.mock.active?.counts).toBe(false); // a dev-only short mock never counts
  });
});

describe('submitting a mock', () => {
  const bank = mkBank();
  const drawn = drawMock(base(bank)).questions.map((x) => x.id);
  const ctxAt = (iso: string): Ctx => ({ env: DEFAULT_ENV, clock: clockAt(iso), lookup: bankLookup(bank) });
  const open = () => openMock(freshSave(), { questionIds: drawn, reserveUsed: 65, seed: 1, short: false }, ctxAt(START));

  it('scores 65 raw, counts unanswered as wrong, pays XP with the repeat rule and changes no building', () => {
    let s = open();
    const buildings = JSON.stringify(s.buildings);
    for (const id of drawn.slice(0, 40)) s = setMockAnswer(s, id, [0]); // right
    for (const id of drawn.slice(40, 50)) s = setMockAnswer(s, id, [2]); // wrong
    // 15 unanswered
    const r = finishMock(s, ctxAt('2026-06-10T13:30:00.000Z'), false)!;
    expect(r.record).toMatchObject({ total: 65, correct: 40, expired: false });
    expect(r.record.finishedAt).toBe('2026-06-10T13:30:00.000Z');
    expect(r.xp).toBe(40 * 20);
    expect(r.save.game.mock.active).toBeNull();
    expect(r.save.game.mock.history).toHaveLength(1);
    expect(JSON.stringify(r.save.buildings)).toBe(buildings);
    expect(r.save.game.history[drawn[45] as string]).toMatchObject({ n: 1, ok: 0, lastKind: 'mock' }); // wrong
    expect(r.save.game.history[drawn[60] as string]).toMatchObject({ n: 1, ok: 0, lastKind: 'mock' }); // unanswered: wrong
    expect(r.save.game.log.filter((e) => e[3] === 'mock')).toHaveLength(65);
    const sum = Object.values(r.record.domains).reduce((n, [c]) => n + c, 0);
    expect(sum).toBe(40);
    expect(Object.values(r.record.domains).reduce((n, [, t]) => n + t, 0)).toBe(65);
    expect(r.record.domains['1']?.[1]).toBe(19);
    expect(stateOf(r.save, 'gatehouse', DEFAULT_ENV)).toBe('planned');
  });
  it('gives full credit only for multiple response: the exact keyed set', () => {
    const mr: Question = { ...q('gatehouse-777', ['1.2-S1']), format: 'mr', select: 2, options: [{ text: 'a', correct: true, why: 'w' }, { text: 'b', correct: true, why: 'w' }, { text: 'c', correct: false, why: 'w' }, { text: 'd', correct: false, why: 'w' }, { text: 'e', correct: false, why: 'w' }] };
    const lookup = (id: string) => (id === mr.id ? mr : undefined);
    const run = (chosen: number[]) => {
      const s = openMock(freshSave(), { questionIds: [mr.id], reserveUsed: 0, seed: 1, short: false }, { env: DEFAULT_ENV, clock: clockAt(START), lookup });
      return finishMock(setMockAnswer(s, mr.id, chosen), { env: DEFAULT_ENV, clock: clockAt(START), lookup }, false)!.record.correct;
    };
    expect(run([0, 1])).toBe(1);
    expect(run([0, 2])).toBe(0);
    expect(run([0])).toBe(0);
    expect(run([0, 1, 2])).toBe(0);
  });
  it('feeds readiness, the bullet, maintenance and trap figures, and marks a timer submission as expired', () => {
    const trapQ: Question[] = [q('gatehouse-801', ['1.2-S1'], { tags: ['mock-reserve', 'trap:sg-vs-nacl'] }), q('gatehouse-802', ['1.2-S2'], { tags: ['mock-reserve'] })];
    const lookup = (id: string) => trapQ.find((x) => x.id === id);
    const ctx: Ctx = { env: DEFAULT_ENV, clock: clockAt('2026-06-10T14:10:00.000Z'), lookup };
    let s = openMock(freshSave(), { questionIds: trapQ.map((x) => x.id), reserveUsed: 2, seed: 1, short: false }, ctx);
    s = setMockAnswer(s, 'gatehouse-801', [3]);
    const r = finishMock(s, ctx, true)!;
    expect(r.record.expired).toBe(true);
    expect(r.record.trapMisses).toEqual({ 'sg-vs-nacl': 1 });
    expect(r.save.game.traps['sg-vs-nacl']).toEqual({ n: 1, miss: 1 });
    expect(r.save.game.byBullet).toEqual({ '1.2-S1': '0', '1.2-S2': '0' });
    expect(r.save.game.maint.gatehouse).toBe('00');
    expect(r.save.game.recent['1']).toHaveLength(2);
    const meta = new Map(trapQ.map((x) => [x.id, { id: x.id, building: x.building, bullets: x.bullets, difficulty: x.difficulty }]));
    expect(computeReadiness(r.save.game.recent, meta, DEFAULT_ENV).domains[0]?.answers).toBe(2);
  });
  it('keeps the latest 30 mocks and can discard an open one without recording it', () => {
    let s = open();
    const lookup = bankLookup(bank);
    for (let i = 0; i < 32; i += 1) {
      s = openMock({ ...s, game: { ...s.game, mock: { ...s.game.mock, active: null } } }, { questionIds: drawn.slice(0, 2), reserveUsed: 0, seed: 1, short: false }, { env: DEFAULT_ENV, clock: clockAt(START), lookup });
      s = finishMock(s, { env: DEFAULT_ENV, clock: clockAt(START), lookup }, false)!.save;
    }
    expect(s.game.mock.history).toHaveLength(30);
    expect(s.game.mock.started).toBe(33);
    const fresh = open();
    const discarded = discardMock(fresh);
    expect(discarded.game.mock.active).toBeNull();
    expect(discarded.game.log).toHaveLength(0);
  });
});

describe('ready to book', () => {
  /** A finished 65-question mock with explicit per-domain correct counts (domain totals 19 / 17 / 16 / 13). */
  const rec = (d: [number, number, number, number], over: Partial<MockRecord> = {}): MockRecord => ({
    id: `m${Math.random()}`,
    startedAt: START,
    finishedAt: START,
    short: false,
    expired: false,
    total: 65,
    correct: d.reduce((n, x) => n + x, 0),
    domains: { '1': [d[0], 19], '2': [d[1], 17], '3': [d[2], 16], '4': [d[3], 13] },
    questionIds: Array.from({ length: 65 }, (_, i) => `q${i}`),
    seed: 1,
    chosen: {},
    flags: [],
    fresh: 65,
    counts: true,
    reserveUsed: 0,
    trapMisses: {},
    ...over,
  });
  const GOOD: [number, number, number, number] = [16, 14, 14, 11]; // 55 of 65 = 84.6%; domains 84%, 82%, 87.5%, 85%
  it('needs two counting mocks, each at least 80% overall with every domain at least 70%', () => {
    expect(readyToBook([]).ready).toBe(false);
    expect(readyToBook([rec(GOOD)]).reason).toMatch(/need 2 mocks that count; you have 1/);
    expect(readyToBook([rec(GOOD), rec(GOOD)]).ready).toBe(true);
    expect(readyToBook([rec(GOOD), rec(GOOD)]).considered).toHaveLength(2);
    // 52 of 65 is exactly 80%: enough; 51 is not.
    expect(readyToBook([rec(GOOD), rec([16, 14, 12, 10])]).ready).toBe(true); // 52 of 65
    expect(readyToBook([rec(GOOD), rec([15, 14, 12, 10])]).ready).toBe(false); // 51 of 65 = 78.5%
    // Every domain at least 70%: 14 of 19 is 73.7% (fine), 13 of 19 is 68.4% (not), 12 of 17 is 70.6% (fine), 11 of 16 is 68.75% (not), 10 of 13 is 76.9%.
    expect(readyToBook([rec(GOOD), rec([16, 12, 12, 13])]).ready).toBe(true);
    expect(readyToBook([rec(GOOD), rec([13, 17, 16, 13])]).ready).toBe(false);
    expect(readyToBook([rec(GOOD), rec([19, 17, 11, 13])]).ready).toBe(false);
  });
  it('looks at the two most recent counting mocks and ignores mocks that did not count and short ones', () => {
    const history = [rec([5, 5, 5, 5]), rec(GOOD), rec(GOOD), rec([19, 17, 16, 13], { counts: false }), rec([1, 1, 1, 1], { short: true })];
    expect(readyToBook(history).ready).toBe(true);
    expect(readyToBook([rec(GOOD), rec(GOOD, { counts: false }), rec(GOOD, { short: true })]).ready).toBe(false);
    // A newer counting mock below the bar takes it away again.
    expect(readyToBook([rec(GOOD), rec(GOOD), rec([10, 10, 10, 10])]).ready).toBe(false);
  });
});
