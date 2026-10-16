import type { Evaluation, Exhibit, ExhibitSection, Field, PuzzleDef, Rule } from '../types';

/**
 * Packet Tracer: one connection attempt across a small VPC layout. The evaluator walks the packet hop by hop with
 * rules quoted from the Amazon VPC documentation and names the single component that blocks it (or none).
 * It refuses (returns null) when the cited pages do not settle the case: IPv6, ambiguous blame (two different
 * components would each block it), partially overlapping port ranges, overlapping peered CIDRs, and so on.
 */

export type Proto = 'tcp' | 'udp';
export type Service = 's3' | 'dynamodb';
export type ClientOs = 'linux' | 'windows';

/** peer: an IPv4 CIDR, `sg:<id>` (another security group) or `pl:<service>` (the service's prefix list; outbound only). */
export interface SgRule {
  proto: Proto | 'all';
  from?: number;
  to?: number;
  peer: string;
}
/** `outbound` omitted means the default rule that allows all outbound traffic. */
export interface Sg {
  id: string;
  inbound: SgRule[];
  outbound?: SgRule[];
}
export interface NaclRule {
  n: number;
  proto: Proto | 'all';
  from?: number;
  to?: number;
  cidr: string;
  action: 'allow' | 'deny';
}
/** A default network ACL with no rule lists allows everything; a custom one with no rule lists has only the final deny. */
export interface Nacl {
  id: string;
  default?: boolean;
  inbound?: NaclRule[];
  outbound?: NaclRule[];
}
/** dest: an IPv4 CIDR or `pl:<service>`. target: `igw`, `nat:<id>`, `pcx:<id>` or `vpce:<id>` (the local route is implicit). */
export interface Route {
  dest: string;
  target: string;
}
export interface RouteTable {
  id: string;
  main?: boolean;
  routes: Route[];
}
/** rt / nacl omitted: the subnet uses the main route table / the default network ACL. */
export interface Subnet {
  id: string;
  cidr: string;
  rt?: string;
  nacl?: string;
}
export interface Node {
  id: string;
  name: string;
  kind: 'instance' | 'interface-endpoint';
  subnet: string;
  ip: string;
  sgs: string[];
  publicIp?: string;
  os?: ClientOs;
  /** For an interface endpoint: the service it connects to (text only). */
  service?: string;
}
export interface Nat {
  id: string;
  subnet: string;
}
export interface GwEp {
  id: string;
  service: Service;
}
export interface Vpc {
  id: string;
  name: string;
  cidr: string;
  igw: boolean;
  subnets: Subnet[];
  routeTables: RouteTable[];
  nacls: Nacl[];
  sgs: Sg[];
  nodes: Node[];
  nats?: Nat[];
  gwEps?: GwEp[];
}
/** An active peering connection between two VPCs in one Region. */
export interface Peering {
  id: string;
  a: string;
  b: string;
}
export type Endpoint =
  | { kind: 'node'; id: string; via?: 'private' | 'public' }
  | { kind: 'internet'; ip: string; label: string }
  | { kind: 'service'; service: Service };
export interface Attempt {
  src: Endpoint;
  dst: Endpoint;
  proto: Proto;
  port: number;
  /** Operating system of the client that opens the connection; sets its ephemeral port range. Default: the source node's, else Linux. */
  clientOs?: ClientOs;
}
export interface PacketScenario {
  vpcs: Vpc[];
  peerings?: Peering[];
  attempt: Attempt;
}

export const rules: Rule[] = [
  {
    id: 'route-local',
    text: 'Every route table has a local route for the VPC CIDR, so traffic inside the VPC is delivered locally.',
    src: 'vpc-subnet-route-tables',
    quote: 'Every route table contains a local route for communication within the VPC.',
  },
  {
    id: 'route-main',
    text: 'A subnet with no explicit route table association uses the main route table.',
    src: 'vpc-subnet-route-tables',
    quote: 'Otherwise, the subnet is implicitly associated with the main route table.',
  },
  {
    id: 'route-longest',
    text: 'The most specific (longest prefix) route that matches the destination wins.',
    src: 'vpc-route-priority',
    quote: 'In general, we direct traffic using the most specific route that matches the traffic.',
  },
  {
    id: 'igw-attach',
    text: 'An internet gateway must be attached to the VPC and routed to; without one nothing reaches the internet.',
    src: 'vpc-igw',
    quote: 'To use an internet gateway, you must attach it to a VPC and configure routing.',
  },
  {
    id: 'igw-public-subnet',
    text: 'A subnet is public only if its route table has a route to the internet gateway.',
    src: 'vpc-igw',
    quote: "If a subnet is associated with a route table that has a route to an internet gateway, it's known as a public subnet.",
  },
  {
    id: 'igw-no-route',
    text: 'Without a route to the internet gateway, an instance cannot talk to the internet, even with a public IP address.',
    src: 'vpc-igw',
    quote: "Because there is no route to the internet gateway, instances in the private subnet can't communicate with the internet, even if they have public IP addresses.",
  },
  {
    id: 'igw-public-ip',
    text: 'An instance needs a public IPv4 address (or Elastic IP) to use the internet gateway.',
    src: 'vpc-igw',
    quote: 'The instances in the public subnet must have public IP addresses or Elastic IP addresses to enable communication with the internet over the internet gateway.',
  },
  {
    id: 'igw-inbound',
    text: 'Internet clients can start a connection to an instance in a public subnet through its public IPv4 address.',
    src: 'vpc-igw',
    quote: 'Similarly, resources on the internet can initiate a connection to resources in your subnet using the public IPv4 address or IPv6 address.',
  },
  {
    id: 'nat-private-route',
    text: 'A private subnet reaches the internet through a NAT gateway only if its route table sends 0.0.0.0/0 to it.',
    src: 'vpc-route-options',
    quote: "Then add a route for the private subnet's route table that routes IPv4 internet traffic (0.0.0.0/0) to the NAT device.",
  },
  {
    id: 'nat-public-subnet',
    text: 'A public NAT gateway is created in a public subnet.',
    src: 'vpc-nat-gateway',
    quote: 'You create a public NAT gateway in a public subnet and must associate an Elastic IP address with the NAT gateway at creation.',
  },
  {
    id: 'nat-to-igw',
    text: 'The NAT gateway forwards traffic to the internet through the internet gateway of its VPC.',
    src: 'vpc-nat-gateway',
    quote: 'You route traffic from the NAT gateway to the internet gateway for the VPC.',
  },
  {
    id: 'nat-outbound-only',
    text: 'A NAT gateway is outbound only: connections must start inside the VPC, so the internet cannot start one to a private instance.',
    src: 'vpc-nat-gateway',
    quote: 'Connections must always be initiated from within the VPC containing the NAT gateway.',
  },
  {
    id: 'nat-nacl',
    text: 'A network ACL controls the traffic to and from the NAT gateway subnet.',
    src: 'vpc-nat-basics',
    quote: 'You can use a network ACL to control the traffic to and from the subnet for your NAT gateway.',
  },
  {
    id: 'nat-ports',
    text: 'Replies to a NAT gateway arrive on ports 1024-65535.',
    src: 'vpc-custom-nacl',
    quote: 'A NAT gateway uses ports 1024-65535.',
  },
  {
    id: 'nat-no-peering',
    text: 'Traffic cannot be routed to a NAT gateway through a VPC peering connection.',
    src: 'vpc-nat-basics',
    quote: "You can't route traffic to a NAT gateway through a VPC peering connection.",
  },
  {
    id: 'gwep-no-igw',
    text: 'A gateway endpoint gives access to Amazon S3 or DynamoDB without an internet gateway or NAT device.',
    src: 'vpce-gateway',
    quote: 'Gateway VPC endpoints provide reliable connectivity to Amazon S3 and DynamoDB without requiring an internet gateway or a NAT device for your VPC.',
  },
  {
    id: 'gwep-route',
    text: 'A subnet uses a gateway endpoint only if its route table has the service prefix list route to the endpoint.',
    src: 'vpce-gateway',
    quote: 'Each subnet route table must have a route that sends traffic destined for the service to the gateway endpoint using the prefix list for the service.',
  },
  {
    id: 'gwep-unassociated',
    text: 'Subnets whose route tables are not associated with the endpoint use the public service endpoint instead.',
    src: 'vpce-gateway',
    quote: "Instances in subnets that aren't associated with these route tables use the public service endpoint, not the gateway endpoint.",
  },
  {
    id: 'gwep-precedence',
    text: 'The endpoint route beats a 0.0.0.0/0 internet gateway route for that service; other traffic keeps using the internet gateway route.',
    src: 'vpce-gateway',
    quote: 'If there is a route that sends all internet traffic (0.0.0.0/0) to an internet gateway, the endpoint route takes precedence for traffic destined for the service (Amazon S3 or DynamoDB) in the current Region.',
  },
  {
    id: 'gwep-other-service',
    text: 'A gateway endpoint route covers only its own service; traffic for a different service follows the other routes.',
    src: 'vpce-gateway',
    quote: 'Traffic destined for a different AWS service uses the internet gateway.',
  },
  {
    id: 'gwep-sg',
    text: 'Security groups of instances using a gateway endpoint must still allow traffic to and from the service.',
    src: 'vpce-gateway',
    quote: 'The security groups for these instances must allow traffic to and from the service.',
  },
  {
    id: 'gwep-prefix-sg',
    text: 'A security group rule can name the service prefix list.',
    src: 'vpce-gateway-s3',
    quote: 'You can reference the ID of the prefix list for Amazon S3 in security group rules.',
  },
  {
    id: 'gwep-prefix-sg-ddb',
    text: 'A security group rule can name the DynamoDB prefix list.',
    src: 'vpce-gateway-ddb',
    quote: 'You can reference the ID of the prefix list for DynamoDB in security group rules.',
  },
  {
    id: 'gwep-nacl-ddb',
    text: 'The network ACL of the subnet must still allow traffic to and from DynamoDB.',
    src: 'vpce-gateway-ddb',
    quote: 'The network ACL for the subnet for your instances that access DynamoDB through a gateway endpoint must allow traffic to and from DynamoDB.',
  },
  {
    id: 'gwep-nacl',
    text: 'The network ACL of the subnet must still allow traffic to and from the service.',
    src: 'vpce-gateway-s3',
    quote: 'The network ACL for the subnet for your instances that access Amazon S3 through a gateway endpoint must allow traffic to and from Amazon S3.',
  },
  {
    id: 'ifep-eni',
    text: 'An interface endpoint is a network interface with a private IP address in each chosen subnet.',
    src: 'vpce-interface',
    quote: 'For each subnet that you specify from your VPC, we create an endpoint network interface in the subnet and assign it a private IP address from the subnet address range.',
  },
  {
    id: 'ifep-sg',
    text: "The interface endpoint's own security group must allow the clients' traffic.",
    src: 'vpce-interface',
    quote: 'Create a security group for the endpoint network interface that allows the expected traffic from the resources in your VPC.',
  },
  {
    id: 'ifep-nacl',
    text: 'Network ACLs must allow traffic between the clients and the endpoint network interfaces.',
    src: 'vpce-interface',
    quote: 'If your resources are in a subnet with a network ACL, verify that the network ACL allows traffic between the resources in your VPC and the endpoint network interfaces.',
  },
  {
    id: 'sg-allow-only',
    text: 'Security groups only allow; a rule can never deny, so traffic with no matching allow rule is dropped.',
    src: 'vpc-sg-rules',
    quote: 'You can specify allow rules, but not deny rules.',
  },
  {
    id: 'sg-inbound-none',
    text: 'A security group with no inbound rules allows no inbound traffic.',
    src: 'vpc-sg-rules',
    quote: 'Therefore, no inbound traffic is allowed until you add inbound rules to the security group.',
  },
  {
    id: 'sg-outbound-default',
    text: 'A new security group allows all outbound traffic until that rule is removed.',
    src: 'vpc-sg-rules',
    quote: 'When you first create a security group, it has an outbound rule that allows all outbound traffic from the resource.',
  },
  {
    id: 'sg-outbound-none',
    text: 'Outbound traffic needs a matching outbound rule once the default rule is replaced.',
    src: 'vpc-sg-rules',
    quote: 'If your security group has no outbound rules, no outbound traffic is allowed.',
  },
  {
    id: 'sg-aggregate',
    text: 'With several security groups on one resource, their rules are combined: any one allow is enough.',
    src: 'vpc-sg-rules',
    quote: 'When you associate multiple security groups with a resource, the rules from each security group are aggregated to form a single set of rules that are used to determine whether to allow access.',
  },
  {
    id: 'sg-stateful',
    text: 'Security groups are stateful: replies to allowed traffic are allowed whatever the rules in the other direction say.',
    src: 'vpc-security-groups',
    quote: 'Responses to allowed inbound traffic are allowed to leave the instance, regardless of the outbound rules.',
  },
  {
    id: 'sg-stateful-reply',
    text: 'Security groups are stateful: the reply to a request an instance sends is allowed back in whatever the inbound rules say.',
    src: 'vpc-security-groups',
    quote: 'For example, if you send a request from an instance, the response traffic for that request is allowed to reach the instance regardless of the inbound security group rules.',
  },
  {
    id: 'sg-reference',
    text: 'A rule that names a security group applies to every instance associated with that group.',
    src: 'vpc-sg-rules',
    quote: 'When you specify a security group as the source or destination for a rule, the rule affects all instances that are associated with the security groups.',
  },
  {
    id: 'sg-reference-peer',
    text: 'In one Region, a rule can name a security group of the peer VPC.',
    src: 'peering-basics',
    quote: 'If both VPCs are in the same Region, you can reference a security group from the peer VPC as a source or destination for inbound or outbound rules in your security group.',
  },
  {
    id: 'nacl-assoc',
    text: 'A subnet with no explicit network ACL association uses the default network ACL.',
    src: 'vpc-nacls',
    quote: "If you don't explicitly associate a subnet with a network ACL, the subnet is automatically associated with the default network ACL.",
  },
  {
    id: 'nacl-order',
    text: 'Network ACL rules are checked from the lowest rule number upward.',
    src: 'vpc-nacls',
    quote: 'We evaluate the rules in order, starting with the lowest numbered rule, when deciding whether allow or deny traffic.',
  },
  {
    id: 'nacl-first-match',
    text: 'The first matching rule decides; later rules are not looked at.',
    src: 'vpc-nacls',
    quote: 'If the traffic matches a rule, the rule is applied and we do not evaluate any additional rules.',
  },
  {
    id: 'nacl-allow-deny',
    text: 'A network ACL rule can allow or deny.',
    src: 'vpc-nacls',
    quote: 'Each rule can either allow or deny traffic.',
  },
  {
    id: 'nacl-stateless',
    text: 'Network ACLs are stateless: the return traffic needs its own allow rule in the other direction.',
    src: 'vpc-nacls',
    quote: 'NACLs are stateless, which means that information about previously sent or received traffic is not saved.',
  },
  {
    id: 'nacl-boundary',
    text: 'Network ACLs are checked when traffic enters or leaves a subnet, not for traffic inside one subnet.',
    src: 'vpc-nacls',
    quote: 'We evaluate the network ACL rules when traffic enters and leaves the subnet, not as it is routed within a subnet.',
  },
  {
    id: 'nacl-default',
    text: 'The default network ACL allows all traffic in and out.',
    src: 'vpc-default-nacl',
    quote: 'A default network ACL is configured to allow all traffic to flow in and out of the subnets with which it is associated.',
  },
  {
    id: 'nacl-final-deny',
    text: 'A packet that matches no numbered rule is denied by the final * rule (so a custom network ACL with no allow rules denies everything).',
    src: 'vpc-custom-nacl',
    quote: "These rules ensure that if a packet doesn't match any of the other rules, it's denied.",
  },
  {
    id: 'nacl-response',
    text: 'Every allowed flow needs a rule that allows the response traffic.',
    src: 'vpc-custom-nacl',
    quote: 'For every rule that you add, there must be an inbound or outbound rule that allows response traffic.',
  },
  {
    id: 'eph-client',
    text: 'The client that opens the connection picks the ephemeral port range for the replies.',
    src: 'vpc-custom-nacl',
    quote: 'The client that initiates the request chooses the ephemeral port range.',
  },
  {
    id: 'eph-linux',
    text: 'Many Linux kernels, including the Amazon Linux kernel, use ports 32768-61000 for replies; the scenarios use Amazon Linux clients.',
    src: 'vpc-custom-nacl',
    quote: 'Many Linux kernels (including the Amazon Linux kernel) use ports 32768-61000.',
  },
  {
    id: 'eph-windows',
    text: 'A Windows Server 2008 or later client uses ports 49152-65535.',
    src: 'vpc-custom-nacl',
    quote: 'Windows Server 2008 and later versions use ports 49152-65535.',
  },
  {
    id: 'peer-routes',
    text: 'Peering carries traffic only if the route tables on both sides point the peer CIDR at the peering connection.',
    src: 'peering-basics',
    quote: 'To enable the flow of traffic between the VPCs using private IP addresses, the owner of each VPC in the VPC peering connection must manually add a route to one or more of their VPC route tables that points to the IP address range of the other VPC (the peer VPC).',
  },
  {
    id: 'peer-overlap',
    text: 'VPCs with overlapping CIDR blocks cannot be peered, so such a layout is refused.',
    src: 'peering-basics',
    quote: 'You cannot create a VPC peering connection between VPCs that have matching or overlapping IPv4 or IPv6 CIDR blocks.',
  },
  {
    id: 'peer-non-transitive',
    text: 'Peering is not transitive: a VPC cannot reach a second peer through the VPC between them.',
    src: 'peering-basics',
    quote: 'VPC peering does not support transitive peering relationships.',
  },
  {
    id: 'peer-no-other',
    text: 'There is no peering relationship with a VPC that is not directly peered.',
    src: 'peering-basics',
    quote: 'You do not have any peering relationship with VPCs that your VPC is not directly peered with.',
  },
  {
    id: 'peer-edge-igw',
    text: "A peer cannot use this VPC's internet gateway to reach the internet.",
    src: 'peering-basics',
    quote: "If VPC A has an internet gateway, resources in VPC B can't use the internet gateway in VPC A to access the internet.",
  },
  {
    id: 'peer-edge-nat',
    text: "A peer cannot use this VPC's NAT device to reach the internet.",
    src: 'peering-basics',
    quote: "If VPC A has an NAT device that provides internet access to subnets in VPC A, resources in VPC B can't use the NAT device in VPC A to access the internet.",
  },
  {
    id: 'peer-edge-gwep',
    text: "A peer cannot use this VPC's gateway endpoint to reach Amazon S3.",
    src: 'peering-basics',
    quote: "If VPC A has a gateway endpoint that provides connectivity to Amazon S3 to private subnets in VPC A, resources in VPC B can't use the gateway endpoint to access Amazon S3.",
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Addresses

class Refuse extends Error {}
function refuse(why: string): never {
  throw new Refuse(why);
}

function parseIp(s: string): number {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return refuse(`not an IPv4 address: ${s}`);
  const parts = [m[1], m[2], m[3], m[4]].map((x) => Number(x));
  if (parts.some((p) => p > 255)) return refuse(`bad IPv4 address: ${s}`);
  return (((parts[0] as number) << 24) | ((parts[1] as number) << 16) | ((parts[2] as number) << 8) | (parts[3] as number)) >>> 0;
}
interface Cidr {
  base: number;
  bits: number;
}
function parseCidr(s: string): Cidr {
  const m = /^([\d.]+)\/(\d{1,2})$/.exec(s);
  if (!m) return refuse(`not an IPv4 CIDR: ${s}`);
  const bits = Number(m[2]);
  if (bits > 32) return refuse(`bad prefix: ${s}`);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  const base = parseIp(m[1] as string);
  if (((base & mask) >>> 0) !== base) return refuse(`host bits set in ${s}`);
  return { base, bits };
}
const maskOf = (bits: number) => (bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0);
const ipIn = (ip: number, c: Cidr) => ((ip & maskOf(c.bits)) >>> 0) === c.base;
const cidrIn = (inner: Cidr, outer: Cidr) => inner.bits >= outer.bits && ipIn(inner.base, outer);
const overlaps = (a: Cidr, b: Cidr) => cidrIn(a, b) || cidrIn(b, a);
const isZero = (c: Cidr) => c.bits === 0;
const PRIVATE = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'].map(parseCidr);
const isPrivateRange = (c: Cidr) => PRIVATE.some((p) => cidrIn(c, p));

const CLIENT_RANGE: Record<ClientOs, [number, number]> = { linux: [32768, 61000], windows: [49152, 65535] };
const NAT_RANGE: [number, number] = [1024, 65535];

// ---------------------------------------------------------------------------------------------------------------
// Model lookups

/** The other end of a hop, for matching rules. */
interface Other {
  ip: number | null;
  service: Service | null;
  node: Node | null;
}

interface World {
  s: PacketScenario;
  vpcOfNode: Map<string, Vpc>;
  nodes: Map<string, Node>;
  sgs: Map<string, { sg: Sg; vpc: Vpc }>;
  vpcs: Map<string, Vpc>;
  peerings: Map<string, Peering>;
}

function build(s: PacketScenario): World {
  const w: World = { s, vpcOfNode: new Map(), nodes: new Map(), sgs: new Map(), vpcs: new Map(), peerings: new Map() };
  const seen = new Set<string>();
  const uniq = (kind: string, id: string) => {
    const k = `${kind}:${id}`;
    if (seen.has(k)) refuse(`duplicate ${k}`);
    seen.add(k);
  };
  for (const v of s.vpcs) {
    uniq('vpc', v.id);
    w.vpcs.set(v.id, v);
    const vc = parseCidr(v.cidr);
    const subnetIds = new Set<string>();
    for (const sn of v.subnets) {
      subnetIds.add(sn.id);
      if (!cidrIn(parseCidr(sn.cidr), vc)) refuse(`subnet ${sn.id} outside the VPC`);
    }
    for (const sg of v.sgs) {
      uniq('sg', sg.id);
      w.sgs.set(sg.id, { sg, vpc: v });
    }
    for (const n of v.nacls) uniq('nacl', n.id);
    for (const r of v.routeTables) uniq('rt', r.id);
    for (const nat of v.nats ?? []) {
      uniq('nat', nat.id);
      if (!subnetIds.has(nat.subnet)) refuse('NAT gateway in an unknown subnet');
    }
    for (const g of v.gwEps ?? []) uniq('gwep', g.id);
    for (const n of v.nodes) {
      uniq('node', n.id);
      w.nodes.set(n.id, n);
      w.vpcOfNode.set(n.id, v);
      const sn = v.subnets.find((x) => x.id === n.subnet);
      if (!sn) refuse(`node ${n.id} in an unknown subnet`);
      else if (!ipIn(parseIp(n.ip), parseCidr(sn.cidr))) refuse(`node ${n.id} address outside its subnet`);
      if (n.publicIp) parseIp(n.publicIp);
    }
    if (v.routeTables.filter((r) => r.main).length !== 1) refuse('a VPC needs exactly one main route table');
    if (v.nacls.filter((n) => n.default).length !== 1) refuse('a VPC needs exactly one default network ACL');
  }
  for (const p of s.peerings ?? []) {
    uniq('pcx', p.id);
    w.peerings.set(p.id, p);
    const a = w.vpcs.get(p.a);
    const b = w.vpcs.get(p.b);
    if (!a || !b || a === b) refuse('peering between unknown or identical VPCs');
    else if (overlaps(parseCidr(a.cidr), parseCidr(b.cidr))) refuse('overlapping CIDRs cannot be peered');
  }
  // Validate routes, subnets and groups.
  for (const v of s.vpcs) {
    for (const sn of v.subnets) {
      if (sn.rt && !v.routeTables.some((r) => r.id === sn.rt)) refuse('unknown route table');
      if (sn.nacl && !v.nacls.some((n) => n.id === sn.nacl)) refuse('unknown network ACL');
    }
    for (const rt of v.routeTables) for (const r of rt.routes) validateRoute(w, v, r);
    for (const n of v.nodes) for (const g of n.sgs) if (w.sgs.get(g)?.vpc !== v) refuse('security group of another VPC on a node');
  }
  const at = s.attempt;
  if (!Number.isInteger(at.port) || at.port < 1 || at.port > 65535) refuse('bad port');
  return w;
}

function validateRoute(w: World, v: Vpc, r: Route) {
  const [kind, id] = r.target.split(':');
  if (r.dest.startsWith('pl:')) {
    const svc = r.dest.slice(3);
    const ep = (v.gwEps ?? []).find((g) => g.id === id);
    if (kind !== 'vpce' || !ep || ep.service !== svc) refuse('prefix list route must target its own gateway endpoint');
    return;
  }
  parseCidr(r.dest);
  if (kind === 'igw') {
    if (!v.igw || id !== undefined) refuse('route to an internet gateway that is not attached');
  } else if (kind === 'nat') {
    if (!(v.nats ?? []).some((n) => n.id === id)) refuse('route to an unknown NAT gateway');
  } else if (kind === 'pcx') {
    const p = w.peerings.get(id ?? '');
    if (!p || (p.a !== v.id && p.b !== v.id)) refuse('route to a peering connection this VPC is not part of');
  } else refuse(`unsupported route target ${r.target}`);
}

const subnetOf = (v: Vpc, id: string): Subnet => v.subnets.find((x) => x.id === id) as Subnet;
const rtOf = (v: Vpc, sn: Subnet): RouteTable => (sn.rt ? v.routeTables.find((r) => r.id === sn.rt) : v.routeTables.find((r) => r.main)) as RouteTable;
const naclOf = (v: Vpc, sn: Subnet): Nacl => (sn.nacl ? v.nacls.find((n) => n.id === sn.nacl) : v.nacls.find((n) => n.default)) as Nacl;

function peeredWith(w: World, a: Vpc, b: Vpc): Peering | undefined {
  for (const p of w.peerings.values()) if ((p.a === a.id && p.b === b.id) || (p.a === b.id && p.b === a.id)) return p;
  return undefined;
}

// ---------------------------------------------------------------------------------------------------------------
// Security groups

type SgVia = 'cidr' | 'sg' | 'sg-peer' | 'pl' | 'default';

function sgRuleMatches(w: World, owner: Vpc, rule: SgRule, dir: 'in' | 'out', other: Other, proto: Proto, port: number): SgVia | null {
  if (rule.proto !== 'all') {
    if (rule.proto !== proto) return null;
    if (rule.from === undefined || rule.to === undefined) return refuse('port range missing');
    if (port < rule.from || port > rule.to) return null;
  }
  const peer = rule.peer;
  if (peer.startsWith('sg:')) {
    const ref = w.sgs.get(peer.slice(3));
    if (!ref) return refuse('rule names an unknown security group');
    const cross = ref.vpc !== owner;
    if (cross && !peeredWith(w, owner, ref.vpc)) return refuse('security group reference across VPCs without a peering connection');
    return other.node !== null && other.node.sgs.includes(ref.sg.id) ? (cross ? 'sg-peer' : 'sg') : null;
  }
  if (peer.startsWith('pl:')) {
    if (dir === 'in') return refuse('prefix list as a source is not settled');
    return other.service === peer.slice(3) ? 'pl' : null;
  }
  const c = parseCidr(peer);
  if (other.service) return isZero(c) ? 'cidr' : refuse('service address ranges are not given');
  if (other.ip === null) return null;
  return ipIn(other.ip, c) ? 'cidr' : null;
}

interface SgResult {
  ok: boolean;
  sg: string;
  via: SgVia | null;
  empty: boolean;
  aggregated: boolean;
}

function sgDecision(w: World, node: Node, dir: 'in' | 'out', other: Other, proto: Proto, port: number): SgResult {
  const owner = w.vpcOfNode.get(node.id) as Vpc;
  let via: SgVia | null = null;
  let empty = true;
  for (const id of node.sgs) {
    const sg = (w.sgs.get(id) as { sg: Sg }).sg;
    const explicit = dir === 'in' ? sg.inbound : sg.outbound;
    const list: SgRule[] = explicit ?? [{ proto: 'all', peer: '0.0.0.0/0' }];
    if (list.length > 0) empty = false;
    for (const r of list) {
      const m = sgRuleMatches(w, owner, r, dir, other, proto, port);
      if (m && !via) via = explicit === undefined ? 'default' : m;
    }
  }
  if (!via && node.sgs.length !== 1) return refuse('several security groups and none allows it: blame is not settled');
  return { ok: via !== null, sg: node.sgs[0] as string, via, empty, aggregated: node.sgs.length > 1 };
}

// ---------------------------------------------------------------------------------------------------------------
// Network ACLs

interface NaclResult {
  ok: boolean;
  n: string;
  implicit: boolean;
  hasDeny: boolean;
}

function naclDecision(nacl: Nacl, dir: 'in' | 'out', other: Other, proto: Proto, range: [number, number]): NaclResult {
  const list = dir === 'in' ? nacl.inbound : nacl.outbound;
  if (list === undefined && nacl.default) return { ok: true, n: '100', implicit: true, hasDeny: false };
  const sorted = [...(list ?? [])].sort((a, b) => a.n - b.n);
  const hasDeny = sorted.some((r) => r.action === 'deny');
  for (let i = 1; i < sorted.length; i += 1) if ((sorted[i] as NaclRule).n === (sorted[i - 1] as NaclRule).n) refuse('duplicate rule number');
  for (const r of sorted) {
    if (r.n < 1 || r.n > 32766) refuse('rule number out of range');
    if (r.proto !== 'all') {
      if (r.proto !== proto) continue;
      if (r.from === undefined || r.to === undefined) refuse('port range missing');
      const lo = r.from as number;
      const hi = r.to as number;
      if (hi < range[0] || lo > range[1]) continue;
      if (lo > range[0] || hi < range[1]) refuse('rule covers only part of the return port range');
    }
    const c = parseCidr(r.cidr);
    let hit: boolean;
    if (other.service) hit = isZero(c) ? true : refuse('service address ranges are not given');
    else hit = other.ip !== null && ipIn(other.ip, c);
    if (hit) return { ok: r.action === 'allow', n: String(r.n), implicit: false, hasDeny };
  }
  return { ok: false, n: '*', implicit: false, hasDeny };
}

// ---------------------------------------------------------------------------------------------------------------
// Routing

interface Lookup {
  route: Route | null;
  /** How many routes matched before the most specific one was chosen. */
  matched: number;
}
function lookup(v: Vpc, rt: RouteTable, dest: { ip: number | null; service: Service | null }): Lookup {
  const routes: Route[] = [{ dest: v.cidr, target: 'local' }, ...rt.routes];
  if (dest.service) {
    const pl = rt.routes.filter((r) => r.dest === `pl:${dest.service}`);
    if (pl.length > 1) refuse('two endpoint routes to one service');
    const zero = rt.routes.filter((r) => !r.dest.startsWith('pl:') && isZero(parseCidr(r.dest)));
    if (zero.length > 1) refuse('two default routes');
    for (const r of rt.routes) {
      if (r.dest.startsWith('pl:')) continue;
      const c = parseCidr(r.dest);
      if (!isZero(c) && !isPrivateRange(c)) refuse('a public CIDR route could overlap the service ranges');
    }
    const matched = pl.length + zero.length;
    return { route: pl[0] ?? zero[0] ?? null, matched };
  }
  if (dest.ip === null) return refuse('no destination');
  let best: Route | null = null;
  let bestBits = -1;
  let tie = false;
  let matched = 0;
  for (const r of routes) {
    if (r.dest.startsWith('pl:')) continue;
    const c = parseCidr(r.dest);
    if (!ipIn(dest.ip, c)) continue;
    matched += 1;
    if (c.bits > bestBits) {
      best = r;
      bestBits = c.bits;
      tie = false;
    } else if (c.bits === bestBits && best && best.target !== r.target) tie = true;
  }
  if (tie) refuse('two equally specific routes with different targets');
  return { route: best, matched };
}

// ---------------------------------------------------------------------------------------------------------------
// The walk

type Push = (rule: string, note: string) => void;
type PushBad = (rule: string, comp: string, note: string) => void;
interface Ctx {
  w: World;
  at: Attempt;
  ok: Push;
  bad: PushBad;
  osRule: string;
  osName: string;
  client: [number, number];
  clientText: string;
  portText: string;
}

function evaluate(s: PacketScenario): Evaluation | null {
  try {
    return walk(s);
  } catch (e) {
    if (e instanceof Refuse) return null;
    throw e;
  }
}

function walk(s: PacketScenario): Evaluation {
  const w = build(s);
  const at = s.attempt;
  const { src, dst } = at;
  const checks: { rule: string; comp: string | null; note: string }[] = [];
  if (src.kind === 'service') refuse('a service cannot open a connection');
  const srcNode = src.kind === 'node' ? w.nodes.get(src.id) : undefined;
  if (src.kind === 'node' && (!srcNode || srcNode.kind !== 'instance')) refuse('the source must be an instance');
  const dstNode = dst.kind === 'node' ? w.nodes.get(dst.id) : undefined;
  if (dst.kind === 'node' && !dstNode) refuse('unknown destination');
  const os: ClientOs = at.clientOs ?? srcNode?.os ?? 'linux';
  const client = CLIENT_RANGE[os];
  const ctx: Ctx = {
    w,
    at,
    ok: (rule, note) => checks.push({ rule, comp: null, note }),
    bad: (rule, comp, note) => checks.push({ rule, comp, note }),
    osRule: os === 'linux' ? 'eph-linux' : 'eph-windows',
    osName: os === 'linux' ? 'Linux' : 'Windows',
    client,
    clientText: `${client[0]}-${client[1]}`,
    portText: `${at.proto.toUpperCase()} ${at.port}`,
  };

  if (src.kind === 'internet') {
    parseIp(src.ip);
    if (!dstNode || dstNode.kind !== 'instance' || (dst.kind === 'node' && dst.via !== 'public')) refuse('internet clients reach an instance by its public address');
    inbound(ctx, src.ip, dstNode);
  } else {
    const sv = w.vpcOfNode.get((srcNode as Node).id) as Vpc;
    if (dst.kind === 'node') {
      if (dst.via === 'public') refuse('reaching an instance by its public address from inside is not settled');
      if (dstNode?.kind === 'interface-endpoint' && w.vpcOfNode.get(dstNode.id) !== sv) refuse('interface endpoints in another VPC are not settled');
    }
    outbound(ctx, sv, srcNode as Node, dst, dstNode);
  }

  const failing = [...new Set(checks.filter((c) => c.comp !== null).map((c) => c.comp as string))];
  if (failing.length > 1) refuse('two different components each block it');
  return {
    answer: { outcome: [failing.length === 0 ? 'yes' : 'no'], blocker: [failing[0] ?? 'none'] },
    trace: checks.map((c) => ({ rule: c.rule, note: c.note })),
  };
}

function pushNacl(c: Ctx, nacl: Nacl, dir: 'in' | 'out', d: NaclResult, what: string, where: string, o: { reply?: boolean; pass?: string } = {}) {
  const text = d.implicit ? `${nacl.id} allows everything` : d.n === '*' ? `no numbered rule of ${nacl.id} matches, so the final * rule denies` : `rule ${d.n} of ${nacl.id} ${d.ok ? 'allows' : 'denies'} it`;
  const note = `${where}: ${what}: ${text}.`;
  if (d.ok) {
    const rule = d.implicit ? (o.pass ?? 'nacl-default') : o.reply ? c.osRule : (o.pass ?? (d.hasDeny ? 'nacl-first-match' : 'nacl-order'));
    c.ok(rule, note);
  } else {
    const rule = d.n === '*' ? 'nacl-final-deny' : o.reply ? 'nacl-response' : 'nacl-allow-deny';
    c.bad(rule, `nacl:${nacl.id}`, note);
  }
  void dir;
}

function pushSg(c: Ctx, n: Node, d: SgResult, dir: 'in' | 'out', what: string, o: { ep?: boolean; gw?: boolean; svc?: Service | null } = {}) {
  const text = `${what} ${dir === 'in' ? 'into' : 'out of'} ${n.name}`;
  if (d.ok) {
    let rule = 'sg-allow-only';
    if (o.ep) rule = 'ifep-sg';
    else if (d.aggregated) rule = 'sg-aggregate';
    else if (d.via === 'default') rule = 'sg-outbound-default';
    else if (d.via === 'sg') rule = 'sg-reference';
    else if (d.via === 'sg-peer') rule = 'sg-reference-peer';
    else if (d.via === 'pl') rule = o.svc === 'dynamodb' ? 'gwep-prefix-sg-ddb' : 'gwep-prefix-sg';
    else if (o.gw) rule = 'gwep-sg';
    c.ok(rule, `${d.sg} allows ${text}.`);
  } else {
    const rule = o.ep ? 'ifep-sg' : d.empty ? (dir === 'in' ? 'sg-inbound-none' : 'sg-outbound-none') : 'sg-allow-only';
    c.bad(rule, `sg:${d.sg}`, `${d.sg} has no rule that allows ${text}.`);
  }
}

function replyIntro(c: Ctx) {
  c.ok('eph-client', `The client chooses the reply (ephemeral) ports: ${c.osName} uses ${c.clientText}.`);
  c.ok(c.osRule, `A ${c.osName} client's replies come back on ports ${c.clientText}.`);
  c.ok('nacl-stateless', 'Network ACLs are stateless, so each reply is checked against its own rules.');
}

function inbound(c: Ctx, ip: string, dn: Node) {
  const { w, at } = c;
  const dv = w.vpcOfNode.get(dn.id) as Vpc;
  const sn = subnetOf(dv, dn.subnet);
  const rt = rtOf(dv, sn);
  const nacl = naclOf(dv, sn);
  const srcIp = parseIp(ip);
  const other: Other = { ip: srcIp, service: null, node: null };
  if (!sn.rt) c.ok('route-main', `${sn.id} has no explicit route table, so it uses the main route table ${rt.id}.`);
  if (!sn.nacl) c.ok('nacl-assoc', `${sn.id} has no explicit network ACL, so it uses the default ${nacl.id}.`);
  let reached = true;
  if (dv.igw) c.ok('igw-attach', `${dv.name} has an internet gateway attached.`);
  else {
    c.bad('igw-attach', `igw:${dv.id}`, `${dv.name} has no internet gateway, so internet traffic cannot enter.`);
    reached = false;
  }
  if (dn.publicIp) c.ok('igw-inbound', `${dn.name} has public IPv4 address ${dn.publicIp}, so the client can address it.`);
  else {
    c.bad('igw-public-ip', `addr:${dn.id}`, `${dn.name} has no public IPv4 address for the client to use.`);
    reached = false;
  }
  const r = lookup(dv, rt, { ip: srcIp, service: null }).route;
  if (r && r.target === 'igw') c.ok('igw-public-subnet', `${rt.id} sends internet traffic to the internet gateway, so ${sn.id} is a public subnet.`);
  else {
    const why = r ? `${rt.id} sends internet traffic to ${r.target}, not to the internet gateway` : `${rt.id} has no route for the client address`;
    c.bad(r && r.target.startsWith('nat') ? 'nat-outbound-only' : 'igw-no-route', `rt:${rt.id}`, `${why}, so ${dn.name} cannot be reached from the internet.`);
    reached = false;
  }
  if (!reached) return;
  pushNacl(c, nacl, 'in', naclDecision(nacl, 'in', other, at.proto, [at.port, at.port]), `${c.portText} from ${ip}`, `${sn.id} inbound`);
  pushSg(c, dn, sgDecision(w, dn, 'in', other, at.proto, at.port), 'in', `${c.portText} from ${ip}`);
  c.ok('sg-stateful', `The reply to allowed inbound traffic leaves ${dn.name} whatever its outbound rules say.`);
  replyIntro(c);
  pushNacl(c, nacl, 'out', naclDecision(nacl, 'out', other, at.proto, c.client), `reply to ${ip} on ports ${c.clientText}`, `${sn.id} outbound`, { reply: true });
}

function outbound(c: Ctx, sv: Vpc, sn: Node, dst: Endpoint, dn: Node | undefined) {
  const { w, at } = c;
  const subnet = subnetOf(sv, sn.subnet);
  const rt = rtOf(sv, subnet);
  const nacl = naclOf(sv, subnet);
  const service: Service | null = dst.kind === 'service' ? dst.service : null;
  const dstIp: number | null = dn ? parseIp(dn.ip) : dst.kind === 'internet' ? parseIp(dst.ip) : null;
  const dstName = dn ? dn.name : dst.kind === 'internet' ? `${dst.label} (${dst.ip})` : service === 's3' ? 'Amazon S3' : 'Amazon DynamoDB';
  const other: Other = { ip: dstIp, service, node: dn ?? null };
  const sameSubnet = dn !== undefined && dn.subnet === sn.subnet;
  const srcIp = parseIp(sn.ip);
  const srcOther: Other = { ip: srcIp, service: null, node: sn };
  const portRange: [number, number] = [at.port, at.port];

  if (!subnet.rt) c.ok('route-main', `${subnet.id} has no explicit route table, so it uses the main route table ${rt.id}.`);
  if (!subnet.nacl) c.ok('nacl-assoc', `${subnet.id} has no explicit network ACL, so it uses the default ${nacl.id}.`);

  const { route: found, matched } = lookup(sv, rt, { ip: dstIp, service });
  const viaGw = found !== null && found.target.startsWith('vpce:');
  const gwNacl = service === 'dynamodb' ? 'gwep-nacl-ddb' : 'gwep-nacl';

  // Source side: security group, then the subnet network ACL.
  pushSg(c, sn, sgDecision(w, sn, 'out', other, at.proto, at.port), 'out', `${c.portText} to ${dstName}`, { gw: viaGw && service !== null, svc: service });
  if (sameSubnet) c.ok('nacl-boundary', `${sn.name} and ${dstName} share ${sn.subnet}, so no network ACL is checked.`);
  else pushNacl(c, nacl, 'out', naclDecision(nacl, 'out', other, at.proto, portRange), `${c.portText} to ${dstName}`, `${subnet.id} outbound`, { pass: viaGw ? gwNacl : undefined });

  if (!found) {
    let rule = 'igw-no-route';
    if (dn) rule = 'peer-routes';
    else if (service) {
      const eps = sv.gwEps ?? [];
      if (eps.some((g) => g.service === service)) rule = 'gwep-unassociated';
      else if (eps.length > 0) rule = 'gwep-other-service';
    }
    c.bad(rule, `rt:${rt.id}`, `${rt.id} has no route that matches ${dstName}.`);
    return;
  }
  if (matched > 1) c.ok('route-longest', `More than one route in ${rt.id} matches ${dstName}; the most specific one is used.`);
  const [kind, id] = found.target.split(':');
  const via = `${rt.id} sends ${dstName} to ${found.target} (${found.dest})`;
  let reachedNode = false;
  let path: 'igw' | 'nat' | 'vpce' | null = null;
  let natSubnet: Subnet | null = null;

  if (kind === 'local') {
    if (!dn) refuse('a local route for a destination outside the VPC is not settled');
    c.ok('route-local', `${via}.`);
    reachedNode = true;
  } else if (kind === 'igw') {
    if (dn) {
      c.bad('peer-routes', `rt:${rt.id}`, `${via}, but ${dn.name} has a private VPC address and ${rt.id} has no route to its VPC.`);
      return;
    }
    c.ok('igw-public-subnet', `${rt.id} has a route to the internet gateway, so ${subnet.id} is a public subnet.`);
    if (sn.publicIp) c.ok('igw-public-ip', `${sn.name} has public IPv4 address ${sn.publicIp}.`);
    else {
      c.bad('igw-public-ip', `addr:${sn.id}`, `${sn.name} has no public IPv4 address, so the internet gateway cannot carry its traffic.`);
      return;
    }
    path = 'igw';
  } else if (kind === 'nat') {
    if (dn) {
      c.bad('peer-routes', `rt:${rt.id}`, `${via}, but ${dn.name} has a private VPC address and ${rt.id} has no route to its VPC.`);
      return;
    }
    c.ok('nat-private-route', `${via}.`);
    const nat = (sv.nats ?? []).find((x) => x.id === id) as Nat;
    natSubnet = subnetOf(sv, nat.subnet);
    const nrt = rtOf(sv, natSubnet);
    const nr = lookup(sv, nrt, { ip: dstIp, service }).route;
    if (nr && nr.target === 'igw') c.ok('nat-public-subnet', `${nat.id} sits in ${natSubnet.id}, a public subnet.`);
    if (nr && nr.target === 'igw') c.ok('nat-to-igw', `${nrt.id} (the route table of ${natSubnet.id}, where ${nat.id} sits) sends internet traffic to the internet gateway.`);
    else {
      c.bad('nat-to-igw', `rt:${nrt.id}`, `${nrt.id} (the route table of ${natSubnet.id}, where ${nat.id} sits) has no route to the internet gateway, so ${nat.id} is not in a public subnet.`);
      return;
    }
    const nn = naclOf(sv, natSubnet);
    if (natSubnet.id !== subnet.id) pushNacl(c, nn, 'in', naclDecision(nn, 'in', srcOther, at.proto, portRange), `${c.portText} from ${sn.name}`, `${natSubnet.id} inbound`, { pass: 'nat-nacl' });
    pushNacl(c, nn, 'out', naclDecision(nn, 'out', other, at.proto, portRange), `${c.portText} to ${dstName}`, `${natSubnet.id} outbound`, { pass: 'nat-nacl' });
    path = 'nat';
  } else if (kind === 'vpce') {
    const hasZero = rt.routes.some((r) => !r.dest.startsWith('pl:') && isZero(parseCidr(r.dest)));
    c.ok(hasZero ? 'gwep-precedence' : 'gwep-route', `${via}${hasZero ? ', which wins over the 0.0.0.0/0 route' : ''}.`);
    if (!hasZero) c.ok('gwep-no-igw', 'No internet gateway or NAT route is needed to reach the service through the endpoint.');
    path = 'vpce';
  } else if (kind === 'pcx') {
    const p = w.peerings.get(id as string) as Peering;
    const peerVpc = w.vpcs.get(p.a === sv.id ? p.b : p.a) as Vpc;
    if (dn && w.vpcOfNode.get(dn.id) === peerVpc) {
      c.ok('peer-routes', `${via}; ${peerVpc.name} is the peer VPC.`);
      reachedNode = true;
    } else {
      const comp = `pcx:${p.id}`;
      if (dn) {
        const third = w.vpcOfNode.get(dn.id) as Vpc;
        const rule = peeredWith(w, third, peerVpc) ? 'peer-non-transitive' : 'peer-no-other';
        c.bad(rule, comp, `${via}, but ${dstName} is in ${third.name}, not in ${peerVpc.name}, and peering is not transitive.`);
      } else if (service) {
        if (!(peerVpc.gwEps ?? []).some((g) => g.service === service)) refuse('peer without that gateway endpoint: not settled');
        c.bad('peer-edge-gwep', comp, `${via}, but a peer cannot use ${peerVpc.name}'s gateway endpoint.`);
      } else if ((peerVpc.nats ?? []).length > 0) {
        c.bad('peer-edge-nat', comp, `${via}, but a peer cannot use ${peerVpc.name}'s NAT gateway.`);
        c.bad('nat-no-peering', comp, 'Traffic cannot be routed to a NAT gateway through a peering connection.');
      } else if (peerVpc.igw) {
        c.bad('peer-edge-igw', comp, `${via}, but a peer cannot use ${peerVpc.name}'s internet gateway.`);
      } else refuse('peer without a gateway: not settled');
      return;
    }
  } else refuse('unsupported target');

  if (reachedNode && dn) {
    const dv = w.vpcOfNode.get(dn.id) as Vpc;
    const dsub = subnetOf(dv, dn.subnet);
    const dnacl = naclOf(dv, dsub);
    const isEp = dn.kind === 'interface-endpoint';
    if (isEp) c.ok('ifep-eni', `${dn.name} is a network interface in ${dsub.id} with private address ${dn.ip}.`);
    if (!sameSubnet) pushNacl(c, dnacl, 'in', naclDecision(dnacl, 'in', srcOther, at.proto, portRange), `${c.portText} from ${sn.name}`, `${dsub.id} inbound`, { pass: isEp ? 'ifep-nacl' : undefined });
    pushSg(c, dn, sgDecision(w, dn, 'in', srcOther, at.proto, at.port), 'in', `${c.portText} from ${sn.name}`, { ep: isEp });
    c.ok('sg-stateful', `The reply to allowed inbound traffic leaves ${dn.name} whatever its outbound rules say.`);
    replyIntro(c);
    if (!sameSubnet) pushNacl(c, dnacl, 'out', naclDecision(dnacl, 'out', srcOther, at.proto, c.client), `reply to ${sn.name} on ports ${c.clientText}`, `${dsub.id} outbound`, { reply: true });
    const drt = rtOf(dv, dsub);
    const back = lookup(dv, drt, { ip: srcIp, service: null }).route;
    if (dv === sv) c.ok('route-local', `${drt.id} delivers the reply locally.`);
    else if (back && back.target === `pcx:${id}`) c.ok('peer-routes', `${drt.id} sends ${sv.cidr} back through ${back.target}.`);
    else c.bad('peer-routes', `rt:${drt.id}`, `${drt.id} has no route that sends replies for ${sv.cidr} back through the peering connection.`);
    if (!sameSubnet) pushNacl(c, nacl, 'in', naclDecision(nacl, 'in', { ip: dstIp, service: null, node: dn }, at.proto, c.client), `reply from ${dstName} on ports ${c.clientText}`, `${subnet.id} inbound`, { reply: true });
    c.ok('sg-stateful-reply', `The reply to ${sn.name}'s request is allowed in whatever its inbound rules say.`);
    return;
  }

  // Internet or service destination: the reply comes back the same way.
  c.ok('sg-stateful-reply', `The reply is allowed back into ${sn.name} whatever its inbound rules say.`);
  replyIntro(c);
  if (path === 'nat' && natSubnet) {
    const nn = naclOf(sv, natSubnet);
    pushNacl(c, nn, 'in', naclDecision(nn, 'in', other, at.proto, NAT_RANGE), `reply from ${dstName} on ports ${NAT_RANGE[0]}-${NAT_RANGE[1]}`, `${natSubnet.id} inbound`, { pass: 'nat-ports' });
    if (natSubnet.id !== subnet.id) pushNacl(c, nn, 'out', naclDecision(nn, 'out', srcOther, at.proto, c.client), `reply to ${sn.name} on ports ${c.clientText}`, `${natSubnet.id} outbound`, { reply: true });
  }
  pushNacl(c, nacl, 'in', naclDecision(nacl, 'in', other, at.proto, c.client), `reply from ${dstName} on ports ${c.clientText}`, `${subnet.id} inbound`, { reply: true, pass: path === 'vpce' ? gwNacl : undefined });
}

// ---------------------------------------------------------------------------------------------------------------
// Player-facing parts

function components(s: PacketScenario): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  const at = s.attempt;
  for (const v of s.vpcs) {
    for (const sg of v.sgs) out.push({ id: `sg:${sg.id}`, label: `Security group ${sg.id}` });
    for (const n of v.nacls) out.push({ id: `nacl:${n.id}`, label: `${n.default ? 'Default network ACL' : 'Network ACL'} ${n.id}` });
    for (const r of v.routeTables) out.push({ id: `rt:${r.id}`, label: `Route table ${r.id}${r.main ? ' (main)' : ''}` });
    if (v.igw) out.push({ id: `igw:${v.id}`, label: `Internet gateway of ${v.name}` });
    for (const n of v.nats ?? []) out.push({ id: `nat:${n.id}`, label: `NAT gateway ${n.id}` });
  }
  for (const p of s.peerings ?? []) out.push({ id: `pcx:${p.id}`, label: `VPC peering connection ${p.id}` });
  const ends = [at.src, at.dst].filter((e) => e.kind === 'node') as { kind: 'node'; id: string }[];
  for (const e of ends) {
    for (const v of s.vpcs) {
      const n = v.nodes.find((x) => x.id === e.id);
      if (n && n.kind === 'instance') out.push({ id: `addr:${n.id}`, label: `Public IPv4 address of ${n.name}` });
    }
  }
  return out;
}

function fields(s: PacketScenario): Field[] {
  return [
    {
      id: 'outcome',
      prompt: 'Does this connection attempt succeed?',
      multi: false,
      options: [
        { id: 'yes', label: 'Yes, the connection succeeds' },
        { id: 'no', label: 'No, the connection fails' },
      ],
    },
    {
      id: 'blocker',
      prompt: 'Which one component blocks it? Name the first component on the packet\'s path that cannot carry it (for a route table, the one the subnet actually uses; for peering that cannot carry the traffic, the peering connection). Choose "Nothing blocks it" if the connection succeeds.',
      multi: false,
      options: [...components(s).map((c) => ({ id: c.id, label: c.label })), { id: 'none', label: 'Nothing blocks it' }],
    },
  ];
}

const ports = (r: { proto: string; from?: number; to?: number }) => (r.proto === 'all' ? 'all' : r.from === r.to ? String(r.from) : `${r.from}-${r.to}`);
const protoText = (p: string) => (p === 'all' ? 'all' : p.toUpperCase());

function exhibit(s: PacketScenario): Exhibit {
  const out: ExhibitSection[] = [];
  for (const v of s.vpcs) {
    const bits: string[] = [`CIDR ${v.cidr}.`, v.igw ? 'An internet gateway is attached.' : 'No internet gateway is attached.'];
    for (const n of v.nats ?? []) bits.push(`NAT gateway ${n.id} (public) is in subnet ${n.subnet}.`);
    for (const g of v.gwEps ?? []) bits.push(`Gateway endpoint ${g.id} for ${g.service === 's3' ? 'Amazon S3' : 'Amazon DynamoDB'}.`);
    out.push({ title: v.name, kind: 'text', text: bits.join(' ') });
    out.push({
      title: `${v.name}: subnets`,
      kind: 'table',
      head: ['Subnet', 'CIDR', 'Route table', 'Network ACL'],
      rows: v.subnets.map((sn) => [sn.id, sn.cidr, sn.rt ?? 'none associated', sn.nacl ?? 'none associated']),
    });
    const rtRows: string[][] = [];
    for (const r of v.routeTables) {
      const name = `${r.id}${r.main ? ' (main)' : ''}`;
      rtRows.push([name, v.cidr, 'local']);
      for (const x of r.routes) rtRows.push([name, x.dest.startsWith('pl:') ? `prefix list of ${x.dest.slice(3) === 's3' ? 'Amazon S3' : 'Amazon DynamoDB'}` : x.dest, x.target.startsWith('pcx:') ? `peering ${x.target.slice(4)}` : x.target.startsWith('vpce:') ? `endpoint ${x.target.slice(5)}` : x.target === 'igw' ? 'internet gateway' : `NAT gateway ${x.target.slice(4)}`]);
    }
    out.push({ title: `${v.name}: route tables`, kind: 'table', head: ['Route table', 'Destination', 'Target'], rows: rtRows });
    const sgRows: string[][] = [];
    const peerText = (p: string) => (p.startsWith('sg:') ? `group ${p.slice(3)}` : p.startsWith('pl:') ? `prefix list of ${p.slice(3) === 's3' ? 'Amazon S3' : 'Amazon DynamoDB'}` : p);
    for (const g of v.sgs) {
      if (g.inbound.length === 0) sgRows.push([g.id, 'inbound', '-', '-', '(no rules)']);
      for (const r of g.inbound) sgRows.push([g.id, 'inbound', protoText(r.proto), ports(r), peerText(r.peer)]);
      const outs = g.outbound ?? [{ proto: 'all' as const, peer: '0.0.0.0/0' }];
      if (outs.length === 0) sgRows.push([g.id, 'outbound', '-', '-', '(no rules)']);
      for (const r of outs) sgRows.push([g.id, 'outbound', protoText(r.proto), ports(r), peerText(r.peer)]);
    }
    out.push({ title: `${v.name}: security groups (allow rules only)`, kind: 'table', head: ['Security group', 'Direction', 'Protocol', 'Ports', 'Source or destination'], rows: sgRows });
    const nRows: string[][] = [];
    for (const n of v.nacls) {
      const name = `${n.id}${n.default ? ' (default)' : ''}`;
      for (const dir of ['inbound', 'outbound'] as const) {
        const list = n.default && n[dir] === undefined ? [{ n: 100, proto: 'all' as const, cidr: '0.0.0.0/0', action: 'allow' as const }] : (n[dir] ?? []);
        for (const r of list) nRows.push([name, dir, String(r.n), protoText(r.proto), ports(r), r.cidr, r.action.toUpperCase()]);
        nRows.push([name, dir, '*', 'all', 'all', '0.0.0.0/0', 'DENY']);
      }
    }
    out.push({ title: `${v.name}: network ACLs`, kind: 'table', head: ['Network ACL', 'Direction', 'Rule', 'Protocol', 'Ports', 'Source or destination', 'Action'], rows: nRows });
    out.push({
      title: `${v.name}: instances and endpoints`,
      kind: 'table',
      head: ['Name', 'Type', 'Subnet', 'Private IP', 'Public IPv4', 'Security groups'],
      rows: v.nodes.map((n) => [n.name, n.kind === 'instance' ? 'instance' : `interface endpoint${n.service ? ` (${n.service})` : ''}`, n.subnet, n.ip, n.publicIp ?? 'none', n.sgs.join(', ')]),
    });
  }
  if ((s.peerings ?? []).length > 0) {
    out.push({
      title: 'VPC peering connections (all active, same Region)',
      kind: 'table',
      head: ['Connection', 'VPC', 'VPC'],
      rows: (s.peerings ?? []).map((p) => [p.id, s.vpcs.find((v) => v.id === p.a)?.name ?? p.a, s.vpcs.find((v) => v.id === p.b)?.name ?? p.b]),
    });
  }
  const at = s.attempt;
  const find = (id: string) => s.vpcs.flatMap((v) => v.nodes).find((n) => n.id === id);
  const end = (e: Endpoint, role: 'from' | 'to') => {
    if (e.kind === 'internet') return `${e.label} at ${e.ip}`;
    if (e.kind === 'service') return e.service === 's3' ? 'Amazon S3 (public service endpoint)' : 'Amazon DynamoDB (public service endpoint)';
    const n = find(e.id);
    if (!n) return e.id;
    return role === 'to' && e.via === 'public' ? (n.publicIp ? `${n.name} at its public IPv4 address ${n.publicIp}` : `${n.name} by the address visitors expect to use (no public IPv4 address is assigned to it)`) : `${n.name} at ${n.ip}`;
  };
  const srcNode = at.src.kind === 'node' ? find(at.src.id) : undefined;
  const os = at.clientOs ?? srcNode?.os ?? 'linux';
  out.push({
    title: 'The connection attempt',
    kind: 'text',
    text: `From: ${end(at.src, 'from')}. To: ${end(at.dst, 'to')}. ${at.proto.toUpperCase()} on port ${at.port}. The source opens the connection. The client runs ${os === 'linux' ? 'Amazon Linux' : 'Windows Server 2019'}. Assume the service or application at the destination accepts the connection, that IAM and bucket policies are not involved, and that any endpoint policy is the default (full access).`,
  });
  return out;
}

export const def: PuzzleDef<PacketScenario> = {
  type: 'packet-tracer',
  rules,
  fields,
  exhibit,
  evaluate,
};
