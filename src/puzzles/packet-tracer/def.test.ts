import { describe, expect, it } from 'vitest';
import { def, type PacketScenario, type Vpc, type Attempt, type Route, type Sg, type Nacl, type SgRule } from './def';
import scenarios from '../../../content/puzzles/packet-tracer';

const any = '0.0.0.0/0';
const tcp = (peer: string, from: number, to: number = from): SgRule => ({ proto: 'tcp', from, to, peer });

/** One VPC with a public subnet (pub) and a private subnet (priv); callers override pieces. */
function vpc(o: { pubRoutes?: Route[]; privRoutes?: Route[]; sgs?: Sg[]; nacls?: Nacl[]; privNacl?: string; privSgs?: string[]; privPublicIp?: string; natSubnet?: string; igw?: boolean } = {}): Vpc {
  return {
    id: 'v',
    name: 'Test VPC',
    cidr: '10.0.0.0/16',
    igw: o.igw ?? true,
    subnets: [
      { id: 'pub', cidr: '10.0.1.0/24', rt: 'pub-rt' },
      { id: 'priv', cidr: '10.0.2.0/24', rt: 'priv-rt', nacl: o.privNacl },
    ],
    routeTables: [
      { id: 'main-rt', main: true, routes: [] },
      { id: 'pub-rt', routes: o.pubRoutes ?? [{ dest: any, target: 'igw' }] },
      { id: 'priv-rt', routes: o.privRoutes ?? [{ dest: any, target: 'nat:nat-1' }] },
    ],
    nacls: [{ id: 'nacl-default', default: true }, ...(o.nacls ?? [])],
    sgs: o.sgs ?? [{ id: 'sg-open', inbound: [tcp(any, 443)] }],
    nodes: [{ id: 'i1', name: 'i1', kind: 'instance', subnet: 'priv', ip: '10.0.2.10', sgs: o.privSgs ?? ['sg-open'], publicIp: o.privPublicIp }],
    nats: [{ id: 'nat-1', subnet: o.natSubnet ?? 'pub' }],
  };
}
const out = (v: Vpc, extra: Partial<Attempt> = {}): PacketScenario => ({
  vpcs: [v],
  attempt: { src: { kind: 'node', id: 'i1' }, dst: { kind: 'internet', ip: '198.51.100.7', label: 'Host' }, proto: 'tcp', port: 443, ...extra },
});
const seen = new Set<string>();
const run = (s: PacketScenario) => {
  const e = def.evaluate(s);
  for (const x of e?.trace ?? []) seen.add(x.rule);
  return e;
};
const ans = (s: PacketScenario) => run(s)?.answer;
const rulesOf = (s: PacketScenario) => run(s)?.trace.map((t) => t.rule) ?? [];

describe('packet-tracer: scenarios', () => {
  it('every scenario is settled and deterministic', () => {
    for (const s of scenarios) {
      const a = run(s.data);
      expect(a, s.id).not.toBeNull();
      expect(def.evaluate(s.data)).toEqual(a);
      const f = def.fields(s.data);
      const blocker = f.find((x) => x.id === 'blocker');
      expect(blocker?.options.map((o) => o.id)).toContain(a?.answer.blocker?.[0]);
    }
  });
  it('mixes answers', () => {
    const yes = scenarios.filter((s) => def.evaluate(s.data)?.answer.outcome?.[0] === 'yes').length;
    expect(yes).toBeGreaterThanOrEqual(4);
    expect(yes).toBeLessThan(scenarios.length - 8);
  });
});

describe('packet-tracer: AWS documentation examples', () => {
  // Custom network ACLs page (custom-network-acl.html): inbound rules 100 HTTP 80, 110 HTTPS 443, 120 SSH from 192.0.2.0/24,
  // 140 return traffic 32768-65535. HTTPS matches rule 110; port 139 matches none and the * rule denies it.
  const docNacl: Nacl = {
    id: 'doc',
    inbound: [
      { n: 100, proto: 'tcp', from: 80, to: 80, cidr: any, action: 'allow' },
      { n: 110, proto: 'tcp', from: 443, to: 443, cidr: any, action: 'allow' },
      { n: 120, proto: 'tcp', from: 22, to: 22, cidr: '192.0.2.0/24', action: 'allow' },
      { n: 140, proto: 'tcp', from: 32768, to: 65535, cidr: any, action: 'allow' },
    ],
    outbound: [
      { n: 100, proto: 'tcp', from: 80, to: 80, cidr: any, action: 'allow' },
      { n: 110, proto: 'tcp', from: 443, to: 443, cidr: any, action: 'allow' },
      { n: 140, proto: 'tcp', from: 32768, to: 65535, cidr: any, action: 'allow' },
    ],
  };
  const inb = (port: number): PacketScenario => ({
    vpcs: [{ ...vpc({ nacls: [docNacl], sgs: [{ id: 'sg-open', inbound: [tcp(any, 139), tcp(any, 443)] }], privRoutes: [{ dest: any, target: 'igw' }] }), subnets: [{ id: 'pub', cidr: '10.0.1.0/24', rt: 'pub-rt', nacl: 'doc' }, { id: 'priv', cidr: '10.0.2.0/24', rt: 'pub-rt', nacl: 'doc' }], nodes: [{ id: 'i1', name: 'i1', kind: 'instance', subnet: 'pub', ip: '10.0.1.10', sgs: ['sg-open'], publicIp: '192.0.2.44' }] }],
    attempt: { src: { kind: 'internet', ip: '203.0.113.9', label: 'Client' }, dst: { kind: 'node', id: 'i1', via: 'public' }, proto: 'tcp', port },
  });
  it('port 443 matches rule 110; port 139 is denied by the * rule', () => {
    expect(ans(inb(443))).toEqual({ outcome: ['yes'], blocker: ['none'] });
    expect(ans(inb(139))).toEqual({ outcome: ['no'], blocker: ['nacl:doc'] });
    expect(rulesOf(inb(139))).toContain('nacl-final-deny');
  });

  // Route priority page (route-tables-priority.html): the longest prefix wins ("10.10.2.15/32 has priority over 10.10.2.0/24").
  it('the longest prefix wins (a /32 beats a /24 beats 0.0.0.0/0)', () => {
    const routes: Route[] = [
      { dest: any, target: 'igw' },
      { dest: '198.51.100.0/24', target: 'igw' },
      { dest: '198.51.100.7/32', target: 'nat:nat-1' },
    ];
    // i1 has no public IP: only the /32 route (to the NAT gateway) can succeed.
    expect(ans(out(vpc({ privRoutes: routes })))).toEqual({ outcome: ['yes'], blocker: ['none'] });
    expect(ans(out(vpc({ privRoutes: routes }), { dst: { kind: 'internet', ip: '198.51.100.8', label: 'Host' } }))).toEqual({ outcome: ['no'], blocker: ['addr:i1'] });
  });

  // Example routing options, "Routing to a VPC peering connection" (route-table-options.html): VPC A 10.0.0.0/16 with
  // 172.31.0.0/16 to the peering connection, VPC B 172.31.0.0/16 with 10.0.0.0/16 to the peering connection.
  const peered = (bRoute: boolean): PacketScenario => ({
    vpcs: [
      { id: 'a', name: 'VPC A', cidr: '10.0.0.0/16', igw: false, subnets: [{ id: 'sa', cidr: '10.0.1.0/24', rt: 'ra' }], routeTables: [{ id: 'ma', main: true, routes: [] }, { id: 'ra', routes: [{ dest: '172.31.0.0/16', target: 'pcx:pcx-1' }] }], nacls: [{ id: 'na', default: true }], sgs: [{ id: 'sga', inbound: [] }], nodes: [{ id: 'a1', name: 'a1', kind: 'instance', subnet: 'sa', ip: '10.0.1.5', sgs: ['sga'] }] },
      { id: 'b', name: 'VPC B', cidr: '172.31.0.0/16', igw: false, subnets: [{ id: 'sb', cidr: '172.31.1.0/24', rt: 'rb' }], routeTables: [{ id: 'mb', main: true, routes: [] }, { id: 'rb', routes: bRoute ? [{ dest: '10.0.0.0/16', target: 'pcx:pcx-1' }] : [] }], nacls: [{ id: 'nb', default: true }], sgs: [{ id: 'sgb', inbound: [tcp('10.0.0.0/16', 22)] }], nodes: [{ id: 'b1', name: 'b1', kind: 'instance', subnet: 'sb', ip: '172.31.1.9', sgs: ['sgb'] }] },
    ],
    peerings: [{ id: 'pcx-1', a: 'a', b: 'b' }],
    attempt: { src: { kind: 'node', id: 'a1' }, dst: { kind: 'node', id: 'b1' }, proto: 'tcp', port: 22 },
  });
  it('peering needs a route on both sides', () => {
    expect(ans(peered(true))).toEqual({ outcome: ['yes'], blocker: ['none'] });
    expect(ans(peered(false))).toEqual({ outcome: ['no'], blocker: ['rt:rb'] });
  });

  // Peering basics page (vpc-peering-basics.html): VPC A peered with B and C; B and C are not peered and A is no transit point.
  it('peering is not transitive', () => {
    const base = peered(true);
    const c: Vpc = { id: 'c', name: 'VPC C', cidr: '192.168.0.0/16', igw: false, subnets: [{ id: 'sc', cidr: '192.168.1.0/24', rt: 'rc' }], routeTables: [{ id: 'mc', main: true, routes: [] }, { id: 'rc', routes: [] }], nacls: [{ id: 'nc', default: true }], sgs: [{ id: 'sgc', inbound: [tcp(any, 22)] }], nodes: [{ id: 'c1', name: 'c1', kind: 'instance', subnet: 'sc', ip: '192.168.1.4', sgs: ['sgc'] }] };
    const vpcs = [...base.vpcs, c];
    (vpcs[1] as Vpc).routeTables = [{ id: 'mb', main: true, routes: [] }, { id: 'rb', routes: [{ dest: '10.0.0.0/16', target: 'pcx-1'.replace(/^/, 'pcx:') }, { dest: '192.168.0.0/16', target: 'pcx:pcx-1' }] }];
    const s: PacketScenario = { vpcs, peerings: [{ id: 'pcx-1', a: 'a', b: 'b' }, { id: 'pcx-2', a: 'a', b: 'c' }], attempt: { src: { kind: 'node', id: 'b1' }, dst: { kind: 'node', id: 'c1' }, proto: 'tcp', port: 22 } };
    expect(ans(s)).toEqual({ outcome: ['no'], blocker: ['pcx:pcx-1'] });
    expect(rulesOf(s)).toContain('peer-non-transitive');
    // C is not peered with the middle VPC at all: no relationship.
    const t = { ...s, peerings: [{ id: 'pcx-1', a: 'a', b: 'b' }] };
    expect(rulesOf(t)).toContain('peer-no-other');
  });

  // Peering basics page, "Edge to edge routing through a gateway": a peer cannot use the internet gateway, NAT device or gateway endpoint.
  it('a peer cannot borrow an internet gateway', () => {
    const s = peered(true);
    const [a, b] = s.vpcs as [Vpc, Vpc];
    a.igw = true;
    a.routeTables = [{ id: 'ma', main: true, routes: [] }, { id: 'ra', routes: [{ dest: '172.31.0.0/16', target: 'pcx:pcx-1' }, { dest: any, target: 'igw' }] }];
    b.routeTables = [{ id: 'mb', main: true, routes: [] }, { id: 'rb', routes: [{ dest: any, target: 'pcx:pcx-1' }] }];
    const t: PacketScenario = { ...s, vpcs: [a, b], attempt: { src: { kind: 'node', id: 'b1' }, dst: { kind: 'internet', ip: '198.51.100.7', label: 'Host' }, proto: 'tcp', port: 443 } };
    expect(ans(t)).toEqual({ outcome: ['no'], blocker: ['pcx:pcx-1'] });
    expect(rulesOf(t)).toContain('peer-edge-igw');
  });

  // Security group rules page: web servers allow traffic only from the load balancer security group; database from the web group.
  it('a rule that names a security group admits only its members', () => {
    const sgs: Sg[] = [{ id: 'lb-sg', inbound: [] }, { id: 'web-sg', inbound: [tcp('sg:lb-sg', 443)] }, { id: 'other-sg', inbound: [] }];
    const v = (src: string): PacketScenario => ({
      vpcs: [{ id: 'v', name: 'V', cidr: '10.0.0.0/16', igw: false, subnets: [{ id: 's', cidr: '10.0.1.0/24' }], routeTables: [{ id: 'm', main: true, routes: [] }], nacls: [{ id: 'n', default: true }], sgs, nodes: [
        { id: 'lb', name: 'lb', kind: 'instance', subnet: 's', ip: '10.0.1.5', sgs: ['lb-sg'] },
        { id: 'oth', name: 'oth', kind: 'instance', subnet: 's', ip: '10.0.1.6', sgs: ['other-sg'] },
        { id: 'web', name: 'web', kind: 'instance', subnet: 's', ip: '10.0.1.7', sgs: ['web-sg'] }] }],
      attempt: { src: { kind: 'node', id: src }, dst: { kind: 'node', id: 'web' }, proto: 'tcp', port: 443 },
    });
    expect(ans(v('lb'))).toEqual({ outcome: ['yes'], blocker: ['none'] });
    expect(ans(v('oth'))).toEqual({ outcome: ['no'], blocker: ['sg:web-sg'] });
  });
});

describe('packet-tracer: rules', () => {
  it('NAT gateway outside a public subnet cannot reach the internet', () => {
    const s = out(vpc({ pubRoutes: [] }));
    expect(ans(s)).toEqual({ outcome: ['no'], blocker: ['rt:pub-rt'] });
    expect(rulesOf(s)).toContain('nat-public-subnet');
  });
  it('NAT gateway subnet network ACL matters, with ports 1024-65535 on the way back', () => {
    const closed: Nacl = { id: 'nat-nacl', inbound: [{ n: 100, proto: 'tcp', from: 1024, to: 2000, cidr: any, action: 'allow' }], outbound: [{ n: 100, proto: 'tcp', from: 443, to: 443, cidr: any, action: 'allow' }] };
    const v = vpc({ nacls: [closed] });
    v.subnets[0] = { id: 'pub', cidr: '10.0.1.0/24', rt: 'pub-rt', nacl: 'nat-nacl' };
    // The inbound rule covers only part of 1024-65535, so the case is not settled.
    expect(def.evaluate(out(v))).toBeNull();
  });
  it('an inbound connection to a private instance cannot start through the NAT gateway', () => {
    const v = vpc({ privPublicIp: '192.0.2.5' });
    const s: PacketScenario = { vpcs: [v], attempt: { src: { kind: 'internet', ip: '203.0.113.9', label: 'C' }, dst: { kind: 'node', id: 'i1', via: 'public' }, proto: 'tcp', port: 443 } };
    expect(ans(s)).toEqual({ outcome: ['no'], blocker: ['rt:priv-rt'] });
    expect(rulesOf(s)).toContain('nat-outbound-only');
  });
  it('no internet gateway: inbound blocked at the gateway', () => {
    const v = vpc({ igw: false, pubRoutes: [], privRoutes: [] });
    v.nodes[0] = { id: 'i1', name: 'i1', kind: 'instance', subnet: 'pub', ip: '10.0.1.10', sgs: ['sg-open'], publicIp: '192.0.2.5' };
    v.nats = [];
    const s: PacketScenario = { vpcs: [v], attempt: { src: { kind: 'internet', ip: '203.0.113.9', label: 'C' }, dst: { kind: 'node', id: 'i1', via: 'public' }, proto: 'tcp', port: 443 } };
    // No gateway and no route at once: two components would each block it, so the case is refused.
    expect(def.evaluate(s)).toBeNull();
  });
  it('security groups: empty inbound, empty outbound, aggregation, prefix list', () => {
    const none = vpc({ sgs: [{ id: 'sg-open', inbound: [], outbound: [] }] });
    const a = out(none);
    expect(ans(a)).toEqual({ outcome: ['no'], blocker: ['sg:sg-open'] });
    expect(rulesOf(a)).toContain('sg-outbound-none');
    const b: PacketScenario = { vpcs: [vpc({ sgs: [{ id: 'sg-open', inbound: [] }], privPublicIp: '192.0.2.5', privRoutes: [{ dest: any, target: 'igw' }] })], attempt: { src: { kind: 'internet', ip: '203.0.113.9', label: 'C' }, dst: { kind: 'node', id: 'i1', via: 'public' }, proto: 'tcp', port: 443 } };
    (b.vpcs[0] as Vpc).nodes[0] = { id: 'i1', name: 'i1', kind: 'instance', subnet: 'pub', ip: '10.0.1.10', sgs: ['sg-open'], publicIp: '192.0.2.5' };
    expect(rulesOf(b)).toContain('sg-inbound-none');
    const agg = vpc({ sgs: [{ id: 'sg-open', inbound: [] }, { id: 'sg-two', inbound: [tcp(any, 443)] }], privSgs: ['sg-open', 'sg-two'], privPublicIp: '192.0.2.5' });
    const c: PacketScenario = { vpcs: [agg], attempt: { src: { kind: 'internet', ip: '203.0.113.9', label: 'C' }, dst: { kind: 'node', id: 'i1', via: 'public' }, proto: 'tcp', port: 443 } };
    (c.vpcs[0] as Vpc).nodes[0] = { id: 'i1', name: 'i1', kind: 'instance', subnet: 'pub', ip: '10.0.1.10', sgs: ['sg-open', 'sg-two'], publicIp: '192.0.2.5' };
    expect(rulesOf(c)).toContain('sg-aggregate');
    expect(ans(c)).toEqual({ outcome: ['yes'], blocker: ['none'] });
  });
  it('gateway endpoint: SG with a CIDR rule or the prefix list, and the NACL', () => {
    const base = { privRoutes: [{ dest: 'pl:s3', target: 'vpce:e' }] };
    const toS3 = (v: Vpc): PacketScenario => ({ ...out(v), attempt: { src: { kind: 'node', id: 'i1' }, dst: { kind: 'service', service: 's3' }, proto: 'tcp', port: 443 } });
    const mk = (sg: Sg) => {
      const v = vpc({ ...base, sgs: [sg] });
      v.gwEps = [{ id: 'e', service: 's3' }];
      return toS3(v);
    };
    expect(rulesOf(mk({ id: 'sg-open', inbound: [], outbound: [tcp(any, 443)] }))).toContain('gwep-sg');
    expect(rulesOf(mk({ id: 'sg-open', inbound: [], outbound: [tcp('pl:s3', 443)] }))).toContain('gwep-prefix-sg');
    expect(ans(mk({ id: 'sg-open', inbound: [], outbound: [tcp('pl:dynamodb', 443)] }))).toEqual({ outcome: ['no'], blocker: ['sg:sg-open'] });
  });
  it('an explicit deny on the reply is reported', () => {
    const nacl: Nacl = { id: 'strict', inbound: [{ n: 100, proto: 'tcp', from: 32768, to: 61000, cidr: any, action: 'deny' }, { n: 110, proto: 'all', cidr: any, action: 'allow' }] };
    const v = vpc({ nacls: [nacl], privNacl: 'strict' });
    expect(ans(out(v))).toEqual({ outcome: ['no'], blocker: ['nacl:strict'] });
  });
  it('Linux and Windows clients use different reply ranges', () => {
    const nacl: Nacl = { id: 'lin', inbound: [{ n: 100, proto: 'tcp', from: 32768, to: 61000, cidr: any, action: 'allow' }], outbound: [{ n: 100, proto: 'all', cidr: any, action: 'allow' }] };
    const v = vpc({ nacls: [nacl], privNacl: 'lin' });
    expect(ans(out(v, { clientOs: 'linux' }))?.outcome).toEqual(['yes']);
    // The Linux range overlaps the Windows range (49152-65535) only in part: not settled.
    expect(def.evaluate(out(v, { clientOs: 'windows' }))).toBeNull();
    expect(rulesOf(out(v, { clientOs: 'linux' }))).toContain('eph-linux');
    const win: Nacl = { id: 'win', inbound: [{ n: 100, proto: 'tcp', from: 49152, to: 65535, cidr: any, action: 'allow' }], outbound: [{ n: 100, proto: 'all', cidr: any, action: 'allow' }] };
    expect(rulesOf(out(vpc({ nacls: [win], privNacl: 'win' }), { clientOs: 'windows' }))).toContain('eph-windows');
  });
  it('the subnet uses the main route table and default network ACL when none is associated', () => {
    const v = vpc();
    v.subnets[1] = { id: 'priv', cidr: '10.0.2.0/24' };
    const r = rulesOf(out(v));
    expect(r).toContain('route-main');
    expect(r).toContain('nacl-assoc');
    expect(ans(out(v))).toEqual({ outcome: ['no'], blocker: ['rt:main-rt'] });
  });
});

describe('packet-tracer: refusals', () => {
  const ok = out(vpc());
  const refused = (s: PacketScenario) => expect(def.evaluate(s)).toBeNull();
  it('baseline is settled', () => expect(def.evaluate(ok)).not.toBeNull());
  it('IPv6 addresses and CIDRs', () => {
    refused(out(vpc(), { dst: { kind: 'internet', ip: '2001:db8::1', label: 'v6' } }));
    refused(out(vpc({ privRoutes: [{ dest: '::/0', target: 'igw' }] })));
  });
  it('overlapping peered CIDRs (peer-overlap)', () => {
    const a = vpc();
    const b: Vpc = { ...vpc(), id: 'w', name: 'Other' };
    refused({ ...ok, vpcs: [a, b], peerings: [{ id: 'p', a: 'v', b: 'w' }] });
  });
  it('two faults at once: blame is not settled', () => {
    refused(out(vpc({ sgs: [{ id: 'sg-open', inbound: [], outbound: [] }], privRoutes: [] })));
  });
  it('several security groups and none allows it', () => {
    const v = vpc({ sgs: [{ id: 'sg-open', inbound: [], outbound: [] }, { id: 'sg-two', inbound: [], outbound: [] }], privSgs: ['sg-open', 'sg-two'] });
    refused(out(v));
  });
  it('a rule that covers only part of the reply port range', () => {
    const nacl: Nacl = { id: 'part', inbound: [{ n: 100, proto: 'tcp', from: 40000, to: 65535, cidr: any, action: 'allow' }] };
    refused(out(vpc({ nacls: [nacl], privNacl: 'part' })));
  });
  it('a service reached through a non-default public CIDR route, or a CIDR rule against a service', () => {
    const toS3 = (v: Vpc): PacketScenario => ({ ...ok, vpcs: [v], attempt: { src: { kind: 'node', id: 'i1' }, dst: { kind: 'service', service: 's3' }, proto: 'tcp', port: 443 } });
    refused(toS3(vpc({ privRoutes: [{ dest: '52.0.0.0/8', target: 'nat:nat-1' }] })));
    refused(toS3(vpc({ sgs: [{ id: 'sg-open', inbound: [], outbound: [tcp('10.0.0.0/16', 443)] }] })));
  });
  it('unsupported inputs: a service as source, an instance by public address from inside, bad port, unknown target', () => {
    refused({ ...ok, attempt: { ...ok.attempt, src: { kind: 'service', service: 's3' } } });
    refused({ ...ok, attempt: { ...ok.attempt, dst: { kind: 'node', id: 'i1', via: 'public' } } });
    refused({ ...ok, attempt: { ...ok.attempt, port: 0 } });
    refused(out(vpc({ privRoutes: [{ dest: any, target: 'tgw:x' }] })));
    refused(out(vpc({ privRoutes: [{ dest: any, target: 'igw' }, { dest: any, target: 'nat:nat-1' }] })));
  });
  it('a route to an internet gateway that is not attached', () => {
    refused(out(vpc({ igw: false, privRoutes: [{ dest: any, target: 'igw' }] })));
  });
  it('interface endpoints in another VPC are not settled', () => {
    const a = vpc();
    const b: Vpc = { ...vpc(), id: 'w', name: 'W', cidr: '10.9.0.0/16', subnets: [{ id: 'bs', cidr: '10.9.1.0/24' }], routeTables: [{ id: 'bm', main: true, routes: [] }], nacls: [{ id: 'bn', default: true }], sgs: [{ id: 'sg-e', inbound: [] }], nodes: [{ id: 'ep', name: 'ep', kind: 'interface-endpoint', subnet: 'bs', ip: '10.9.1.5', sgs: ['sg-e'] }], nats: [] };
    refused({ vpcs: [a, b], peerings: [{ id: 'p', a: 'v', b: 'w' }], attempt: { src: { kind: 'node', id: 'i1' }, dst: { kind: 'node', id: 'ep' }, proto: 'tcp', port: 443 } });
  });
});

describe('packet-tracer: text', () => {
  it('exhibit and fields read well for every scenario', () => {
    for (const s of scenarios) {
      const ex = def.exhibit(s.data);
      expect(ex.length).toBeGreaterThan(4);
      expect(ex[ex.length - 1]?.title).toBe('The connection attempt');
      const f = def.fields(s.data);
      expect(f.map((x) => x.id)).toEqual(['outcome', 'blocker']);
      expect(f[1]?.options.at(-1)?.id).toBe('none');
    }
  });
});

describe('packet-tracer: coverage', () => {
  it('every rule has been used by some trace (peer-overlap is a refusal rule)', () => {
    expect(def.rules.map((r) => r.id).filter((id) => !seen.has(id) && id !== 'peer-overlap')).toEqual([]);
  });
});
