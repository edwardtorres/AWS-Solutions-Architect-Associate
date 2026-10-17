import { describe, expect, it } from 'vitest';
import { def, type PurchaseScenario } from './def';
import { scenarios } from './index';

const base: PurchaseScenario = { term: 'long', interruption: 'cannot', commit: 'usd-per-hour', changes: [], capacity: 'none', exchanges: 'accept', goal: 'none', extras: [] };
const run = (o: Partial<PurchaseScenario>) => def.evaluate({ ...base, ...o });
const model = (o: Partial<PurchaseScenario>) => run(o)?.answer.model?.[0] ?? null;
const rulesOf = (o: Partial<PurchaseScenario>) => run(o)?.trace.flatMap((t) => [t.rule, ...(t.also ?? [])]) ?? [];

describe('purchase-planner rules', () => {
  // Amazon EC2 User Guide, "Purchasing On-Demand Instances for Amazon EC2": no long-term commitment, short-term irregular workloads.
  it('On-Demand when nothing is committed and the work cannot be interrupted', () => {
    expect(model({ term: 'short', commit: 'none' })).toBe('on-demand');
    expect(rulesOf({ term: 'unknown', commit: 'none' })).toEqual(['od-no-commitment', 'od-short-term']);
    expect(rulesOf({ term: 'long', commit: 'none' })).toEqual(['od-no-commitment']);
    expect(model({ term: 'long', commit: 'none' })).toBe('on-demand');
  });

  // Amazon EC2 User Guide, "Spot Instances": suits work that can be interrupted.
  it('Spot when nothing is committed and the work tolerates interruption', () => {
    expect(model({ commit: 'none', interruption: 'tolerates' })).toBe('spot');
    expect(rulesOf({ term: 'short', commit: 'none', interruption: 'tolerates' })).toEqual(['spot-interruptible', 'spot-notice']);
  });

  // Amazon EC2 User Guide, "Regional and zonal Reserved Instances (scope)": a zonal Reserved Instance reserves capacity.
  it('Reserved Instances (zonal) when capacity must be reserved in an Availability Zone', () => {
    expect(model({ commit: 'instance-config', capacity: 'az' })).toBe('ri');
    expect(model({ commit: 'either', capacity: 'az' })).toBe('ri');
    expect(rulesOf({ commit: 'either', capacity: 'az' })).toEqual(['ri-term-config', 'capacity-needs-ri', 'ri-zonal-capacity']);
  });

  // Savings Plans user guide, "Savings Plans types": Compute Savings Plans apply to Fargate and Lambda and across Regions.
  it('Compute Savings Plans for AWS Fargate, AWS Lambda or Region changes', () => {
    expect(model({ changes: ['fargate'] })).toBe('compute-sp');
    expect(rulesOf({ changes: ['lambda', 'size'] })).toContain('compute-sp-serverless');
    expect(model({ changes: ['region'], commit: 'either' })).toBe('compute-sp');
    expect(rulesOf({ changes: ['region'] })).toContain('compute-sp-flex');
    expect(model({ changes: ['region', 'family'] })).toBe('compute-sp');
  });

  it('family changes: Compute Savings Plans or a Convertible Reserved Instance, depending on the commitment', () => {
    expect(model({ changes: ['family'], commit: 'usd-per-hour' })).toBe('compute-sp');
    expect(model({ changes: ['family'], commit: 'either', exchanges: 'avoid' })).toBe('compute-sp');
    expect(rulesOf({ changes: ['family'], commit: 'either', exchanges: 'avoid' })).toContain('sp-no-exchanges');
    expect(model({ changes: ['family'], commit: 'instance-config', exchanges: 'accept' })).toBe('ri');
    expect(rulesOf({ changes: ['family'], commit: 'instance-config' })).toContain('ri-convertible');
  });

  // Savings Plans user guide, "Compute Savings Plans and Reserved Instances": EC2 Instance Savings Plans cover a family in a Region.
  // Savings Plans user guide, "Savings Plans types": EC2 Instance plans trade flexibility for a larger saving; Compute plans are the most flexible.
  it('EC2 Instance Savings Plans when family and Region are fixed and the goal is the largest saving', () => {
    expect(model({ changes: ['size'], goal: 'largest-saving' })).toBe('ec2-sp');
    expect(model({ changes: ['size', 'tenancy'], goal: 'largest-saving' })).toBe('ec2-sp');
    expect(model({ changes: ['os', 'tenancy'], commit: 'either', exchanges: 'avoid', goal: 'largest-saving' })).toBe('ec2-sp');
    expect(rulesOf({ changes: ['size'], goal: 'largest-saving' })).toEqual(['sp-term-usage', 'ec2-sp-family-region', 'ec2-sp-saving', 'ec2-sp-within-family']);
  });

  it('Compute Savings Plans when family and Region are fixed and the goal is flexibility', () => {
    expect(model({ changes: ['size'], goal: 'most-flexible' })).toBe('compute-sp');
    expect(rulesOf({ changes: ['size'], goal: 'most-flexible' })).toContain('compute-sp-most-flexible');
  });

  it('Standard Reserved Instances when nothing changes and the commitment is an instance configuration', () => {
    expect(model({ commit: 'instance-config' })).toBe('ri');
    expect(rulesOf({ commit: 'instance-config', changes: ['size'] })).toContain('ri-standard-fixed');
  });

  it('every rule is exercised by at least one scenario', () => {
    const used = new Set(scenarios.flatMap((s) => def.evaluate(s.data)?.trace.flatMap((t) => [t.rule, ...(t.also ?? [])]) ?? []));
    for (const r of def.rules) if (r.id !== 'ri-regional-no-capacity') expect(used.has(r.id), r.id).toBe(true);
  });
});

describe('purchase-planner refusals', () => {
  it('refuses any stated requirement that no rule covers', () => {
    expect(run({ extras: ['database commitment'] })).toBeNull();
    expect(run({ commit: 'none', extras: ['x'] })).toBeNull();
  });
  it('refuses a commitment for short or unknown duration', () => {
    expect(run({ term: 'short' })).toBeNull();
    expect(run({ term: 'unknown', commit: 'either' })).toBeNull();
  });
  it('refuses when Spot and a commitment both fit', () => {
    expect(run({ interruption: 'tolerates' })).toBeNull();
  });
  it('refuses capacity needs the options cannot meet', () => {
    expect(run({ commit: 'none', capacity: 'az' })).toBeNull();
    expect(run({ commit: 'usd-per-hour', capacity: 'az' })).toBeNull();
    expect(run({ commit: 'instance-config', capacity: 'az', changes: ['size'] })).toBeNull();
  });
  it('refuses ties and contradictions', () => {
    expect(run({ changes: ['size'] })).toBeNull(); // USD per hour, family and Region fixed, no goal: both plan types fit
    expect(run({ changes: ['size'], commit: 'instance-config', goal: 'largest-saving' })).toBeNull();
    expect(run({ commit: 'either' })).toBeNull(); // steady, family and Region fixed: Reserved Instances and EC2 Instance Savings Plans both fit
    expect(run({ commit: 'either', changes: ['size'] })).toBeNull();
    expect(run({ commit: 'either', changes: ['os'], exchanges: 'accept' })).toBeNull();
    expect(run({ commit: 'either', changes: ['family'], exchanges: 'accept' })).toBeNull();
    expect(run({ commit: 'instance-config', changes: ['region'] })).toBeNull();
    expect(run({ commit: 'instance-config', changes: ['fargate'] })).toBeNull();
    expect(run({ commit: 'instance-config', changes: ['family'], exchanges: 'avoid' })).toBeNull();
    expect(run({ commit: 'instance-config', changes: ['os'] })).toBeNull();
  });
});

describe('purchase-planner scenarios', () => {
  it('are deterministic and never refused', () => {
    for (const s of scenarios) {
      const a = def.evaluate(s.data);
      expect(a, s.id).not.toBeNull();
      expect(def.evaluate(s.data)).toEqual(a);
    }
  });
  it('spread the answers over all five models', () => {
    const counts = new Map<string, number>();
    for (const s of scenarios) {
      const m = def.evaluate(s.data)?.answer.model?.[0] ?? '';
      counts.set(m, (counts.get(m) ?? 0) + 1);
    }
    expect(counts.size).toBe(5);
    for (const n of counts.values()) expect(n).toBeLessThanOrEqual(Math.ceil(scenarios.length * 0.35));
  });
  it('show every property in the exhibit and offer five options', () => {
    const s = scenarios[0]!;
    const ex = def.exhibit(s.data);
    expect(ex[0]?.kind).toBe('table');
    expect(def.fields(s.data)[0]?.options).toHaveLength(5);
  });
});
