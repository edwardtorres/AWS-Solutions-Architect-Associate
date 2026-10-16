import { describe, expect, it } from 'vitest';
import { def, rules, type ColdCellarScenario, type Phase } from './def';
import { scenarios } from './index';

const ph = (p: Partial<Phase> & Pick<Phase, 'from' | 'access'>): Phase => ({ wait: 'ms', recreatable: false, ...p });
const sc = (phases: Phase[], dayOptions: number[][] = [], sizeKB = 10240): ColdCellarScenario => ({ objects: 'Test objects.', sizeKB, phases, dayOptions });
const ans = (s: ColdCellarScenario) => def.evaluate(s)?.answer;
const used = (s: ColdCellarScenario) => new Set(def.evaluate(s)?.trace.map((t) => t.rule));

describe('cold-cellar rules', () => {
  it('every rule has a unique id, an AWS source and a quote', () => {
    expect(new Set(rules.map((r) => r.id)).size).toBe(rules.length);
    for (const r of rules) {
      expect(r.quote.length).toBeGreaterThan(20);
      expect(r.src).toMatch(/^s3-/);
    }
  });
  it('encodes no rule that depends on the newer small-object default', () => {
    expect(rules.some((r) => r.newer?.length)).toBe(false);
  });
});

describe('class choice', () => {
  it('Standard for frequent reads', () => expect(ans(sc([ph({ from: 0, access: 'frequent' })]))).toEqual({ 'class-1': ['standard'] }));
  it('Standard-IA for monthly reads of data that cannot be re-created', () => {
    const s = sc([ph({ from: 0, access: 'monthly', recreatable: false })]);
    expect(ans(s)).toEqual({ 'class-1': ['standard-ia'] });
    expect(used(s).has('cls-onezone-loss')).toBe(true);
  });
  it('One Zone-IA for monthly reads of re-creatable data', () => {
    const s = sc([ph({ from: 0, access: 'monthly', recreatable: true })]);
    expect(ans(s)).toEqual({ 'class-1': ['onezone-ia'] });
    expect(used(s).has('cls-onezone-cheaper')).toBe(true);
  });
  it('Intelligent-Tiering for an unknown pattern', () => expect(ans(sc([ph({ from: 0, access: 'unknown' })]))).toEqual({ 'class-1': ['intelligent-tiering'] }));
  it('Glacier Instant Retrieval for quarterly or rare reads that must open in milliseconds', () => {
    expect(ans(sc([ph({ from: 0, access: 'quarterly' })]))).toEqual({ 'class-1': ['glacier-ir'] });
    expect(ans(sc([ph({ from: 0, access: 'less-than-yearly' })]))).toEqual({ 'class-1': ['glacier-ir'] });
    expect(ans(sc([ph({ from: 0, access: 'twice-yearly' })]))).toEqual({ 'class-1': ['glacier-ir'] });
  });
  it('Glacier Flexible Retrieval when minutes matter or reads are about twice a year', () => {
    expect(ans(sc([ph({ from: 0, access: 'less-than-yearly', wait: 'minutes' })]))).toEqual({ 'class-1': ['glacier-fr'] });
    expect(ans(sc([ph({ from: 0, access: 'twice-yearly', wait: 'hours' })]))).toEqual({ 'class-1': ['glacier-fr'] });
  });
  it('Glacier Deep Archive only for reads under once a year when hours are fine', () => {
    const s = sc([ph({ from: 0, access: 'less-than-yearly', wait: 'hours' })]);
    expect(ans(s)).toEqual({ 'class-1': ['glacier-da'] });
    expect(used(s).has('restore-first')).toBe(true);
  });
  it('small objects: monthly reads stay in Standard (minimum billable size)', () => {
    const s = sc([ph({ from: 0, access: 'monthly', recreatable: true })], [], 40);
    expect(ans(s)).toEqual({ 'class-1': ['standard'] });
    expect(used(s).has('min-billable-size')).toBe(true);
  });
});

describe('timing and the waterfall', () => {
  // S3 user guide, "Transitioning objects using Amazon S3 Lifecycle": Glacier Instant Retrieval after 4 days, then Deep Archive
  // after at least 94 days (90-day minimum). The same arithmetic with a 90-day class entered on day 4.
  it('documented example: 4 + 90 = 94 days before the next move', () => {
    const s = sc(
      [ph({ from: 0, access: 'frequent' }), ph({ from: 4, access: 'quarterly' }), ph({ from: 20, access: 'less-than-yearly', wait: 'hours' })],
      [[4, 30], [20, 94, 120]],
    );
    // the first move is at day 4 (Standard has no minimum)
    expect(ans(s)).toEqual({ 'class-1': ['standard'], 'class-2': ['glacier-ir'], 'class-3': ['glacier-da'], 'day-1': ['d4'], 'day-2': ['d94'] });
    expect(used(s).has('single-rule-min-duration')).toBe(true);
  });
  it('30-day minimum of Standard-IA delays the next move', () => {
    const s = sc(
      [ph({ from: 0, access: 'frequent' }), ph({ from: 30, access: 'monthly' }), ph({ from: 45, access: 'less-than-yearly', wait: 'hours' })],
      [[30], [45, 60]],
    );
    expect(ans(s)?.['day-2']).toEqual(['d60']);
  });
  it('the move is at the stage start when the minimum has already passed', () => {
    const s = sc(
      [ph({ from: 0, access: 'frequent' }), ph({ from: 30, access: 'monthly' }), ph({ from: 90, access: 'less-than-yearly', wait: 'hours' })],
      [[30], [60, 90]],
    );
    expect(ans(s)?.['day-2']).toEqual(['d90']);
  });
  it('Standard has no minimum duration', () => {
    const s = sc([ph({ from: 0, access: 'frequent' }), ph({ from: 31, access: 'less-than-yearly', wait: 'hours' })], [[31, 62]]);
    expect(ans(s)?.['day-1']).toEqual(['d31']);
  });
  it('Intelligent-Tiering to Deep Archive is supported', () => {
    const s = sc([ph({ from: 0, access: 'unknown' }), ph({ from: 100, access: 'less-than-yearly', wait: 'hours' })], [[100, 200]]);
    expect(ans(s)).toEqual({ 'class-1': ['intelligent-tiering'], 'class-2': ['glacier-da'], 'day-1': ['d100'] });
  });
  it('One Zone-IA to Flexible Retrieval is supported', () => {
    const s = sc(
      [ph({ from: 0, access: 'frequent' }), ph({ from: 30, access: 'monthly', recreatable: true }), ph({ from: 45, access: 'twice-yearly', wait: 'minutes' })],
      [[30], [45, 60]],
    );
    expect(ans(s)).toMatchObject({ 'class-2': ['onezone-ia'], 'class-3': ['glacier-fr'], 'day-2': ['d60'] });
  });
});

describe('refusals', () => {
  it('refuses One Zone-IA to Glacier Instant Retrieval (not in the waterfall)', () => {
    const s = sc(
      [ph({ from: 0, access: 'frequent' }), ph({ from: 30, access: 'monthly', recreatable: true }), ph({ from: 90, access: 'quarterly' })],
      [[30], [60, 90]],
    );
    expect(def.evaluate(s)).toBeNull();
  });
  it('refuses a move back up (colder to warmer)', () => {
    expect(def.evaluate(sc([ph({ from: 0, access: 'monthly' }), ph({ from: 60, access: 'frequent' })], [[60]]))).toBeNull();
  });
  it('refuses a move out of Deep Archive', () => {
    expect(def.evaluate(sc([ph({ from: 0, access: 'less-than-yearly', wait: 'hours' }), ph({ from: 200, access: 'quarterly' })], [[200]]))).toBeNull();
  });
  it('refuses the same class in two stages', () => {
    expect(def.evaluate(sc([ph({ from: 0, access: 'frequent' }), ph({ from: 30, access: 'frequent' })], [[30]]))).toBeNull();
  });
  it('refuses monthly reads with no statement about re-creating the data', () => {
    expect(def.evaluate(sc([{ from: 0, access: 'monthly', wait: 'ms' }]))).toBeNull();
  });
  it('refuses archive stages with no stated retrieval need', () => {
    expect(def.evaluate(sc([{ from: 0, access: 'less-than-yearly' }]))).toBeNull();
    expect(def.evaluate(sc([{ from: 0, access: 'twice-yearly' }]))).toBeNull();
  });
  it('refuses quarterly reads when milliseconds are not required (between documented classes)', () => {
    expect(def.evaluate(sc([ph({ from: 0, access: 'quarterly', wait: 'minutes' })]))).toBeNull();
  });
  it('refuses small objects with a later stage (answer would depend on the newer default)', () => {
    expect(def.evaluate(sc([ph({ from: 0, access: 'frequent' }), ph({ from: 30, access: 'less-than-yearly', wait: 'hours' })], [[30, 60]], 64))).toBeNull();
  });
  it('refuses small objects for classes the rules do not settle', () => {
    expect(def.evaluate(sc([ph({ from: 0, access: 'unknown' })], [], 64))).toBeNull();
    expect(def.evaluate(sc([ph({ from: 0, access: 'quarterly' })], [], 64))).toBeNull();
  });
  it('refuses a move into an infrequent-access class before day 30', () => {
    expect(def.evaluate(sc([ph({ from: 0, access: 'frequent' }), ph({ from: 14, access: 'monthly' })], [[14, 30]]))).toBeNull();
  });
  it('refuses when the computed day is not among the options', () => {
    const s = sc(
      [ph({ from: 0, access: 'frequent' }), ph({ from: 30, access: 'monthly' }), ph({ from: 45, access: 'less-than-yearly', wait: 'hours' })],
      [[30], [45, 90]],
    );
    expect(def.evaluate(s)).toBeNull();
  });
  it('refuses malformed stage lists', () => {
    expect(def.evaluate(sc([]))).toBeNull();
    expect(def.evaluate(sc([ph({ from: 5, access: 'frequent' })]))).toBeNull();
    expect(def.evaluate(sc([ph({ from: 0, access: 'frequent' }), ph({ from: 0, access: 'less-than-yearly', wait: 'hours' })], [[30]]))).toBeNull();
    expect(def.evaluate(sc([ph({ from: 0, access: 'frequent' }), ph({ from: 30, access: 'less-than-yearly', wait: 'hours' })], []))).toBeNull();
  });
});

describe('content', () => {
  it('is deterministic and every scenario is settled with a trace that cites known rules', () => {
    const ids = new Set(rules.map((r) => r.id));
    for (const s of scenarios) {
      const a = def.evaluate(s.data as ColdCellarScenario);
      expect(a, s.id).not.toBeNull();
      expect(def.evaluate(s.data as ColdCellarScenario)).toEqual(a);
      for (const t of a?.trace ?? []) expect(ids.has(t.rule), `${s.id} ${t.rule}`).toBe(true);
      for (const f of def.fields(s.data as ColdCellarScenario)) expect(a?.answer[f.id]?.length, `${s.id} ${f.id}`).toBe(1);
    }
  });
  it('has at least 14 scenarios and no small objects with a later stage', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(14);
    for (const s of scenarios) if ((s.data as ColdCellarScenario).sizeKB < 128) expect((s.data as ColdCellarScenario).phases.length, s.id).toBe(1);
  });
  it('rotates class options so the answer position varies', () => {
    const pos = new Set(scenarios.map((s) => {
      const d = s.data as ColdCellarScenario;
      const f = def.fields(d)[0];
      const a = def.evaluate(d)?.answer['class-1']?.[0];
      return f?.options.findIndex((o) => o.id === a);
    }));
    expect(pos.size).toBeGreaterThanOrEqual(4);
  });
});
