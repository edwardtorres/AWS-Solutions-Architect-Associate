import { describe, expect, it } from 'vitest';
import scenarios from '../../../content/puzzles/architecture-builder';
import { def, reference, score, type BuilderData, type Placed } from './def';

const data = (checks: BuilderData['checks'][number]['id'][], azs: 2 | 3 = 2): BuilderData => ({
  azs,
  palette: [
    { kind: 'alb', count: 3 },
    { kind: 'app', count: 4 },
    { kind: 'nat', count: 3 },
    { kind: 'db-primary', count: 1 },
    { kind: 'db-standby', count: 1 },
    { kind: 'cache', count: 3 },
    { kind: 'queue', count: 1 },
  ],
  checks: checks.map((id) => ({ id, need: id })),
});
const pass = (d: BuilderData, placed: Placed[]) => score(d, placed).map((r) => r.pass);

describe('architecture builder checks', () => {
  it('lb-public-multi-az: nodes in public subnets in at least two zones', () => {
    const d = data(['lb-public-multi-az']);
    expect(pass(d, [{ kind: 'alb', tier: 'public', az: 0 }, { kind: 'alb', tier: 'public', az: 1 }])).toEqual([true]);
    expect(pass(d, [{ kind: 'alb', tier: 'public', az: 0 }])).toEqual([false]);
    expect(pass(d, [{ kind: 'alb', tier: 'public', az: 0 }, { kind: 'alb', tier: 'public', az: 0 }])).toEqual([false]);
    expect(pass(d, [{ kind: 'alb', tier: 'public', az: 0 }, { kind: 'alb', tier: 'private-app', az: 1 }])).toEqual([false]);
    expect(pass(d, [])).toEqual([false]);
  });
  it('app-private and app-multi-az', () => {
    const d = data(['app-private', 'app-multi-az']);
    expect(pass(d, [{ kind: 'app', tier: 'private-app', az: 0 }, { kind: 'app', tier: 'private-app', az: 1 }])).toEqual([true, true]);
    expect(pass(d, [{ kind: 'app', tier: 'private-app', az: 0 }, { kind: 'app', tier: 'private-app', az: 0 }])).toEqual([true, false]);
    expect(pass(d, [{ kind: 'app', tier: 'public', az: 0 }, { kind: 'app', tier: 'private-app', az: 1 }])).toEqual([false, false]);
  });
  it('nat-per-az: every zone with instances has its own NAT gateway in a public subnet', () => {
    const d = data(['nat-per-az'], 3);
    const apps: Placed[] = [0, 1, 2].map((az) => ({ kind: 'app', tier: 'private-app', az }));
    const nats = (zs: number[]): Placed[] => zs.map((az) => ({ kind: 'nat', tier: 'public', az }));
    expect(pass(d, [...apps, ...nats([0, 1, 2])])).toEqual([true]);
    expect(pass(d, [...apps, ...nats([0])])).toEqual([false]); // one shared gateway
    expect(pass(d, [...apps, ...nats([0, 0, 1])])).toEqual([false]); // two in one zone, none in the third
    expect(pass(d, [...apps, ...nats([0, 1]), { kind: 'nat', tier: 'private-app', az: 2 }])).toEqual([false]); // NAT in a private subnet
    expect(pass(d, nats([0, 1, 2]))).toEqual([false]); // no instances to serve
  });
  it('db-multi-az: one primary and a standby in a different zone, in private data subnets', () => {
    const d = data(['db-multi-az']);
    const p: Placed = { kind: 'db-primary', tier: 'private-data', az: 0 };
    expect(pass(d, [p, { kind: 'db-standby', tier: 'private-data', az: 1 }])).toEqual([true]);
    expect(pass(d, [p, { kind: 'db-standby', tier: 'private-data', az: 0 }])).toEqual([false]);
    expect(pass(d, [p])).toEqual([false]);
    expect(pass(d, [p, { kind: 'db-standby', tier: 'public', az: 1 }])).toEqual([false]);
  });
  it('db-private: database instances are not in a public subnet', () => {
    expect(pass(data(['db-private']), [{ kind: 'db-primary', tier: 'public', az: 0 }])).toEqual([false]);
    expect(pass(data(['db-private']), [{ kind: 'db-primary', tier: 'private-data', az: 0 }])).toEqual([true]);
    expect(pass(data(['db-private']), [{ kind: 'db-primary', tier: 'private-data', az: 0 }, { kind: 'db-standby', tier: 'public', az: 1 }])).toEqual([false]);
    expect(pass(data(['db-private']), [])).toEqual([false]);
  });
  it('cache-multi-az: two or more cache nodes in different zones, none in a public subnet', () => {
    const c = (az: number, tier: Placed['tier'] = 'private-data'): Placed => ({ kind: 'cache', tier, az });
    const d = data(['cache-multi-az']);
    expect(pass(d, [c(0), c(1)])).toEqual([true]);
    expect(pass(d, [c(0), c(0)])).toEqual([false]);
    expect(pass(d, [c(0)])).toEqual([false]);
    expect(pass(d, [c(0), c(1, 'public')])).toEqual([false]);
    expect(pass(d, [c(0), c(1), c(1, 'public')])).toEqual([false]);
  });
  it('queue-decouple: a queue in the regional row and at least one app instance in a private app subnet', () => {
    const d = data(['queue-decouple']);
    const q: Placed = { kind: 'queue', tier: 'regional', az: -1 };
    expect(pass(d, [q, { kind: 'app', tier: 'private-app', az: 0 }])).toEqual([true]);
    expect(pass(d, [q])).toEqual([false]); // nothing behind the queue
    expect(pass(d, [q, { kind: 'app', tier: 'public', az: 0 }])).toEqual([false]);
    expect(pass(d, [{ kind: 'queue', tier: 'public', az: 0 }, { kind: 'app', tier: 'private-app', az: 0 }])).toEqual([false]);
  });
  it('a placement is full credit only when every check passes', () => {
    const d = data(['app-private', 'db-multi-az']);
    const placed: Placed[] = [{ kind: 'app', tier: 'private-app', az: 0 }, { kind: 'db-primary', tier: 'private-data', az: 0 }];
    expect(score(d, placed).every((r) => r.pass)).toBe(false);
  });
});

describe('architecture builder scenarios', () => {
  it('every scenario is solvable from its palette and the reference solution passes all of its checks', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(9);
    for (const s of scenarios) {
      const ref = reference(s.data);
      expect(ref, s.id).not.toBeNull();
      expect(score(s.data, ref as Placed[]).every((r) => r.pass), s.id).toBe(true);
      expect(def.evaluate(s.data), s.id).not.toBeNull();
    }
  });
  it('refuses a scenario whose palette cannot satisfy its checks', () => {
    const d = data(['nat-per-az'], 3);
    d.palette = d.palette.map((p) => (p.kind === 'nat' ? { ...p, count: 1 } : p));
    expect(reference(d)).toBeNull();
    expect(def.evaluate(d)).toBeNull();
  });
  it('a naive design (everything in zone A, instances public) fails every check of the harder scenarios', () => {
    for (const s of scenarios) {
      const naive: Placed[] = s.data.palette.flatMap((p) => Array.from({ length: p.count }, (): Placed => ({ kind: p.kind, tier: p.kind === 'queue' ? 'regional' : 'public', az: p.kind === 'queue' ? -1 : 0 })));
      expect(score(s.data, naive).every((r) => r.pass), s.id).toBe(false);
    }
  });
});
