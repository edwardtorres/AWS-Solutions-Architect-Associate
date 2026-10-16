import { describe, expect, it } from 'vitest';
import { BLOCKS, PERMS, RPO_CLASSES, RTO_CLASSES, STRATEGY_ORDER, def, type BunkerData } from './def';
import { scenarios } from './index';

const ALL = BLOCKS.map((b) => b.id);
const base: BunkerData = { workload: 'w', rpo: 'hours', rto: '24 hours or less', cost: { kind: 'cheapest' }, order: 0, pool: ALL };
const run = (o: Partial<BunkerData>) => def.evaluate({ ...base, ...o });
const strategy = (o: Partial<BunkerData>) => run(o)?.answer.strategy?.[0];

describe('disaster-bunker evaluator', () => {
  // Well-Architected REL13-BP02 (dr-reliability-strategies): each strategy's documented RPO and RTO classes.
  it.each([
    ['hours', '24 hours or less', 'backup-restore'],
    ['minutes', 'tens of minutes', 'pilot-light'],
    ['seconds', 'minutes', 'warm-standby'],
    ['near zero', 'potentially zero', 'active-active'],
  ])('documented class RPO %s / RTO %s gives %s', (rpo, rto, want) => {
    expect(strategy({ rpo, rto })).toBe(want);
  });

  it('classes line up with the cost order (rule cost-order)', () => {
    expect(RPO_CLASSES).toHaveLength(STRATEGY_ORDER.length);
    expect(RTO_CLASSES).toHaveLength(STRATEGY_ORDER.length);
  });

  it('the stricter of the two targets decides (rule tradeoff)', () => {
    expect(strategy({ rpo: 'hours', rto: 'minutes' })).toBe('warm-standby');
    expect(strategy({ rpo: 'near zero', rto: '24 hours or less' })).toBe('active-active');
    expect(strategy({ rpo: 'seconds', rto: '24 hours or less' })).toBe('warm-standby');
    expect(strategy({ rpo: 'minutes', rto: 'minutes' })).toBe('warm-standby');
    expect(strategy({ rpo: 'hours', rto: 'tens of minutes' })).toBe('pilot-light');
  });

  it('a cost ceiling is accepted when the targets fit under it', () => {
    expect(strategy({ rpo: 'minutes', rto: 'tens of minutes', cost: { kind: 'at-most', strategy: 'pilot-light' } })).toBe('pilot-light');
    expect(strategy({ rpo: 'seconds', rto: 'minutes', cost: { kind: 'at-most', strategy: 'warm-standby' } })).toBe('warm-standby');
    expect(strategy({ rpo: 'minutes', rto: 'tens of minutes', cost: { kind: 'cheaper-than', strategy: 'warm-standby' } })).toBe('pilot-light');
  });

  it('building blocks are those the chosen strategy adds, and distractors are the rest', () => {
    const r = run({ rpo: 'seconds', rto: 'minutes' })!;
    expect(r.answer.blocks).toEqual(['scaled-down-stack', 'scale-up-failover', 'reduced-capacity-traffic']);
    expect(run({ rpo: 'hours', rto: '24 hours or less' })!.answer.blocks).toEqual(['pit-backups', 'backup-copy', 'iac-redeploy', 'ami-copy']);
    expect(run({ rpo: 'minutes', rto: 'tens of minutes' })!.answer.blocks).toEqual(['cont-replication', 'data-tier-on', 'app-servers-off', 'dns-failover']);
    expect(run({ rpo: 'near zero', rto: 'potentially zero' })!.answer.blocks).toEqual(['all-regions-serve', 'user-routing-policies', 'multi-region-writes']);
  });

  it('trace cites the class rules, the trade-off and the cumulative rule where it applies', () => {
    const t = run({ rpo: 'seconds', rto: 'minutes' })!.trace.map((x) => x.rule);
    expect(t).toContain('cost-order');
    expect(t).toContain('class-warm-standby');
    expect(t).toContain('tradeoff');
    expect(t).toContain('blocks-cumulative-warm');
    expect(run({ rpo: 'near zero', rto: 'potentially zero' })!.trace.map((x) => x.rule)).toContain('blocks-cumulative-active');
  });

  describe('refusals', () => {
    it('a target between documented classes', () => {
      expect(run({ rpo: 'between minutes and seconds' })).toBeNull();
      expect(run({ rto: 'about an hour' })).toBeNull();
      expect(run({ rpo: '' })).toBeNull();
    });
    it('continuous point-in-time backups with an RPO in minutes (rule pitr-backups)', () => {
      expect(run({ rpo: 'minutes', rto: 'tens of minutes', continuousBackups: true })).toBeNull();
      expect(strategy({ rpo: 'hours', continuousBackups: true })).toBe('backup-restore');
    });
    it('a cost constraint the documented order cannot place', () => {
      expect(run({ cost: { kind: 'budget' } })).toBeNull();
      expect(run({ cost: { kind: 'at-most', strategy: 'hot-standby' } })).toBeNull();
      expect(run({ cost: { kind: 'cheaper-than', strategy: 'something' } })).toBeNull();
    });
    it('a cost constraint the targets cannot meet', () => {
      expect(run({ rpo: 'seconds', rto: 'minutes', cost: { kind: 'at-most', strategy: 'pilot-light' } })).toBeNull();
      expect(run({ rpo: 'hours', cost: { kind: 'cheaper-than', strategy: 'backup-restore' } })).toBeNull();
    });
    it('a block pool that is unknown, repeated or has too few right or wrong blocks', () => {
      expect(run({ pool: ['pit-backups', 'nope', 'backup-copy', 'cont-replication'] })).toBeNull();
      expect(run({ pool: ['pit-backups', 'pit-backups', 'cont-replication', 'data-tier-on'] })).toBeNull();
      expect(run({ pool: ['pit-backups', 'cont-replication', 'data-tier-on', 'all-regions-serve'] })).toBeNull();
      expect(run({ pool: ['pit-backups', 'backup-copy', 'iac-redeploy', 'cont-replication'] })).toBeNull();
    });
  });

  it('every rule is exercised by some evaluation or is the refusal rule', () => {
    const used = new Set<string>();
    for (const rpo of RPO_CLASSES) {
      for (const rto of RTO_CLASSES) {
        for (const x of run({ rpo, rto })?.trace ?? []) used.add(x.rule);
      }
    }
    for (const r of def.rules) {
      if (r.id === 'pitr-backups') continue;
      expect(used.has(r.id), r.id).toBe(true);
    }
  });

  it('is deterministic and does not mutate the scenario', () => {
    const s = { ...base, rpo: 'seconds', rto: 'minutes' };
    const copy = JSON.stringify(s);
    expect(def.evaluate(s)).toEqual(def.evaluate(s));
    expect(JSON.stringify(s)).toBe(copy);
  });

  it('every strategy ordering lists all four strategies once', () => {
    for (const p of PERMS) expect([...p].sort()).toEqual([0, 1, 2, 3]);
    for (const o of [0, 1, 2, 3] as const) {
      const ids = def.fields({ ...base, order: o })[0]!.options.map((x) => x.id);
      expect([...ids].sort()).toEqual([...STRATEGY_ORDER].sort());
    }
  });
});

describe('disaster-bunker scenarios', () => {
  it('has at least 14 scenarios and none is refused', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(14);
    for (const s of scenarios) expect(def.evaluate(s.data), s.id).not.toBeNull();
  });
  it('spreads answers over all four strategies', () => {
    const got = new Set(scenarios.map((s) => def.evaluate(s.data)!.answer.strategy![0]));
    expect(got.size).toBe(4);
  });
  it('lists the strategy options in more than one order', () => {
    expect(new Set(scenarios.map((s) => s.data.order)).size).toBeGreaterThan(1);
  });
});
