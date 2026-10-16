import type { BuilderData } from '../../src/puzzles/architecture-builder/def.ts';
import type { Scenario } from '../../src/puzzles/types.ts';

type S = Scenario<BuilderData>;
const base = (id: string): Pick<S, 'id' | 'type'> => ({ id: `puzzle-architecture-builder-${id}`, type: 'architecture-builder' });

const NEED = {
  lb: 'The load balancer must keep accepting internet traffic if one Availability Zone fails: put its nodes in public subnets in at least two zones.',
  appPrivate: 'The web/app instances must not have public addresses: they sit in private app subnets behind the load balancer.',
  appAz: 'The stateless web tier must survive the loss of one Availability Zone: run instances in at least two zones.',
  nat: 'The instances download patches from the internet, and outbound access must survive the loss of one zone: give every zone that has instances its own NAT gateway in that zone.',
  db: 'The database must survive an Availability Zone failure with the least operational overhead: use a managed database with a standby in a different zone, in private data subnets.',
  dbPrivate: 'The database must not be publicly accessible: keep its instances out of the public subnets, in private subnets.',
  cache: 'Frequent product lookups must be served from a cache that survives a zone failure: place at least two cache nodes in different zones, none in a public subnet.',
  queue: 'Order submission must keep working when the processing tier is slow or down: decouple the tiers with a managed queue: put a queue in the regional row, with at least one app instance in a private app subnet as the worker behind it.',
} as const;

const palette = (azs: 2 | 3, extra: Partial<Record<'alb' | 'app' | 'nat' | 'cache' | 'queue', number>> = {}) => [
  { kind: 'alb' as const, count: azs + (extra.alb ?? 0) },
  { kind: 'app' as const, count: azs + 1 + (extra.app ?? 0) },
  { kind: 'nat' as const, count: azs + (extra.nat ?? 0) },
  { kind: 'db-primary' as const, count: 1 },
  { kind: 'db-standby' as const, count: 1 },
  { kind: 'cache' as const, count: 2 + (extra.cache ?? 0) },
  { kind: 'queue' as const, count: 1 + (extra.queue ?? 0) },
];

const scenarios: S[] = [
  {
    ...base('001'), building: 'blueprint-hall', bullets: ['2.1-K10', '2.1-S1'], difficulty: 1,
    title: 'A highly available two-tier site',
    story: 'A company runs a stateless web site on Amazon EC2 behind a load balancer. The site must stay up if one Availability Zone fails. Place the components to meet the requirements.',
    data: { azs: 2, palette: palette(2), checks: [{ id: 'lb-public-multi-az', need: NEED.lb }, { id: 'app-private', need: NEED.appPrivate }, { id: 'app-multi-az', need: NEED.appAz }] },
  },
  {
    ...base('002'), building: 'blueprint-hall', bullets: ['2.1-K10', '2.1-S1'], difficulty: 2,
    title: 'Add the managed database',
    story: 'The same kind of site now needs a managed relational database that fails over automatically with the least operational overhead. The database must stay off the internet.',
    data: { azs: 2, palette: palette(2), checks: [{ id: 'lb-public-multi-az', need: NEED.lb }, { id: 'app-multi-az', need: NEED.appAz }, { id: 'db-multi-az', need: NEED.db }, { id: 'db-private', need: NEED.dbPrivate }] },
  },
  {
    ...base('003'), building: 'blueprint-hall', bullets: ['2.1-K4', '2.1-S1'], difficulty: 2,
    title: 'Decouple order intake',
    story: 'An order site must keep taking orders even when the order-processing instances are slow. The processing tier is stateless and runs in private subnets across zones.',
    data: { azs: 2, palette: palette(2), checks: [{ id: 'app-private', need: NEED.appPrivate }, { id: 'app-multi-az', need: NEED.appAz }, { id: 'queue-decouple', need: NEED.queue }] },
  },
  {
    ...base('004'), building: 'blueprint-hall', bullets: ['2.1-K10', '2.1-S1'], difficulty: 3,
    title: 'Three zones, everything resilient',
    story: 'A three-zone Region hosts a three-tier application: internet-facing load balancer, stateless web tier, managed database. Every tier must survive the loss of one zone, and the instances may not be publicly addressable.',
    data: { azs: 3, palette: palette(3), checks: [{ id: 'lb-public-multi-az', need: NEED.lb }, { id: 'app-private', need: NEED.appPrivate }, { id: 'app-multi-az', need: NEED.appAz }, { id: 'db-multi-az', need: NEED.db }, { id: 'db-private', need: NEED.dbPrivate }] },
  },
  {
    ...base('005'), building: 'single-point-watch', bullets: ['2.2-S4', '2.2-K8'], difficulty: 1,
    title: 'Remove the single load balancer zone',
    story: 'A web site has one instance fleet behind a load balancer that was enabled in a single zone, so a zone failure takes the site down. Rebuild the front of the design without a single point of failure.',
    data: { azs: 2, palette: palette(2), checks: [{ id: 'lb-public-multi-az', need: NEED.lb }, { id: 'app-multi-az', need: NEED.appAz }] },
  },
  {
    ...base('006'), building: 'single-point-watch', bullets: ['2.2-S4', '2.2-K5'], difficulty: 2,
    title: 'No single database host',
    story: 'The database is a single instance and the first thing to fail. Rebuild the web tier across two zones and give the database a standby in the other zone, so that a zone failure does not take the site down.',
    data: { azs: 2, palette: palette(2), checks: [{ id: 'app-private', need: NEED.appPrivate }, { id: 'app-multi-az', need: NEED.appAz }, { id: 'db-multi-az', need: NEED.db }] },
  },
  {
    ...base('007'), building: 'single-point-watch', bullets: ['2.2-S4', '2.2-K8', '2.2-K5'], difficulty: 3,
    title: 'Outbound access without a shared gateway',
    story: 'Private instances in two zones download updates from the internet through NAT gateways. Today both zones share one NAT gateway, which is a single point of failure for outbound access. Fix it while keeping the front end and web tier resilient.',
    data: { azs: 2, palette: palette(2, { nat: 1 }), checks: [{ id: 'lb-public-multi-az', need: NEED.lb }, { id: 'app-multi-az', need: NEED.appAz }, { id: 'nat-per-az', need: NEED.nat }] },
  },
  {
    ...base('008'), building: 'cache-edge-breakwater', bullets: ['2.1-K3'], difficulty: 2,
    title: 'A cache that survives a zone failure',
    story: 'A read-heavy catalog uses Amazon ElastiCache in front of the database. A single cache node in one zone would drop every lookup onto the database when that zone fails.',
    data: { azs: 2, palette: palette(2), checks: [{ id: 'app-multi-az', need: NEED.appAz }, { id: 'cache-multi-az', need: NEED.cache }, { id: 'db-multi-az', need: NEED.db }] },
  },
  {
    ...base('009'), building: 'gatehouse', bullets: ['1.2-S1'], difficulty: 3,
    title: 'Private instances with outbound access in three zones',
    story: 'A three-zone VPC runs instances in private subnets that need outbound internet access for patching. Each zone must keep working if another zone fails, and nothing in a private subnet may be given a public address.',
    data: { azs: 3, palette: palette(3, { nat: 1 }), checks: [{ id: 'app-private', need: NEED.appPrivate }, { id: 'app-multi-az', need: NEED.appAz }, { id: 'nat-per-az', need: NEED.nat }] },
  },
];

export default scenarios;
