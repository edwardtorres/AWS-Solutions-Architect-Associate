import type { Scenario } from '../../src/puzzles/types';
import type { Nacl, NaclRule, PacketScenario, RouteTable, SgRule } from '../../src/puzzles/packet-tracer/def';

/** Allow rule for TCP on one port or a range. */
const tcp = (peer: string, from: number, to: number = from): SgRule => ({ proto: 'tcp', from, to, peer });
/** Network ACL rule for TCP. */
const na = (n: number, from: number, to: number, cidr: string, action: 'allow' | 'deny' = 'allow'): NaclRule => ({ n, proto: 'tcp', from, to, cidr, action });
const mainRt = (id = 'main-rt', routes: RouteTable['routes'] = []): RouteTable => ({ id, main: true, routes });
const defaultNacl = (id = 'nacl-default'): Nacl => ({ id, default: true });
const any = '0.0.0.0/0';

const pt = 'packet-tracer' as const;

const scenarios: Scenario<PacketScenario>[] = [
  // ------------------------------------------------------------------ Gatehouse (domain 1)
  {
    id: 'packet-tracer-001',
    type: pt,
    building: 'gatehouse',
    bullets: ['1.2-S1', '1.2-S2'],
    difficulty: 1,
    title: 'The server nobody can find',
    story:
      'A web server sits in a subnet that looks public: it has the right route and the right security group, but nobody assigned it a public IPv4 address. Visitors on the internet try to open its HTTPS page.',
    data: {
      vpcs: [
        {
          id: 'web',
          name: 'Web VPC',
          cidr: '10.0.0.0/16',
          igw: true,
          subnets: [{ id: 'pub-a', cidr: '10.0.1.0/24', rt: 'pub-rt' }],
          routeTables: [mainRt(), { id: 'pub-rt', routes: [{ dest: any, target: 'igw' }] }],
          nacls: [defaultNacl()],
          sgs: [{ id: 'web-sg', inbound: [tcp(any, 443)] }],
          nodes: [{ id: 'web-1', name: 'web-1', kind: 'instance', subnet: 'pub-a', ip: '10.0.1.10', sgs: ['web-sg'] }],
        },
      ],
      attempt: { src: { kind: 'internet', ip: '203.0.113.25', label: 'Visitor' }, dst: { kind: 'node', id: 'web-1', via: 'public' }, proto: 'tcp', port: 443 },
    },
  },
  {
    id: 'packet-tracer-002',
    type: pt,
    building: 'gatehouse',
    bullets: ['1.2-K3', '1.2-S1'],
    difficulty: 2,
    title: 'Rules copied in only one direction',
    story:
      'A team locks down the public subnet with a custom network ACL. They allow HTTPS in and, to keep things symmetrical, HTTPS out. Visitors on Linux laptops now try the site.',
    data: {
      vpcs: [
        {
          id: 'web',
          name: 'Web VPC',
          cidr: '10.0.0.0/16',
          igw: true,
          subnets: [{ id: 'pub-a', cidr: '10.0.1.0/24', rt: 'pub-rt', nacl: 'pub-nacl' }],
          routeTables: [mainRt(), { id: 'pub-rt', routes: [{ dest: any, target: 'igw' }] }],
          nacls: [
            defaultNacl(),
            { id: 'pub-nacl', inbound: [na(100, 443, 443, any), na(110, 22, 22, '198.51.100.0/24')], outbound: [na(100, 443, 443, any)] },
          ],
          sgs: [{ id: 'web-sg', inbound: [tcp(any, 443)] }],
          nodes: [{ id: 'web-1', name: 'web-1', kind: 'instance', subnet: 'pub-a', ip: '10.0.1.10', sgs: ['web-sg'], publicIp: '192.0.2.44' }],
        },
      ],
      attempt: { src: { kind: 'internet', ip: '203.0.113.25', label: 'Visitor' }, dst: { kind: 'node', id: 'web-1', via: 'public' }, proto: 'tcp', port: 443, clientOs: 'linux' },
    },
  },
  {
    id: 'packet-tracer-003',
    type: pt,
    building: 'gatehouse',
    bullets: ['1.2-S1', '1.2-S2'],
    difficulty: 2,
    title: 'The wrong tier in the rule',
    story:
      'The database security group admits the web tier by name. An application server in a different tier tries to open a database connection over the local network.',
    data: {
      vpcs: [
        {
          id: 'shop',
          name: 'Shop VPC',
          cidr: '10.0.0.0/16',
          igw: false,
          subnets: [
            { id: 'web-sub', cidr: '10.0.1.0/24' },
            { id: 'app-sub', cidr: '10.0.2.0/24' },
            { id: 'db-sub', cidr: '10.0.3.0/24' },
          ],
          routeTables: [mainRt()],
          nacls: [defaultNacl()],
          sgs: [
            { id: 'web-sg', inbound: [tcp(any, 443)] },
            { id: 'app-sg', inbound: [tcp('sg:web-sg', 8080)] },
            { id: 'db-sg', inbound: [tcp('sg:web-sg', 5432)] },
          ],
          nodes: [
            { id: 'web-1', name: 'web-1', kind: 'instance', subnet: 'web-sub', ip: '10.0.1.10', sgs: ['web-sg'] },
            { id: 'app-1', name: 'app-1', kind: 'instance', subnet: 'app-sub', ip: '10.0.2.10', sgs: ['app-sg'] },
            { id: 'db-1', name: 'db-1', kind: 'instance', subnet: 'db-sub', ip: '10.0.3.10', sgs: ['db-sg'] },
          ],
        },
      ],
      attempt: { src: { kind: 'node', id: 'app-1' }, dst: { kind: 'node', id: 'db-1' }, proto: 'tcp', port: 5432 },
    },
  },
  {
    id: 'packet-tracer-004',
    type: pt,
    building: 'gatehouse',
    bullets: ['1.2-K3', '1.2-S1'],
    difficulty: 3,
    title: 'Deny numbered after the allow',
    story:
      'An analyst adds a deny rule for a hostile address range and numbers it 90. An older allow rule for HTTPS from anywhere is numbered 100. A client in the hostile range tries the site.',
    data: {
      vpcs: [
        {
          id: 'web',
          name: 'Web VPC',
          cidr: '10.0.0.0/16',
          igw: true,
          subnets: [{ id: 'pub-a', cidr: '10.0.1.0/24', rt: 'pub-rt', nacl: 'pub-nacl' }],
          routeTables: [mainRt(), { id: 'pub-rt', routes: [{ dest: any, target: 'igw' }] }],
          nacls: [
            defaultNacl(),
            { id: 'pub-nacl', inbound: [na(90, 443, 443, '203.0.113.0/24', 'deny'), na(100, 443, 443, any)], outbound: [na(100, 1024, 65535, any)] },
          ],
          sgs: [{ id: 'web-sg', inbound: [tcp(any, 443)] }],
          nodes: [{ id: 'web-1', name: 'web-1', kind: 'instance', subnet: 'pub-a', ip: '10.0.1.10', sgs: ['web-sg'], publicIp: '192.0.2.44' }],
        },
      ],
      attempt: { src: { kind: 'internet', ip: '203.0.113.77', label: 'Client in the hostile range' }, dst: { kind: 'node', id: 'web-1', via: 'public' }, proto: 'tcp', port: 443 },
    },
  },
  {
    id: 'packet-tracer-005',
    type: pt,
    building: 'gatehouse',
    bullets: ['1.2-K3', '1.2-S1'],
    difficulty: 2,
    title: 'The deny that never runs',
    story:
      'The same site is protected by a network ACL that allows HTTPS from anywhere at rule 100 and denies one address range at rule 110. A client in that range tries the site.',
    data: {
      vpcs: [
        {
          id: 'web',
          name: 'Web VPC',
          cidr: '10.0.0.0/16',
          igw: true,
          subnets: [{ id: 'pub-a', cidr: '10.0.1.0/24', rt: 'pub-rt', nacl: 'pub-nacl' }],
          routeTables: [mainRt(), { id: 'pub-rt', routes: [{ dest: any, target: 'igw' }] }],
          nacls: [
            defaultNacl(),
            { id: 'pub-nacl', inbound: [na(100, 443, 443, any), na(110, 443, 443, '203.0.113.0/24', 'deny')], outbound: [na(100, 1024, 65535, any)] },
          ],
          sgs: [{ id: 'web-sg', inbound: [tcp(any, 443)] }],
          nodes: [{ id: 'web-1', name: 'web-1', kind: 'instance', subnet: 'pub-a', ip: '10.0.1.10', sgs: ['web-sg'], publicIp: '192.0.2.44' }],
        },
      ],
      attempt: { src: { kind: 'internet', ip: '203.0.113.77', label: 'Client in the listed range' }, dst: { kind: 'node', id: 'web-1', via: 'public' }, proto: 'tcp', port: 443 },
    },
  },
  {
    id: 'packet-tracer-006',
    type: pt,
    building: 'gatehouse',
    bullets: ['1.2-K3', '1.2-S1'],
    difficulty: 3,
    title: 'Locked subnet, same subnet',
    story:
      'A cache subnet has a custom network ACL with no rules at all. An application server and a cache server both live in that one subnet, and the cache security group trusts the application group.',
    data: {
      vpcs: [
        {
          id: 'data',
          name: 'Data VPC',
          cidr: '10.0.0.0/16',
          igw: false,
          subnets: [{ id: 'cache-sub', cidr: '10.0.2.0/24', nacl: 'lock-nacl' }],
          routeTables: [mainRt()],
          nacls: [defaultNacl(), { id: 'lock-nacl' }],
          sgs: [
            { id: 'app-sg', inbound: [] },
            { id: 'cache-sg', inbound: [tcp('sg:app-sg', 6379)] },
          ],
          nodes: [
            { id: 'app-1', name: 'app-1', kind: 'instance', subnet: 'cache-sub', ip: '10.0.2.10', sgs: ['app-sg'] },
            { id: 'cache-1', name: 'cache-1', kind: 'instance', subnet: 'cache-sub', ip: '10.0.2.20', sgs: ['cache-sg'] },
          ],
        },
      ],
      attempt: { src: { kind: 'node', id: 'app-1' }, dst: { kind: 'node', id: 'cache-1' }, proto: 'tcp', port: 6379 },
    },
  },
  {
    id: 'packet-tracer-007',
    type: pt,
    building: 'gatehouse',
    bullets: ['1.2-S2'],
    difficulty: 2,
    title: 'A public address in a private subnet',
    story:
      'An application server in a private subnet was given a public IPv4 address by mistake. Its subnet reaches the internet through a NAT gateway. A visitor tries its HTTPS port on that public address.',
    data: {
      vpcs: [
        {
          id: 'app',
          name: 'App VPC',
          cidr: '10.0.0.0/16',
          igw: true,
          subnets: [
            { id: 'pub-a', cidr: '10.0.1.0/24', rt: 'pub-rt' },
            { id: 'priv-a', cidr: '10.0.2.0/24', rt: 'priv-rt' },
          ],
          routeTables: [
            mainRt(),
            { id: 'pub-rt', routes: [{ dest: any, target: 'igw' }] },
            { id: 'priv-rt', routes: [{ dest: any, target: 'nat:nat-a' }] },
          ],
          nacls: [defaultNacl()],
          sgs: [{ id: 'app-sg', inbound: [tcp(any, 443)] }],
          nodes: [{ id: 'app-1', name: 'app-1', kind: 'instance', subnet: 'priv-a', ip: '10.0.2.10', sgs: ['app-sg'], publicIp: '192.0.2.88' }],
          nats: [{ id: 'nat-a', subnet: 'pub-a' }],
        },
      ],
      attempt: { src: { kind: 'internet', ip: '203.0.113.25', label: 'Visitor' }, dst: { kind: 'node', id: 'app-1', via: 'public' }, proto: 'tcp', port: 443 },
    },
  },
  {
    id: 'packet-tracer-008',
    type: pt,
    building: 'gatehouse',
    bullets: ['1.2-K3'],
    difficulty: 3,
    title: 'Ephemeral ports for a Windows client',
    story:
      'A public web server has a custom network ACL. The outbound rule opens ports 1024 to 49151 for replies, a range chosen to look generous. A client on Windows Server 2019 opens the HTTPS site.',
    data: {
      vpcs: [
        {
          id: 'web',
          name: 'Web VPC',
          cidr: '10.0.0.0/16',
          igw: true,
          subnets: [{ id: 'pub-a', cidr: '10.0.1.0/24', rt: 'pub-rt', nacl: 'pub-nacl' }],
          routeTables: [mainRt(), { id: 'pub-rt', routes: [{ dest: any, target: 'igw' }] }],
          nacls: [defaultNacl(), { id: 'pub-nacl', inbound: [na(100, 443, 443, any)], outbound: [na(100, 1024, 49151, any)] }],
          sgs: [{ id: 'web-sg', inbound: [tcp(any, 443)] }],
          nodes: [{ id: 'web-1', name: 'web-1', kind: 'instance', subnet: 'pub-a', ip: '10.0.1.10', sgs: ['web-sg'], publicIp: '192.0.2.44' }],
        },
      ],
      attempt: { src: { kind: 'internet', ip: '203.0.113.90', label: 'Windows client' }, dst: { kind: 'node', id: 'web-1', via: 'public' }, proto: 'tcp', port: 443, clientOs: 'windows' },
    },
  },

  // ------------------------------------------------------------------ Customs House (domain 1)
  {
    id: 'packet-tracer-009',
    type: pt,
    building: 'customs-house',
    bullets: ['1.2-K2'],
    difficulty: 1,
    title: 'An endpoint for a different subnet',
    story:
      'A gateway endpoint for Amazon S3 is associated only with the data route table. A worker in the app subnet, which uses its own route table and has no internet gateway or NAT, tries to reach Amazon S3 over HTTPS.',
    data: {
      vpcs: [
        {
          id: 'lake',
          name: 'Lake VPC',
          cidr: '10.0.0.0/16',
          igw: false,
          subnets: [
            { id: 'app-sub', cidr: '10.0.1.0/24', rt: 'app-rt' },
            { id: 'data-sub', cidr: '10.0.2.0/24', rt: 'data-rt' },
          ],
          routeTables: [mainRt(), { id: 'app-rt', routes: [] }, { id: 'data-rt', routes: [{ dest: 'pl:s3', target: 'vpce:vpce-s3' }] }],
          nacls: [defaultNacl()],
          sgs: [{ id: 'worker-sg', inbound: [] }],
          nodes: [{ id: 'worker-1', name: 'worker-1', kind: 'instance', subnet: 'app-sub', ip: '10.0.1.10', sgs: ['worker-sg'] }],
          gwEps: [{ id: 'vpce-s3', service: 's3' }],
        },
      ],
      attempt: { src: { kind: 'node', id: 'worker-1' }, dst: { kind: 'service', service: 's3' }, proto: 'tcp', port: 443 },
    },
  },
  {
    id: 'packet-tracer-010',
    type: pt,
    building: 'customs-house',
    bullets: ['1.2-K2'],
    difficulty: 2,
    title: 'The other managed service',
    story:
      'A VPC has no internet gateway and no NAT. Gateway endpoints exist for Amazon S3 and for DynamoDB. The DynamoDB endpoint is associated only with the data route table, while the job subnet uses a route table with the S3 endpoint route. A job tries to write to DynamoDB over HTTPS.',
    data: {
      vpcs: [
        {
          id: 'jobs',
          name: 'Jobs VPC',
          cidr: '10.0.0.0/16',
          igw: false,
          subnets: [
            { id: 'priv-a', cidr: '10.0.1.0/24', rt: 'priv-rt' },
            { id: 'data-sub', cidr: '10.0.2.0/24', rt: 'data-rt' },
          ],
          routeTables: [
            mainRt(),
            { id: 'priv-rt', routes: [{ dest: 'pl:s3', target: 'vpce:vpce-s3' }] },
            { id: 'data-rt', routes: [{ dest: 'pl:dynamodb', target: 'vpce:vpce-ddb' }] },
          ],
          nacls: [defaultNacl()],
          sgs: [{ id: 'job-sg', inbound: [] }],
          nodes: [{ id: 'job-1', name: 'job-1', kind: 'instance', subnet: 'priv-a', ip: '10.0.1.10', sgs: ['job-sg'] }],
          gwEps: [
            { id: 'vpce-s3', service: 's3' },
            { id: 'vpce-ddb', service: 'dynamodb' },
          ],
        },
      ],
      attempt: { src: { kind: 'node', id: 'job-1' }, dst: { kind: 'service', service: 'dynamodb' }, proto: 'tcp', port: 443 },
    },
  },
  {
    id: 'packet-tracer-011',
    type: pt,
    building: 'customs-house',
    bullets: ['1.2-K2'],
    difficulty: 2,
    title: 'Queue endpoint, wrong client range',
    story:
      'An interface endpoint for Amazon SQS sits in its own subnet. Its security group admits HTTPS from the application subnet. A batch server in a different subnet sends a message to the queue through the endpoint address.',
    data: {
      vpcs: [
        {
          id: 'queue',
          name: 'Queue VPC',
          cidr: '10.0.0.0/16',
          igw: false,
          subnets: [
            { id: 'app-sub', cidr: '10.0.1.0/24' },
            { id: 'batch-sub', cidr: '10.0.2.0/24' },
            { id: 'ep-sub', cidr: '10.0.3.0/24' },
          ],
          routeTables: [mainRt()],
          nacls: [defaultNacl()],
          sgs: [
            { id: 'app-sg', inbound: [] },
            { id: 'batch-sg', inbound: [] },
            { id: 'ep-sg', inbound: [tcp('10.0.1.0/24', 443)] },
          ],
          nodes: [
            { id: 'app-1', name: 'app-1', kind: 'instance', subnet: 'app-sub', ip: '10.0.1.10', sgs: ['app-sg'] },
            { id: 'batch-1', name: 'batch-1', kind: 'instance', subnet: 'batch-sub', ip: '10.0.2.10', sgs: ['batch-sg'] },
            { id: 'sqs-ep', name: 'sqs-ep', kind: 'interface-endpoint', subnet: 'ep-sub', ip: '10.0.3.20', sgs: ['ep-sg'], service: 'Amazon SQS' },
          ],
        },
      ],
      attempt: { src: { kind: 'node', id: 'batch-1' }, dst: { kind: 'node', id: 'sqs-ep' }, proto: 'tcp', port: 443 },
    },
  },
  {
    id: 'packet-tracer-012',
    type: pt,
    building: 'customs-house',
    bullets: ['1.2-K2'],
    difficulty: 3,
    title: 'Outbound rules that name the wrong service',
    story:
      'A private worker has a gateway endpoint for both Amazon S3 and DynamoDB in its route table. Its security group limits outbound traffic to the DynamoDB prefix list and the database group. The worker now uploads to Amazon S3.',
    data: {
      vpcs: [
        {
          id: 'etl',
          name: 'ETL VPC',
          cidr: '10.0.0.0/16',
          igw: false,
          subnets: [
            { id: 'work-sub', cidr: '10.0.1.0/24', rt: 'work-rt' },
            { id: 'db-sub', cidr: '10.0.2.0/24' },
          ],
          routeTables: [
            mainRt(),
            {
              id: 'work-rt',
              routes: [
                { dest: 'pl:s3', target: 'vpce:vpce-s3' },
                { dest: 'pl:dynamodb', target: 'vpce:vpce-ddb' },
              ],
            },
          ],
          nacls: [defaultNacl()],
          sgs: [
            { id: 'worker-sg', inbound: [], outbound: [tcp('pl:dynamodb', 443), tcp('sg:db-sg', 5432)] },
            { id: 'db-sg', inbound: [tcp('sg:worker-sg', 5432)] },
          ],
          nodes: [
            { id: 'worker-1', name: 'worker-1', kind: 'instance', subnet: 'work-sub', ip: '10.0.1.10', sgs: ['worker-sg'] },
            { id: 'db-1', name: 'db-1', kind: 'instance', subnet: 'db-sub', ip: '10.0.2.10', sgs: ['db-sg'] },
          ],
          gwEps: [
            { id: 'vpce-s3', service: 's3' },
            { id: 'vpce-ddb', service: 'dynamodb' },
          ],
        },
      ],
      attempt: { src: { kind: 'node', id: 'worker-1' }, dst: { kind: 'service', service: 's3' }, proto: 'tcp', port: 443 },
    },
  },
  {
    id: 'packet-tracer-013',
    type: pt,
    building: 'customs-house',
    bullets: ['1.2-K2'],
    difficulty: 2,
    title: 'No public address, still works',
    story:
      'A server in a subnet with a default route to the internet gateway has no public IPv4 address. The same route table also has the gateway endpoint route for Amazon S3. The server downloads an object over HTTPS.',
    data: {
      vpcs: [
        {
          id: 'site',
          name: 'Site VPC',
          cidr: '10.0.0.0/16',
          igw: true,
          subnets: [{ id: 'pub-a', cidr: '10.0.1.0/24', rt: 'pub-rt' }],
          routeTables: [
            mainRt(),
            {
              id: 'pub-rt',
              routes: [
                { dest: any, target: 'igw' },
                { dest: 'pl:s3', target: 'vpce:vpce-s3' },
              ],
            },
          ],
          nacls: [defaultNacl()],
          sgs: [{ id: 'app-sg', inbound: [] }],
          nodes: [{ id: 'app-1', name: 'app-1', kind: 'instance', subnet: 'pub-a', ip: '10.0.1.10', sgs: ['app-sg'] }],
          gwEps: [{ id: 'vpce-s3', service: 's3' }],
        },
      ],
      attempt: { src: { kind: 'node', id: 'app-1' }, dst: { kind: 'service', service: 's3' }, proto: 'tcp', port: 443 },
    },
  },

  // ------------------------------------------------------------------ Grid Planning Office (domain 3)
  {
    id: 'packet-tracer-014',
    type: pt,
    building: 'grid-planning-office',
    bullets: ['3.4-K2', '3.4-S1'],
    difficulty: 1,
    title: 'Patching from a private tier',
    story:
      'A two-tier layout puts the application in a private subnet and a NAT gateway in a public subnet. The application server fetches an update from a vendor over HTTPS.',
    data: {
      vpcs: [
        {
          id: 'app',
          name: 'App VPC',
          cidr: '10.0.0.0/16',
          igw: true,
          subnets: [
            { id: 'pub-a', cidr: '10.0.1.0/24', rt: 'pub-rt' },
            { id: 'priv-a', cidr: '10.0.2.0/24', rt: 'priv-rt' },
          ],
          routeTables: [
            mainRt(),
            { id: 'pub-rt', routes: [{ dest: any, target: 'igw' }] },
            { id: 'priv-rt', routes: [{ dest: any, target: 'nat:nat-a' }] },
          ],
          nacls: [defaultNacl()],
          sgs: [{ id: 'app-sg', inbound: [tcp('10.0.0.0/16', 8080)] }],
          nodes: [{ id: 'app-1', name: 'app-1', kind: 'instance', subnet: 'priv-a', ip: '10.0.2.10', sgs: ['app-sg'] }],
          nats: [{ id: 'nat-a', subnet: 'pub-a' }],
        },
      ],
      attempt: { src: { kind: 'node', id: 'app-1' }, dst: { kind: 'internet', ip: '198.51.100.7', label: 'Vendor update server' }, proto: 'tcp', port: 443 },
    },
  },
  {
    id: 'packet-tracer-015',
    type: pt,
    building: 'grid-planning-office',
    bullets: ['3.4-K2', '3.4-S1'],
    difficulty: 2,
    title: 'The route table that was never attached',
    story:
      'The team builds a public route table with a default route to the internet gateway, but never associates it with the web subnet, which has no explicit association at all. Visitors try the web server, which has a public IPv4 address.',
    data: {
      vpcs: [
        {
          id: 'web',
          name: 'Web VPC',
          cidr: '10.0.0.0/16',
          igw: true,
          subnets: [{ id: 'web-sub', cidr: '10.0.1.0/24' }],
          routeTables: [mainRt(), { id: 'pub-rt', routes: [{ dest: any, target: 'igw' }] }],
          nacls: [defaultNacl()],
          sgs: [{ id: 'web-sg', inbound: [tcp(any, 80), tcp(any, 443)] }],
          nodes: [{ id: 'web-1', name: 'web-1', kind: 'instance', subnet: 'web-sub', ip: '10.0.1.10', sgs: ['web-sg'], publicIp: '192.0.2.44' }],
        },
      ],
      attempt: { src: { kind: 'internet', ip: '203.0.113.25', label: 'Visitor' }, dst: { kind: 'node', id: 'web-1', via: 'public' }, proto: 'tcp', port: 80 },
    },
  },
  {
    id: 'packet-tracer-016',
    type: pt,
    building: 'grid-planning-office',
    bullets: ['3.4-K2'],
    difficulty: 2,
    title: 'The narrower route wins',
    story:
      'A server has no public IPv4 address. Its subnet routes everything to the internet gateway, and a more specific route sends one partner range through a NAT gateway in an edge subnet. The server calls a partner API in that range.',
    data: {
      vpcs: [
        {
          id: 'hub',
          name: 'Hub VPC',
          cidr: '10.0.0.0/16',
          igw: true,
          subnets: [
            { id: 'web-sub', cidr: '10.0.1.0/24', rt: 'web-rt' },
            { id: 'edge-sub', cidr: '10.0.9.0/24', rt: 'edge-rt' },
          ],
          routeTables: [
            mainRt(),
            {
              id: 'web-rt',
              routes: [
                { dest: any, target: 'igw' },
                { dest: '198.51.100.0/24', target: 'nat:nat-edge' },
              ],
            },
            { id: 'edge-rt', routes: [{ dest: any, target: 'igw' }] },
          ],
          nacls: [defaultNacl()],
          sgs: [{ id: 'web-sg', inbound: [] }],
          nodes: [{ id: 'web-1', name: 'web-1', kind: 'instance', subnet: 'web-sub', ip: '10.0.1.10', sgs: ['web-sg'] }],
          nats: [{ id: 'nat-edge', subnet: 'edge-sub' }],
        },
      ],
      attempt: { src: { kind: 'node', id: 'web-1' }, dst: { kind: 'internet', ip: '198.51.100.20', label: 'Partner API' }, proto: 'tcp', port: 443 },
    },
  },
  {
    id: 'packet-tracer-017',
    type: pt,
    building: 'grid-planning-office',
    bullets: ['3.4-K2', '3.4-S1'],
    difficulty: 2,
    title: 'Database tier trusts only the app tier',
    story:
      'A three-tier layout gives each tier its own subnet. The database network ACL admits the database port only from the application subnet. The security group admits the web group. A web server connects straight to the database.',
    data: {
      vpcs: [
        {
          id: 'shop',
          name: 'Shop VPC',
          cidr: '10.0.0.0/16',
          igw: false,
          subnets: [
            { id: 'web-sub', cidr: '10.0.1.0/24' },
            { id: 'app-sub', cidr: '10.0.2.0/24' },
            { id: 'db-sub', cidr: '10.0.3.0/24', nacl: 'db-nacl' },
          ],
          routeTables: [mainRt()],
          nacls: [defaultNacl(), { id: 'db-nacl', inbound: [na(100, 5432, 5432, '10.0.2.0/24')], outbound: [na(100, 1024, 65535, '10.0.0.0/16')] }],
          sgs: [
            { id: 'web-sg', inbound: [] },
            { id: 'db-sg', inbound: [tcp('sg:web-sg', 5432)] },
          ],
          nodes: [
            { id: 'web-1', name: 'web-1', kind: 'instance', subnet: 'web-sub', ip: '10.0.1.10', sgs: ['web-sg'] },
            { id: 'db-1', name: 'db-1', kind: 'instance', subnet: 'db-sub', ip: '10.0.3.10', sgs: ['db-sg'] },
          ],
        },
      ],
      attempt: { src: { kind: 'node', id: 'web-1' }, dst: { kind: 'node', id: 'db-1' }, proto: 'tcp', port: 5432 },
    },
  },

  // ------------------------------------------------------------------ Route Tariff (domain 4)
  {
    id: 'packet-tracer-018',
    type: pt,
    building: 'route-tariff',
    bullets: ['4.4-K6'],
    difficulty: 1,
    title: 'Peering with a one-way route',
    story:
      'Two VPCs in one Region are peered and the peering connection is active. The application VPC has a route to the database VPC. An application server opens a database connection.',
    data: {
      vpcs: [
        {
          id: 'a',
          name: 'App VPC',
          cidr: '10.0.0.0/16',
          igw: false,
          subnets: [{ id: 'app-sub', cidr: '10.0.1.0/24', rt: 'a-rt' }],
          routeTables: [mainRt('a-main'), { id: 'a-rt', routes: [{ dest: '10.1.0.0/16', target: 'pcx:pcx-ab' }] }],
          nacls: [defaultNacl('a-nacl')],
          sgs: [{ id: 'app-sg', inbound: [] }],
          nodes: [{ id: 'app-1', name: 'app-1', kind: 'instance', subnet: 'app-sub', ip: '10.0.1.10', sgs: ['app-sg'] }],
        },
        {
          id: 'b',
          name: 'Database VPC',
          cidr: '10.1.0.0/16',
          igw: false,
          subnets: [{ id: 'db-sub', cidr: '10.1.1.0/24', rt: 'b-rt' }],
          routeTables: [mainRt('b-main'), { id: 'b-rt', routes: [] }],
          nacls: [defaultNacl('b-nacl')],
          sgs: [{ id: 'db-sg', inbound: [tcp('10.0.0.0/16', 5432)] }],
          nodes: [{ id: 'db-1', name: 'db-1', kind: 'instance', subnet: 'db-sub', ip: '10.1.1.20', sgs: ['db-sg'] }],
        },
      ],
      peerings: [{ id: 'pcx-ab', a: 'a', b: 'b' }],
      attempt: { src: { kind: 'node', id: 'app-1' }, dst: { kind: 'node', id: 'db-1' }, proto: 'tcp', port: 5432 },
    },
  },
  {
    id: 'packet-tracer-019',
    type: pt,
    building: 'route-tariff',
    bullets: ['4.4-K6'],
    difficulty: 2,
    title: 'A to C through B',
    story:
      'VPC A is peered with VPC B, and VPC B is peered with VPC C. A has a route for the C range that points at the A-B peering connection. Every other route and rule shown is set correctly for the paths that exist. A server in A tries to reach a server in C.',
    data: {
      vpcs: [
        {
          id: 'a',
          name: 'VPC A',
          cidr: '10.0.0.0/16',
          igw: false,
          subnets: [{ id: 'a-sub', cidr: '10.0.1.0/24', rt: 'a-rt' }],
          routeTables: [mainRt('a-main'), { id: 'a-rt', routes: [{ dest: '10.1.0.0/16', target: 'pcx:pcx-ab' }, { dest: '10.2.0.0/16', target: 'pcx:pcx-ab' }] }],
          nacls: [defaultNacl('a-nacl')],
          sgs: [{ id: 'a-sg', inbound: [] }],
          nodes: [{ id: 'a-1', name: 'a-1', kind: 'instance', subnet: 'a-sub', ip: '10.0.1.10', sgs: ['a-sg'] }],
        },
        {
          id: 'b',
          name: 'VPC B',
          cidr: '10.1.0.0/16',
          igw: false,
          subnets: [{ id: 'b-sub', cidr: '10.1.1.0/24', rt: 'b-rt' }],
          routeTables: [mainRt('b-main'), { id: 'b-rt', routes: [{ dest: '10.0.0.0/16', target: 'pcx:pcx-ab' }, { dest: '10.2.0.0/16', target: 'pcx:pcx-bc' }] }],
          nacls: [defaultNacl('b-nacl')],
          sgs: [{ id: 'b-sg', inbound: [] }],
          nodes: [{ id: 'b-1', name: 'b-1', kind: 'instance', subnet: 'b-sub', ip: '10.1.1.10', sgs: ['b-sg'] }],
        },
        {
          id: 'c',
          name: 'VPC C',
          cidr: '10.2.0.0/16',
          igw: false,
          subnets: [{ id: 'c-sub', cidr: '10.2.1.0/24', rt: 'c-rt' }],
          routeTables: [mainRt('c-main'), { id: 'c-rt', routes: [{ dest: '10.1.0.0/16', target: 'pcx:pcx-bc' }, { dest: '10.0.0.0/16', target: 'pcx:pcx-bc' }] }],
          nacls: [defaultNacl('c-nacl')],
          sgs: [{ id: 'c-sg', inbound: [tcp('10.0.0.0/16', 443)] }],
          nodes: [{ id: 'c-1', name: 'c-1', kind: 'instance', subnet: 'c-sub', ip: '10.2.1.10', sgs: ['c-sg'] }],
        },
      ],
      peerings: [
        { id: 'pcx-ab', a: 'a', b: 'b' },
        { id: 'pcx-bc', a: 'b', b: 'c' },
      ],
      attempt: { src: { kind: 'node', id: 'a-1' }, dst: { kind: 'node', id: 'c-1' }, proto: 'tcp', port: 443 },
    },
  },
  {
    id: 'packet-tracer-020',
    type: pt,
    building: 'route-tariff',
    bullets: ['4.4-K6', '4.4-S3'],
    difficulty: 2,
    title: 'Borrowing the hub NAT gateway',
    story:
      'A spoke VPC sends its default route across a peering connection to the hub VPC, which has a NAT gateway and an internet gateway, hoping to reuse them. A spoke server calls a public API.',
    data: {
      vpcs: [
        {
          id: 'hub',
          name: 'Hub VPC',
          cidr: '10.0.0.0/16',
          igw: true,
          subnets: [
            { id: 'hub-pub', cidr: '10.0.1.0/24', rt: 'hub-pub-rt' },
            { id: 'hub-priv', cidr: '10.0.2.0/24', rt: 'hub-priv-rt' },
          ],
          routeTables: [
            mainRt('hub-main'),
            { id: 'hub-pub-rt', routes: [{ dest: any, target: 'igw' }, { dest: '10.1.0.0/16', target: 'pcx:pcx-hs' }] },
            { id: 'hub-priv-rt', routes: [{ dest: any, target: 'nat:nat-hub' }, { dest: '10.1.0.0/16', target: 'pcx:pcx-hs' }] },
          ],
          nacls: [defaultNacl('hub-nacl')],
          sgs: [{ id: 'hub-sg', inbound: [] }],
          nodes: [{ id: 'hub-1', name: 'hub-1', kind: 'instance', subnet: 'hub-priv', ip: '10.0.2.10', sgs: ['hub-sg'] }],
          nats: [{ id: 'nat-hub', subnet: 'hub-pub' }],
        },
        {
          id: 'spoke',
          name: 'Spoke VPC',
          cidr: '10.1.0.0/16',
          igw: false,
          subnets: [{ id: 'spoke-sub', cidr: '10.1.1.0/24', rt: 'spoke-rt' }],
          routeTables: [mainRt('spoke-main'), { id: 'spoke-rt', routes: [{ dest: any, target: 'pcx:pcx-hs' }] }],
          nacls: [defaultNacl('spoke-nacl')],
          sgs: [{ id: 'spoke-sg', inbound: [] }],
          nodes: [{ id: 'spoke-1', name: 'spoke-1', kind: 'instance', subnet: 'spoke-sub', ip: '10.1.1.10', sgs: ['spoke-sg'] }],
        },
      ],
      peerings: [{ id: 'pcx-hs', a: 'hub', b: 'spoke' }],
      attempt: { src: { kind: 'node', id: 'spoke-1' }, dst: { kind: 'internet', ip: '198.51.100.7', label: 'Public API' }, proto: 'tcp', port: 443 },
    },
  },
  {
    id: 'packet-tracer-021',
    type: pt,
    building: 'route-tariff',
    bullets: ['4.4-S3'],
    difficulty: 3,
    title: 'Borrowing the hub endpoint',
    story:
      'To avoid creating another endpoint, a spoke VPC sends its default route across a peering connection to a hub VPC that has a gateway endpoint for Amazon S3. A spoke server uploads an object over HTTPS.',
    data: {
      vpcs: [
        {
          id: 'hub',
          name: 'Hub VPC',
          cidr: '10.0.0.0/16',
          igw: false,
          subnets: [{ id: 'hub-sub', cidr: '10.0.1.0/24', rt: 'hub-rt' }],
          routeTables: [
            mainRt('hub-main'),
            { id: 'hub-rt', routes: [{ dest: 'pl:s3', target: 'vpce:vpce-s3' }, { dest: '10.1.0.0/16', target: 'pcx:pcx-hs' }] },
          ],
          nacls: [defaultNacl('hub-nacl')],
          sgs: [{ id: 'hub-sg', inbound: [] }],
          nodes: [{ id: 'hub-1', name: 'hub-1', kind: 'instance', subnet: 'hub-sub', ip: '10.0.1.10', sgs: ['hub-sg'] }],
          gwEps: [{ id: 'vpce-s3', service: 's3' }],
        },
        {
          id: 'spoke',
          name: 'Spoke VPC',
          cidr: '10.1.0.0/16',
          igw: false,
          subnets: [{ id: 'spoke-sub', cidr: '10.1.1.0/24', rt: 'spoke-rt' }],
          routeTables: [mainRt('spoke-main'), { id: 'spoke-rt', routes: [{ dest: any, target: 'pcx:pcx-hs' }] }],
          nacls: [defaultNacl('spoke-nacl')],
          sgs: [{ id: 'spoke-sg', inbound: [] }],
          nodes: [{ id: 'spoke-1', name: 'spoke-1', kind: 'instance', subnet: 'spoke-sub', ip: '10.1.1.10', sgs: ['spoke-sg'] }],
        },
      ],
      peerings: [{ id: 'pcx-hs', a: 'hub', b: 'spoke' }],
      attempt: { src: { kind: 'node', id: 'spoke-1' }, dst: { kind: 'service', service: 's3' }, proto: 'tcp', port: 443 },
    },
  },
  {
    id: 'packet-tracer-022',
    type: pt,
    building: 'route-tariff',
    bullets: ['4.4-K6'],
    difficulty: 3,
    title: 'Naming the group in the other VPC',
    story:
      'Two VPCs in one Region are peered, and both route tables point at the peering connection. The database security group in one VPC admits the application security group of the other by name. An application server connects.',
    data: {
      vpcs: [
        {
          id: 'a',
          name: 'App VPC',
          cidr: '10.0.0.0/16',
          igw: false,
          subnets: [{ id: 'app-sub', cidr: '10.0.1.0/24', rt: 'a-rt' }],
          routeTables: [mainRt('a-main'), { id: 'a-rt', routes: [{ dest: '10.1.0.0/16', target: 'pcx:pcx-ab' }] }],
          nacls: [defaultNacl('a-nacl')],
          sgs: [{ id: 'app-sg', inbound: [] }],
          nodes: [{ id: 'app-1', name: 'app-1', kind: 'instance', subnet: 'app-sub', ip: '10.0.1.10', sgs: ['app-sg'] }],
        },
        {
          id: 'b',
          name: 'Database VPC',
          cidr: '10.1.0.0/16',
          igw: false,
          subnets: [{ id: 'db-sub', cidr: '10.1.1.0/24', rt: 'b-rt' }],
          routeTables: [mainRt('b-main'), { id: 'b-rt', routes: [{ dest: '10.0.0.0/16', target: 'pcx:pcx-ab' }] }],
          nacls: [defaultNacl('b-nacl')],
          sgs: [{ id: 'db-sg', inbound: [tcp('sg:app-sg', 5432)] }],
          nodes: [{ id: 'db-1', name: 'db-1', kind: 'instance', subnet: 'db-sub', ip: '10.1.1.20', sgs: ['db-sg'] }],
        },
      ],
      peerings: [{ id: 'pcx-ab', a: 'a', b: 'b' }],
      attempt: { src: { kind: 'node', id: 'app-1' }, dst: { kind: 'node', id: 'db-1' }, proto: 'tcp', port: 5432 },
    },
  },
];

export default scenarios;
