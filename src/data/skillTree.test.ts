import { describe, expect, it } from 'vitest';
import services from '../../scripts/official-services.json';
import { BUILDINGS, BUILDING_BY_ID, DISTRICT_BY_ID, FAMILIES, GRAPH, ROADS, START_IDS, atlasLinks } from './index';
import { BULLET_BY_ID, OUTLINE_DOMAINS, OUTLINE_TASKS } from './outline';
import { CATEGORY_TO_FAMILY, SERVICE_EXTRA_FAMILIES } from './families';
import { ancestorsOf, impliedEdges, reachableFrom, topologicalOrder } from '../lib/graph';

const inScope = new Map<string, string>(); // service -> category
for (const c of services.inScope.categories) for (const s of c.services) inScope.set(s, c.name);

const taskBuildings = BUILDINGS.filter((b) => b.task !== null);
const foundations = BUILDINGS.filter((b) => b.task === null);

describe('outline counts', () => {
  it('has 4 domains with weights 30/26/24/20 summing to 100', () => {
    expect(OUTLINE_DOMAINS.map((d) => d.weightPercent)).toEqual([30, 26, 24, 20]);
    expect(OUTLINE_DOMAINS.reduce((n, d) => n + d.weightPercent, 0)).toBe(100);
  });
  it('has 14 task statements split 3/2/5/4', () => {
    expect(OUTLINE_DOMAINS.map((d) => d.tasks.length)).toEqual([3, 2, 5, 4]);
    expect(OUTLINE_TASKS).toHaveLength(14);
  });
  it('tags every bullet as knowledge or skill and ids match order', () => {
    for (const t of OUTLINE_TASKS) {
      for (const b of t.bullets) {
        expect(b.id.startsWith(`${t.id}-${b.type === 'knowledge' ? 'K' : 'S'}`)).toBe(true);
      }
    }
  });
});

describe('bullet mapping', () => {
  it('maps every outline bullet to exactly one building', () => {
    const seen = new Map<string, string[]>();
    for (const b of BUILDINGS) for (const id of b.bullets) seen.set(id, [...(seen.get(id) ?? []), b.id]);
    for (const id of BULLET_BY_ID.keys()) {
      expect(seen.get(id), `bullet ${id}`).toHaveLength(1);
    }
    for (const id of seen.keys()) expect(BULLET_BY_ID.has(id), `unknown bullet ${id}`).toBe(true);
  });
  it('groups 2-5 bullets from one task statement per building', () => {
    for (const b of taskBuildings) {
      expect(b.bullets.length, b.id).toBeGreaterThanOrEqual(2);
      expect(b.bullets.length, b.id).toBeLessThanOrEqual(5);
      for (const id of b.bullets) expect(id.startsWith(`${b.task}-`), `${b.id} has ${id}`).toBe(true);
    }
  });
  it('places each building in the district that matches its domain', () => {
    for (const b of taskBuildings) {
      const domain = Number((b.task as string).split('.')[0]);
      expect(DISTRICT_BY_ID[b.district].domain, b.id).toBe(domain);
    }
  });
});

describe('foundations', () => {
  it('has at most 4 foundations, with no bullets, all start buildings, each explained', () => {
    expect(foundations.length).toBeGreaterThan(0);
    expect(foundations.length).toBeLessThanOrEqual(4);
    for (const f of foundations) {
      expect(f.bullets).toEqual([]);
      expect(f.start).toBe(true);
      expect(f.district).toBe('square');
      expect(f.foundationReason?.length ?? 0).toBeGreaterThan(20);
    }
    expect(taskBuildings.every((b) => b.district !== 'square' && !b.start)).toBe(true);
  });
  it('gives every foundation at least one road out', () => {
    for (const f of foundations) expect(GRAPH.dependents.get(f.id)?.length ?? 0, f.id).toBeGreaterThan(0);
  });
});

describe('identity', () => {
  it('has unique building ids and names', () => {
    expect(new Set(BUILDINGS.map((b) => b.id)).size).toBe(BUILDINGS.length);
    expect(new Set(BUILDINGS.map((b) => b.name)).size).toBe(BUILDINGS.length);
  });
  it('spreads each district across the three islands, none for the square', () => {
    for (const b of foundations) expect(b.island).toBeNull();
    for (const d of ['citadel', 'harbor', 'express', 'treasury'] as const) {
      const islands = new Set(BUILDINGS.filter((b) => b.district === d).map((b) => b.island));
      expect(islands).toEqual(new Set(['A', 'B', 'C']));
    }
  });
});

describe('roads', () => {
  it('only connect existing buildings, with no duplicates or self-loops', () => {
    const keys = new Set<string>();
    for (const r of ROADS) {
      expect(BUILDING_BY_ID.has(r.from), `from ${r.from}`).toBe(true);
      expect(BUILDING_BY_ID.has(r.to), `to ${r.to}`).toBe(true);
      expect(r.from).not.toBe(r.to);
      const k = `${r.from}>${r.to}`;
      expect(keys.has(k), `duplicate ${k}`).toBe(false);
      keys.add(k);
    }
  });
  it('gives every road a one-line reason', () => {
    for (const r of ROADS) {
      expect(r.reason.trim().length, `${r.from}>${r.to}`).toBeGreaterThan(15);
      expect(r.reason.length, `${r.from}>${r.to}`).toBeLessThanOrEqual(160);
      expect(r.reason.includes('\n')).toBe(false);
    }
  });
  it('is acyclic', () => {
    expect(topologicalOrder(GRAPH)).not.toBeNull();
  });
  it('makes every building reachable from a start building', () => {
    const reach = reachableFrom(GRAPH, START_IDS);
    const unreachable = BUILDINGS.filter((b) => !reach.has(b.id)).map((b) => b.id);
    expect(unreachable).toEqual([]);
  });
  it('lets only start buildings have no prerequisites', () => {
    for (const b of BUILDINGS) {
      const n = GRAPH.prereqs.get(b.id)?.length ?? 0;
      if (b.start) expect(n, b.id).toBe(0);
      else expect(n, b.id).toBeGreaterThan(0);
    }
  });
  it('has no road already implied by other roads (transitive reduction)', () => {
    expect(impliedEdges(GRAPH, ROADS).map((e) => `${e.from}>${e.to}`)).toEqual([]);
  });
  it('detects an implied road when one is added (test self-check)', () => {
    const extra = [...ROADS, { from: 'pillar-plaza', to: 'message-quay', reason: 'x'.repeat(20) }];
    const g = { ...GRAPH, ...(() => {
      const prereqs = new Map(GRAPH.prereqs);
      const dependents = new Map(GRAPH.dependents);
      prereqs.set('message-quay', [...(prereqs.get('message-quay') ?? []), 'pillar-plaza']);
      dependents.set('pillar-plaza', [...(dependents.get('pillar-plaza') ?? []), 'message-quay']);
      return { prereqs, dependents };
    })() };
    expect(impliedEdges(g, extra).map((e) => `${e.from}>${e.to}`)).toContain('pillar-plaza>message-quay');
  });
  it('keeps prerequisite depth reasonable', () => {
    const order = topologicalOrder(GRAPH) as string[];
    const depth = new Map<string, number>();
    for (const id of order) {
      const ps = GRAPH.prereqs.get(id) ?? [];
      depth.set(id, ps.length === 0 ? 0 : 1 + Math.max(...ps.map((p) => depth.get(p) ?? 0)));
    }
    expect(Math.max(...depth.values())).toBeLessThanOrEqual(9);
  });
  it('lets a building rely on a prerequisite ancestor that exists', () => {
    expect(ancestorsOf(GRAPH, 'cold-cellar').has('freight-depot')).toBe(true);
    expect(ancestorsOf(GRAPH, 'gatehouse').has('grid-planning-office')).toBe(true);
  });
});

describe('services and families', () => {
  it('uses only in-scope service names, spelled as in the exam guide', () => {
    for (const b of BUILDINGS) for (const s of b.services) expect(inScope.has(s), `${b.id}: ${s}`).toBe(true);
  });
  it('uses no out-of-scope service names in buildings', () => {
    const out = new Set(services.outOfScope.categories.flatMap((c) => c.services));
    for (const b of BUILDINGS) {
      for (const s of b.services) expect(out.has(s), `${b.id}: ${s}`).toBe(false);
    }
  });
  it('tags every task building with at least one valid family covering its services', () => {
    const valid = new Set(FAMILIES.map((f) => f.id));
    for (const b of BUILDINGS) {
      for (const f of b.families) expect(valid.has(f), `${b.id}: ${f}`).toBe(true);
      if (b.task !== null) expect(b.families.length, b.id).toBeGreaterThan(0);
      for (const s of b.services) {
        const accepted = SERVICE_EXTRA_FAMILIES[s] ?? [];
        const cat = inScope.get(s) as string;
        const fam = CATEGORY_TO_FAMILY[cat];
        const options = [...(fam ? [fam] : []), ...accepted];
        if (options.length === 0) continue; // e.g. Machine Learning: no family
        expect(options.some((o) => b.families.includes(o)), `${b.id} needs a family for ${s}`).toBe(true);
      }
    }
  });
  it('has buildings under every family and each family in at least two districts', () => {
    for (const f of FAMILIES) {
      const ds = new Set(BUILDINGS.filter((b) => b.families.includes(f.id) && b.district !== 'square').map((b) => b.district));
      expect(ds.size, f.name).toBeGreaterThanOrEqual(2);
    }
  });
  it('computes Atlas links across districts for repeated services', () => {
    const links = atlasLinks('cold-cellar').map((l) => `${l.family}:${l.building.id}`);
    expect(links).toContain('storage:freight-depot');
    expect(atlasLinks('cold-cellar').every((l) => l.building.district !== 'treasury')).toBe(true);
  });
});

describe('carryover tags', () => {
  it('covers all five portfolio technologies', () => {
    const techs = new Set(BUILDINGS.flatMap((b) => (b.portfolio ?? []).map((p) => p.tech)));
    expect(techs).toEqual(new Set(['s3-static-hosting', 'cloudfront', 'lambda', 'api-gateway', 'dynamodb']));
  });
  it('gives portfolio notes about design decisions, not definitions', () => {
    for (const b of BUILDINGS) for (const p of b.portfolio ?? []) expect(p.note.length, b.id).toBeGreaterThan(40);
  });
  it('keeps portfolio tags off foundations', () => {
    for (const f of foundations) expect(f.portfolio).toBeUndefined();
  });
  it('sources every Azure tag from Microsoft Learn or queues it for verification', () => {
    for (const b of BUILDINGS) {
      for (const a of b.azure ?? []) {
        if (a.status === 'sourced') {
          expect(a.sourceUrl?.startsWith('https://learn.microsoft.com/en-us/azure/architecture/aws-professional/'), `${b.id}: ${a.concept}`).toBe(true);
        } else {
          expect(a.sourceUrl).toBeNull();
        }
      }
    }
  });
  it('tags Azure crosswalks on a meaningful number of buildings', () => {
    expect(BUILDINGS.filter((b) => (b.azure?.length ?? 0) > 0).length).toBeGreaterThanOrEqual(30);
  });
});
