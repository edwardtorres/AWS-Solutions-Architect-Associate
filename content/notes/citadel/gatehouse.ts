import type { BuildingNotes } from '../../../src/content/types.ts';
import { b, cue, example } from '../../helpers.ts';

const notes: BuildingNotes = {
  building: 'gatehouse',
  overview: [
    b('A {{term:vpc|VPC}} is your own logically isolated virtual network in AWS. Security inside it is built from four pieces: {{term:subnet|subnets}} that split the address space, {{term:route-table|route tables}} that decide where traffic goes, {{term:security-group|security groups}} on resources, and {{term:network-acl|network ACLs}} on subnets. A NAT gateway lets private resources reach out without letting the internet reach in.',
      ['vpc-how-it-works', 'vpc-route-tables', 'vpc-security-groups', 'vpc-nacls'],
      ['vpc-how-it-works|you can launch AWS resources in a logically isolated virtual network',
       'vpc-route-tables|Each route table contains a set of rules, called routes, that determine where network traffic from your subnet or gateway is directed.',
       'vpc-security-groups|A security group controls the traffic that is allowed to reach and leave the resources that it is associated with.',
       'vpc-nacls|A network access control list (ACL) allows or denies specific inbound or outbound traffic at the subnet level.'],
      { allow: ['four'] }),
  ],
  bullets: [
    {
      id: '1.2-K3',
      concepts: [
        b('Traffic is controlled by protocol, port range and source or destination. A security group rule has a protocol, a port range (for TCP and UDP) and a source (inbound) or destination (outbound); the most common protocols are TCP, UDP and ICMP.',
          'vpc-sg-rules',
          ['Protocol: The protocol to allow.', 'Port range: For TCP, UDP, or a custom protocol, the range of ports to allow.',
           'Source or destination: The source (inbound rules) or destination (outbound rules) for the traffic to allow.']),
        b('Security groups are stateful and allow-only. Network ACLs are stateless, have inbound and outbound rules that are numbered and evaluated from the lowest number, and can deny. A VPC comes with a default security group and a default network ACL.',
          ['vpc-security-groups', 'vpc-nacls'],
          ['vpc-security-groups|Security groups are stateful.', 'vpc-security-groups|When you create a VPC, it comes with a default security group.',
           'vpc-nacls|Network ACL rules A network ACL has inbound rules and outbound rules.', 'vpc-nacls|We evaluate the rules in order, starting with the lowest numbered rule, when deciding whether allow or deny traffic.']),
        b('Route tables send traffic by destination: each route has a destination (a CIDR block or prefix list) and a target such as an internet gateway, NAT gateway, VPC peering connection or VPN connection. The most specific matching route wins (the longest prefix match).',
          ['vpc-route-tables', 'vpc-route-priority'],
          ['vpc-route-tables|Each route specifies a destination (CIDR block or prefix list) and a target (such as an internet gateway, NAT gateway, VPC peering connection, or VPN connection).',
           'vpc-route-priority|In general, we direct traffic using the most specific route that matches the traffic.']),
      ],
      services: ['Amazon VPC'],
      design: [
        b('A typical secure pattern: the load balancer\'s security group accepts web traffic, the application tier\'s security group accepts traffic only from the load balancer\'s group, and the database tier\'s group accepts traffic only from the application tier. Rules that reference another security group follow the instances as they scale.',
          'vpc-sg-rules', ['When you specify a security group as the source or destination for a rule, the rule affects all instances that are associated with the security groups.']),
      ],
    },
    {
      id: '1.2-S1',
      concepts: [
        b('An internet gateway is a horizontally scaled, redundant and highly available VPC component that allows communication between your VPC and the internet. It provides a route-table target for internet-routable traffic, and resources in public subnets reach the internet through it if they have a public IPv4 or IPv6 address.',
          'vpc-igw',
          ['An internet gateway is a horizontally scaled, redundant, and highly available VPC component that allows communication between your VPC and the internet.',
           'An internet gateway provides a target in your VPC route tables for internet-routable traffic.',
           'An internet gateway enables resources in your public subnets (such as EC2 instances) to connect to the internet if the resource has a public IPv4 address or an IPv6 address.']),
        b('A NAT gateway lets instances in a private subnet connect to services outside the VPC while external services cannot initiate a connection to them. A public NAT gateway lives in a public subnet and needs an Elastic IP address.',
          'vpc-nat-gateway',
          ["You can use a NAT gateway so that instances in a private subnet can connect to services outside your VPC but external services can't initiate a connection with those instances.",
           'You create a public NAT gateway in a public subnet and must associate an Elastic IP address with the NAT gateway at creation.']),
        b('Each NAT gateway is created in one Availability Zone with redundancy in that zone. If resources in several zones share one NAT gateway and its zone goes down, resources in the other zones lose internet access, so AWS suggests a NAT gateway per zone with matching routing.',
          'vpc-nat-basics',
          ['Each NAT gateway is created in a specific Availability Zone and implemented with redundancy in that zone.',
           "If you have resources in multiple Availability Zones and they share one NAT gateway, and if the NAT gateway's Availability Zone is down, resources in the other Availability Zones lose internet access.",
           'To improve resiliency, create a NAT gateway in each Availability Zone, and configure your routing to ensure that resources use the NAT gateway in the same Availability Zone.']),
      ],
      services: ['Amazon VPC'],
      design: [
        b('Putting these together: public subnets hold the load balancers and NAT gateways (they route to an internet gateway); private subnets hold application and database tiers (they route outbound traffic to a NAT gateway and have no direct route to the internet gateway).',
          ['vpc-subnets', 'vpc-route-options'],
          ['vpc-subnets|Public subnet – The subnet has a direct route to an internet gateway.',
           'vpc-subnets|Private subnet – The subnet does not have a direct route to an internet gateway.',
           'vpc-route-options|Then add a route for the private subnet\'s route table that routes IPv4 internet traffic (0.0.0.0/0) to the NAT device.']),
      ],
    },
    {
      id: '1.2-S2',
      concepts: [
        b('A public subnet has a direct route to an internet gateway and its resources can access the public internet; a private subnet has no direct route to an internet gateway. The route table, not the address range, is what makes a subnet public or private.',
          'vpc-subnets',
          ['Public subnet – The subnet has a direct route to an internet gateway.', 'Resources in a public subnet can access the public internet.',
           'Private subnet – The subnet does not have a direct route to an internet gateway.']),
        b('Each subnet must reside entirely within one Availability Zone and cannot span zones, so a multi-AZ design uses one subnet per tier per zone.',
          'vpc-subnets', ['Each subnet must reside entirely within one Availability Zone and cannot span zones.']),
        b('A subnet can be associated with only one network ACL at a time, while the network ACL rules apply to the subnet as a whole.',
          'vpc-nacls', ['However, a subnet can be associated with only one network ACL at a time.']),
      ],
      services: ['Amazon VPC'],
      design: [
        b('Segment by function and exposure: public subnets for internet-facing entry points, private subnets for applications, and a data tier with no route to the internet at all. Use security groups to limit east-west traffic between tiers and network ACLs as a coarse subnet-level layer.',
          ['vpc-subnets', 'vpc-nacls'],
          ['vpc-subnets|Private subnet – The subnet does not have a direct route to an internet gateway.',
           'vpc-nacls|Custom network ACLs add an additional layer of security to your VPC.']),
      ],
    },
  ],
  cues: [
    cue('allow only specific ports and protocols to an instance', 'a security group',
      b('A security group controls traffic that reaches and leaves the resources it is associated with, by protocol, port range and source or destination.', 'vpc-sg-rules',
        ['Port range: For TCP, UDP, or a custom protocol, the range of ports to allow.'])),
    cue('explicitly block a specific IP address or range', 'a network ACL deny rule (security groups cannot deny)',
      b('Security groups have allow rules only; a network ACL can allow or deny.', 'vpc-sg-rules', ['You can specify allow rules, but not deny rules.'])),
    cue('instances in a private subnet need to download updates but must not be reachable from the internet', 'a NAT gateway in a public subnet',
      b('A NAT gateway lets private-subnet instances connect out while external services cannot initiate a connection to them.', 'vpc-nat-gateway',
        ["external services can't initiate a connection with those instances"])),
    cue('public subnet', 'route to an internet gateway',
      b('A public subnet has a direct route to an internet gateway.', 'vpc-subnets', ['Public subnet – The subnet has a direct route to an internet gateway.'])),
    cue('NAT gateway outage in one AZ takes down internet access for other AZs', 'one NAT gateway per Availability Zone',
      b('AWS recommends creating a NAT gateway in each Availability Zone and routing to the one in the same zone.', 'vpc-nat-basics',
        ['To improve resiliency, create a NAT gateway in each Availability Zone, and configure your routing to ensure that resources use the NAT gateway in the same Availability Zone.'])),
  ],
  examples: [
    example('Three-tier security group rules', 'rules',
      `
sg-alb   (load balancer)
  inbound   TCP 443   source 0.0.0.0/0
  outbound  TCP 8080  destination sg-app

sg-app   (application servers)
  inbound   TCP 8080  source sg-alb
  outbound  TCP 5432  destination sg-db

sg-db    (database)
  inbound   TCP 5432  source sg-app
`,
      [
        b('Each rule names a protocol, a port range, and a source (inbound) or destination (outbound). Here every rule allows TCP on one port.', 'vpc-sg-rules',
          ['Protocol: The protocol to allow.', 'Port range: For TCP, UDP, or a custom protocol, the range of ports to allow.']),
        b('`sg-app` accepts traffic only from `sg-alb`, and `sg-db` only from `sg-app`. Referencing a security group as the source makes the rule apply to every instance associated with that group, so it keeps working as instances are added or replaced.', 'vpc-sg-rules',
          ['When you specify a security group as the source or destination for a rule, the rule affects all instances that are associated with the security groups.']),
        b('Nothing in this set denies anything: security groups cannot. Anything not explicitly allowed is simply not permitted, and because security groups are stateful, replies to allowed traffic need no extra rule.', 'vpc-security-groups',
          ['Security groups are stateful.']),
        b('Illustrative only: the ports and group names are made up for this example. The AWS documentation explains the rule components in detail.', 'vpc-sg-rules',
          ['Components of a security group rule The following are the components of inbound and outbound security group rules']),
      ]),
    example('Route tables for a public and a private subnet', 'routes',
      `
Route table: public-subnets
  Destination      Target
  0.0.0.0/0        igw-<ID>          (internet gateway)

Route table: private-subnets
  Destination      Target
  0.0.0.0/0        nat-<ID>          (NAT gateway in a public subnet)
`,
      [
        b('Each route is a destination (a CIDR block) and a target. A route of `0.0.0.0/0` to an internet gateway is what gives a subnet its internet path, so subnets using this table are public.', ['vpc-route-options', 'vpc-route-tables'],
          ['vpc-route-options|To do this, create and attach an internet gateway to your VPC, and then add a route with a destination of 0.0.0.0/0 for IPv4 traffic or ::/0 for IPv6 traffic, and a target of the internet gateway ID',
           'vpc-route-tables|Each route specifies a destination (CIDR block or prefix list) and a target']),
        b('For the private subnets, the default route points to a NAT device in a public subnet, so instances there can reach the internet but cannot be reached from it.', 'vpc-route-options',
          ["Then add a route for the private subnet's route table that routes IPv4 internet traffic (0.0.0.0/0) to the NAT device."]),
        b('When more than one route matches, the most specific one wins (the longest prefix match), which is why a `10.10.2.15/32` route beats a `10.10.2.0/24` route.', 'vpc-route-priority',
          ['Longest prefix (for example, 10.10.2.15/32 has priority over 10.10.2.0/24)']),
        b('Illustrative only: `<ID>` stands for a real gateway identifier. The table omits routes AWS manages for you.', 'vpc-route-tables',
          ['You can create additional route tables for your VPC, so that you have more granular control over the network paths for your VPC.']),
      ]),
    example('A network ACL that blocks one address range', 'rules',
      `
Inbound rules
  Rule #   Type        Protocol  Port   Source            Allow/Deny
  100      HTTPS       TCP       443    203.0.113.0/24    DENY
  200      HTTPS       TCP       443    0.0.0.0/0         ALLOW
  *        All traffic All       All    0.0.0.0/0         DENY
`,
      [
        b('Rules are evaluated starting with the lowest number, and once a rule matches no further rules are evaluated. The `DENY` at rule `100` is checked before the broader `ALLOW` at rule `200`, so that range is blocked while everyone else is allowed.', 'vpc-nacls',
          ['We evaluate the rules in order, starting with the lowest numbered rule, when deciding whether allow or deny traffic.',
           'If the traffic matches a rule, the rule is applied and we do not evaluate any additional rules.']),
        b('Rule numbers can range from 1 to 32766.', 'vpc-nacls', ['Each rule has a number from 1 to 32766.']),
        b('Because network ACLs are stateless, this table only covers inbound traffic. Responses to allowed inbound traffic are not automatically allowed, so a real subnet also needs outbound rules.', 'vpc-nacls',
          ['If, for example, you create a NACL rule to allow specific inbound traffic to a subnet, responses to that traffic are not automatically allowed.']),
        b('Illustrative only: `203.0.113.0/24` is a documentation range standing in for the addresses to block. Network ACLs apply to the subnet and a subnet has one network ACL at a time.', 'vpc-nacls',
          ['However, a subnet can be associated with only one network ACL at a time.']),
      ]),
  ],
  confuse: ['sg-vs-nacl'],
  azure: [
    {
      concept: 'Network security groups (NSGs)',
      aws: 'Security groups and network ACLs',
      mapping: b('The Learn networking page pairs security groups with Azure network security groups: Azure NSGs are stateful and can be applied at the subnet or network-interface level.',
        ['learn-networking', 'vpc-security-groups'],
        ['learn-networking|Azure uses stateful network security groups (NSGs), which can be applied at the subnet or NIC level',
         'vpc-security-groups|Security groups are stateful.']),
      breaks: b('One Azure concept covers two AWS ones. An NSG can be applied at the subnet or NIC level, whereas AWS splits the roles: a security group is per resource and allow-only, and a network ACL is per subnet, stateless and can deny. Expect AWS questions that depend on that split.',
        ['learn-networking', 'vpc-nacls', 'vpc-sg-rules'],
        ['learn-networking|can be applied at the subnet or NIC level', 'vpc-nacls|NACLs are stateless, which means that information about previously sent or received traffic is not saved.',
         'vpc-sg-rules|You can specify allow rules, but not deny rules.'],
        { allow: ['two'] }),
    },
    {
      concept: 'Azure Virtual Network and subnets',
      aws: 'Amazon VPC and subnets',
      mapping: b('Azure virtual networks and AWS VPCs are similar in that both provide isolated, logically defined network spaces.',
        ['learn-networking', 'vpc-how-it-works'],
        ['learn-networking|Azure virtual networks and AWS virtual private clouds (VPCs) are similar in that they both provide isolated, logically defined network spaces within their respective cloud platforms.',
         'vpc-how-it-works|you can launch AWS resources in a logically isolated virtual network']),
      breaks: b('Subnet placement differs. In AWS each subnet is bound to a single Availability Zone, so zonal redundancy needs one subnet per zone; in Azure a subnet is a regional construct that spans all availability zones in the region. This changes how you draw a multi-AZ design.',
        ['learn-networking', 'vpc-subnets'],
        ['learn-networking|In AWS, each subnet is bound to a single Availability Zone, so achieving zonal redundancy requires creating one subnet per Availability Zone.',
         'learn-networking|In Azure, a subnet is a regional construct that spans all availability zones in the region.',
         'vpc-subnets|Each subnet must reside entirely within one Availability Zone and cannot span zones.']),
    },
    {
      concept: 'User Defined Routes',
      aws: 'Route tables',
      mapping: b('Azure uses user-defined routes where AWS uses route tables: both direct traffic to a next hop by destination. In AWS each route has a destination CIDR block or prefix list and a target such as an internet gateway or NAT gateway.',
        ['learn-networking', 'vpc-route-tables'],
        ['learn-networking|Custom Route Tables', 'vpc-route-tables|Each route specifies a destination (CIDR block or prefix list) and a target (such as an internet gateway, NAT gateway, VPC peering connection, or VPN connection).']),
      breaks: b('In AWS a route table is explicitly associated with subnets (or a gateway), and the most specific matching route wins. Check the longest-prefix rule when a question has overlapping destinations.',
        ['vpc-route-priority', 'learn-networking'],
        ['vpc-route-priority|In general, we direct traffic using the most specific route that matches the traffic.', 'learn-networking|User Defined Routes']),
    },
  ],
};

export default notes;
