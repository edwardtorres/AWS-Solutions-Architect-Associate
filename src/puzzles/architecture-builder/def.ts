import type { Evaluation, ExhibitSection, PuzzleDef, Rule } from '../types';

export type Kind = 'alb' | 'app' | 'nat' | 'db-primary' | 'db-standby' | 'cache' | 'queue';
export type Tier = 'public' | 'private-app' | 'private-data' | 'regional';
export type CheckId = 'lb-public-multi-az' | 'app-private' | 'app-multi-az' | 'nat-per-az' | 'db-multi-az' | 'db-private' | 'cache-multi-az' | 'queue-decouple';

/** A component the player placed. `az` is 0 to azs-1, or -1 in the regional row. */
export interface Placed {
  kind: Kind;
  tier: Tier;
  az: number;
}

export interface BuilderData {
  azs: 2 | 3;
  /** Components the player may place, with how many of each. */
  palette: { kind: Kind; count: number }[];
  /** The requirements the design must meet; each is scored by one explicit check. */
  checks: { id: CheckId; need: string }[];
}

export const KIND_LABEL: Record<Kind, string> = {
  alb: 'Application Load Balancer node',
  app: 'Web/app instance (Auto Scaling group)',
  nat: 'NAT gateway',
  'db-primary': 'Amazon RDS primary DB instance',
  'db-standby': 'Amazon RDS standby DB instance',
  cache: 'Amazon ElastiCache node',
  queue: 'Amazon SQS queue',
};

export const TIER_LABEL: Record<Tier, string> = {
  public: 'Public subnets',
  'private-app': 'Private app subnets',
  'private-data': 'Private data subnets',
  regional: 'Regional services (not in a subnet)',
};

export const TIERS: readonly Tier[] = ['public', 'private-app', 'private-data', 'regional'];

/** The sourced rules the checks apply. Each check cites its rule ids. */
export const rules: Rule[] = [
  { id: 'lb-az-nodes', text: 'Enabling an Availability Zone for a load balancer creates a load balancer node there, so a load balancer in two or more zones keeps serving if one zone fails.', src: 'elb-how-it-works', quote: 'When you enable an Availability Zone for your load balancer, Elastic Load Balancing creates a load balancer node in the Availability Zone.' },
  { id: 'lb-internet-facing', text: 'The nodes of an internet-facing load balancer have public IP addresses, so they sit in public subnets.', src: 'elb-how-it-works', quote: 'The nodes of an internet-facing load balancer have public IP addresses.' },
  { id: 'targets-private-ip', text: 'The load balancer sends requests to its targets using their private IP addresses, so the instances can sit in private subnets.', src: 'elb-how-it-works', quote: 'The load balancer node that receives the request selects a healthy registered target and sends the request to the target using its private IP address.' },
  { id: 'asg-multi-az', text: 'An Auto Scaling group can span multiple Availability Zones and launches instances in another zone if one becomes unavailable.', src: 'asg-benefits', quote: 'If one Availability Zone becomes unavailable, Amazon EC2 Auto Scaling can launch instances in another one to compensate.' },
  { id: 'nat-public-subnet', text: 'A NAT gateway lives in a public subnet and private subnets route to it.', src: 'vpc-nat-scenarios', quote: 'In Availability Zone B, the public subnet contains a NAT gateway, and the instances in the private subnet can reach the internet through a route to the NAT gateway in the public subnet.' },
  { id: 'nat-per-az', text: 'Create a NAT gateway in each Availability Zone and route each zone to the gateway in its own zone.', src: 'vpc-nat-basics', quote: 'To improve resiliency, create a NAT gateway in each Availability Zone, and configure your routing to ensure that resources use the NAT gateway in the same Availability Zone.' },
  { id: 'rds-standby', text: 'A Multi-AZ DB instance deployment keeps a synchronous standby replica in a different Availability Zone.', src: 'rds-multi-az-instance', quote: 'In a Multi-AZ DB instance deployment, Amazon RDS automatically provisions and maintains a synchronous standby replica in a different Availability Zone.' },
  { id: 'db-private-subnets', text: 'DB subnet groups are typically private subnets.', src: 'rds-working-vpc', quote: 'A DB subnet group is a collection of subnets (typically private) that you create in a VPC and that you then designate for your DB instances.' },
  { id: 'cache-multi-az', text: 'Multi-AZ for a cache needs at least one replica in a different Availability Zone from the primary.', src: 'elasticache-autofailover', quote: 'Multi-AZ requires at least one replica in a different Availability Zone from the primary.' },
  { id: 'sqs-decouples', text: 'Amazon SQS is a managed queue service that decouples components; it is a regional service, not placed in a subnet.', src: 'sqs-what-is', quote: 'Amazon SQS decouples and scales distributed software systems and components as a queue service.' },
];

export interface CheckResult {
  id: CheckId;
  need: string;
  pass: boolean;
  detail: string;
  rules: string[];
}

const azsOf = (items: readonly Placed[]) => new Set(items.map((p) => p.az));

/** Scores a placement against the scenario's checks. Full credit needs every check to pass. */
export function score(data: BuilderData, placed: readonly Placed[]): CheckResult[] {
  const of = (kind: Kind, tier?: Tier) => placed.filter((p) => p.kind === kind && (tier === undefined || p.tier === tier));
  return data.checks.map(({ id, need }): CheckResult => {
    const r = (pass: boolean, detail: string, ruleIds: string[]): CheckResult => ({ id, need, pass, detail, rules: ruleIds });
    switch (id) {
      case 'lb-public-multi-az': {
        const all = of('alb');
        const pub = of('alb', 'public');
        const zones = azsOf(pub).size;
        return r(all.length > 0 && pub.length === all.length && zones >= 2, `Load balancer nodes: ${all.length}; in public subnets: ${pub.length}; zones covered: ${zones}.`, ['lb-az-nodes', 'lb-internet-facing']);
      }
      case 'app-private': {
        const all = of('app');
        const priv = of('app', 'private-app');
        return r(all.length > 0 && priv.length === all.length, `Instances: ${all.length}; in private app subnets: ${priv.length}.`, ['targets-private-ip']);
      }
      case 'app-multi-az': {
        const zones = azsOf(of('app', 'private-app')).size;
        return r(zones >= 2, `Zones with instances: ${zones}.`, ['asg-multi-az']);
      }
      case 'nat-per-az': {
        const needs = [...azsOf(of('app', 'private-app'))];
        const missing = needs.filter((az) => !of('nat', 'public').some((n) => n.az === az));
        const stray = of('nat').filter((n) => n.tier !== 'public');
        return r(needs.length > 0 && missing.length === 0 && stray.length === 0, `Zones with private instances: ${needs.length}; zones without a NAT gateway in their public subnet: ${missing.length}; NAT gateways outside public subnets: ${stray.length}.`, ['nat-public-subnet', 'nat-per-az']);
      }
      case 'db-multi-az': {
        const prim = of('db-primary', 'private-data');
        const stand = of('db-standby', 'private-data');
        const ok = prim.length === 1 && stand.length >= 1 && stand.some((s) => s.az !== (prim[0] as Placed).az);
        return r(ok, `Primary: ${prim.length}; standby: ${stand.length}; standby in a different zone than the primary: ${prim.length === 1 && stand.some((s) => s.az !== (prim[0] as Placed).az) ? 'yes' : 'no'}.`, ['rds-standby']);
      }
      case 'db-private': {
        const db = [...of('db-primary'), ...of('db-standby')];
        return r(db.length > 0 && db.every((d) => d.tier === 'private-data'), `Database instances: ${db.length}; in private data subnets: ${db.filter((d) => d.tier === 'private-data').length}.`, ['db-private-subnets']);
      }
      case 'cache-multi-az': {
        const c = of('cache', 'private-data');
        return r(c.length >= 2 && azsOf(c).size >= 2, `Cache nodes in private data subnets: ${c.length}; zones: ${azsOf(c).size}.`, ['cache-multi-az']);
      }
      case 'queue-decouple': {
        const q = of('queue', 'regional');
        return r(q.length >= 1 && of('queue').length === q.length, `Queues in the regional row: ${q.length}.`, ['sqs-decouples']);
      }
    }
  });
}

/** A constructive solution: proves the scenario is solvable from its palette (null when it is not). */
export function reference(data: BuilderData): Placed[] | null {
  const have = (k: Kind) => data.palette.find((p) => p.kind === k)?.count ?? 0;
  const want = new Set(data.checks.map((c) => c.id));
  const out: Placed[] = [];
  const zones = Array.from({ length: data.azs }, (_, i) => i);
  const needApps = want.has('app-multi-az') || want.has('app-private') || want.has('nat-per-az');
  if (want.has('lb-public-multi-az')) {
    if (have('alb') < data.azs) return null;
    for (const az of zones) out.push({ kind: 'alb', tier: 'public', az });
  }
  if (needApps) {
    if (have('app') < data.azs) return null;
    for (const az of zones) out.push({ kind: 'app', tier: 'private-app', az });
  }
  if (want.has('nat-per-az')) {
    if (have('nat') < data.azs) return null;
    for (const az of zones) out.push({ kind: 'nat', tier: 'public', az });
  }
  if (want.has('db-multi-az') || want.has('db-private')) {
    if (have('db-primary') < 1 || have('db-standby') < 1) return null;
    out.push({ kind: 'db-primary', tier: 'private-data', az: 0 }, { kind: 'db-standby', tier: 'private-data', az: 1 });
  }
  if (want.has('cache-multi-az')) {
    if (have('cache') < 2) return null;
    out.push({ kind: 'cache', tier: 'private-data', az: 0 }, { kind: 'cache', tier: 'private-data', az: 1 });
  }
  if (want.has('queue-decouple')) {
    if (have('queue') < 1) return null;
    out.push({ kind: 'queue', tier: 'regional', az: -1 });
  }
  return score(data, out).every((c) => c.pass) ? out : null;
}

export const def: PuzzleDef<BuilderData> = {
  type: 'architecture-builder',
  rules,
  // The board is custom (BuilderPuzzle); there are no multiple-choice fields.
  fields: () => [],
  exhibit(s): ExhibitSection[] {
    return [
      { title: 'Requirements', kind: 'text', text: s.checks.map((c, i) => `${i + 1}. ${c.need}`).join('\n') },
      { title: 'Components you can place', kind: 'table', head: ['Component', 'How many'], rows: s.palette.map((p) => [KIND_LABEL[p.kind], String(p.count)]) },
      { title: 'Zones', kind: 'text', text: `${s.azs} Availability Zones (${Array.from({ length: s.azs }, (_, i) => `Zone ${String.fromCharCode(65 + i)}`).join(', ')}).` },
    ];
  },
  evaluate(s): Evaluation | null {
    const ref = reference(s);
    if (!ref) return null;
    const results = score(s, ref);
    return { answer: {}, trace: results.map((r) => ({ rule: r.rules[r.rules.length - 1] as string, note: `${r.need} ${r.detail}` })) };
  },
};
