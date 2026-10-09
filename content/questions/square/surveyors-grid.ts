import type { Question } from '../../../src/content/types.ts';
import { mc, mr } from '../helpers.ts';

const questions: Question[] = [
  mc({
    id: 'surveyors-grid-001',
    building: 'surveyors-grid',
    d: 1,
    stem: 'A company is creating a new VPC for a large analytics platform. It wants a single IPv4 CIDR block with the HIGHEST number of addresses that a VPC allows. Which CIDR block should the architect specify?',
    correct: ['10.0.0.0/16', 'A /16 netmask is the largest block size a VPC accepts, with 65,536 addresses.'],
    wrong: [
      ['10.0.0.0/8', 'A /8 block would hold more addresses, but it is larger than the largest block size a VPC allows.'],
      ['10.0.0.0/24', 'A /24 block holds only 256 addresses, far fewer than a /16 block, so it does not meet the requirement for the highest number.'],
      ['10.0.0.0/28', 'A /28 block is the smallest size a VPC allows, with 16 addresses, which is the opposite of the requirement.'],
    ],
    slot: 0,
    evidence: ['vpc-cidr-blocks|The allowed block size is between a /16 netmask (65,536 IP addresses) and /28 netmask (16 IP addresses).'],
  }),
  mc({
    id: 'surveyors-grid-002',
    building: 'surveyors-grid',
    d: 1,
    stem: 'A company is creating a VPC and wants to follow the documented recommendation to use a private IPv4 range defined in RFC 1918. Which CIDR block BEST meets this recommendation?',
    correct: ['172.20.0.0/16', 'The block lies inside 172.16.0.0 to 172.31.255.255, the 172.16.0.0/12 private range from RFC 1918.'],
    wrong: [
      ['172.32.0.0/16', 'The 172.16.0.0/12 private range ends at 172.31.255.255, so this block is outside RFC 1918 and is publicly routable address space.'],
      ['192.169.0.0/16', 'The private range is 192.168.0.0/16, so 192.169.0.0/16 is outside RFC 1918.'],
      ['11.0.0.0/16', 'The private range is 10.0.0.0/8, so a block starting at 11 is outside RFC 1918.'],
    ],
    slot: 1,
    evidence: [
      'vpc-cidr-blocks|When you create a VPC, we recommend that you specify a CIDR block from the private IPv4 address ranges as specified in RFC 1918.',
      'vpc-cidr-blocks|172.16.0.0 - 172.31.255.255 (172.16/12 prefix)',
    ],
  }),
  mr({
    id: 'surveyors-grid-003',
    building: 'surveyors-grid',
    d: 2,
    stem: 'A company\'s automation script assigns static private IP addresses to EC2 instances in a subnet with the CIDR block 10.0.4.0/24. Which TWO addresses are reserved and cannot be assigned to an instance? (Choose two.)',
    correct: [
      ['10.0.4.2', 'It is one of the first four addresses of the subnet (the DNS server address is the base of the range plus two), which is reserved.'],
      ['10.0.4.255', 'It is the last address in the subnet CIDR block, which is reserved.'],
    ],
    wrong: [
      ['10.0.4.4', 'Only the first four addresses (.0 to .3) are reserved, so .4 is the first address an instance can use.'],
      ['10.0.4.100', 'It sits in the middle of the range and is available to instances.'],
      ['10.0.4.254', 'Only the very last address (.255) is reserved at the end of the block, so .254 is available to instances.'],
    ],
    slots: [1, 4],
    evidence: [
      'vpc-subnet-sizing|The first four IP addresses and the last IP address in each subnet CIDR block are not available for your use, and they cannot be assigned to a resource, such as an EC2 instance.',
      'vpc-subnet-sizing|The IP address of the DNS server is the base of the VPC network range plus two.',
    ],
  }),
  mc({
    id: 'surveyors-grid-004',
    building: 'surveyors-grid',
    d: 2,
    stem: 'A company is adding a subnet to an existing VPC for a fleet of 30 EC2 instances that each need one private IPv4 address. The subnet should be no larger than necessary. Which subnet CIDR block is the MINIMUM size that meets these requirements?',
    correct: ['10.0.8.0/26', 'A /26 block has 64 addresses, and after the 5 reserved ones 59 remain, enough for 30 instances.'],
    wrong: [
      ['10.0.8.0/28', 'A /28 block has 16 addresses, and only 11 remain after the reserved ones, which is fewer than 30.'],
      ['10.0.8.0/27', 'A /27 block has 32 addresses, but after the 5 reserved ones only 27 remain, which is fewer than 30.'],
      ['10.0.8.0/25', 'A /25 block has 128 addresses and would work, but it is larger than the minimum that meets the requirement.'],
    ],
    slot: 2,
    evidence: [
      'vpc-subnet-sizing|The first four IP addresses and the last IP address in each subnet CIDR block are not available for your use, and they cannot be assigned to a resource, such as an EC2 instance.',
      'vpc-cidr-blocks|The allowed block size is between a /16 netmask (65,536 IP addresses) and /28 netmask (16 IP addresses).',
    ],
  }),
  mc({
    id: 'surveyors-grid-005',
    building: 'surveyors-grid',
    d: 2,
    stem: 'A VPC has the CIDR block 10.0.0.0/16 and already contains the subnets 10.0.0.0/24 and 10.0.1.0/24. An architect must add a third subnet to the same VPC. Which subnet CIDR block can the architect use?',
    correct: ['10.0.2.0/24', 'It is a subset of the VPC block and does not overlap either existing subnet.'],
    wrong: [
      ['10.0.0.128/25', 'It lies inside 10.0.0.0/24, and the CIDR blocks of subnets in one VPC cannot overlap.'],
      ['10.0.1.0/24', 'It is identical to an existing subnet, so it overlaps, which is not allowed.'],
      ['10.1.0.0/24', 'It is outside the 10.0.0.0/16 VPC block; a subnet block must be the same as or a subset of the VPC block.'],
    ],
    slot: 3,
    evidence: [
      'vpc-subnet-sizing|The CIDR block of a subnet can be the same as the CIDR block for the VPC (to create a single subnet in the VPC), or a subset of the CIDR block for the VPC (to create multiple subnets in the VPC).',
      'vpc-subnet-sizing|If you create more than one subnet in a VPC, the CIDR blocks of the subnets cannot overlap.',
    ],
  }),
  mc({
    id: 'surveyors-grid-006',
    building: 'surveyors-grid',
    d: 3,
    stem: 'A company runs workloads in a VPC whose primary CIDR block is 10.0.0.0/24, and every subnet is almost out of free IP addresses. The company must add room for many more EC2 instances with the LEAST disruption to the running workloads. Which solution meets these requirements?',
    correct: ['Associate the additional CIDR block 10.2.0.0/16 with the VPC and create new subnets in it', 'The VPC keeps running and the new block adds address space, so the existing workloads are not touched.'],
    wrong: [
      ['Edit the VPC to change its primary CIDR block from /24 to /16', 'The size of an existing CIDR block cannot be increased or decreased.'],
      ['Disassociate the primary CIDR block and associate a larger block in its place', 'The primary CIDR block the VPC was created with cannot be disassociated.'],
      ['Create a new VPC with a larger CIDR block and migrate every workload to it', 'It would give the space, but moving every workload is the most disruptive option.'],
    ],
    slot: 0,
    evidence: [
      'vpc-cidr-blocks|After you\'ve created your VPC, you can associate additional IPv4 CIDR blocks with the VPC.',
      'vpc-cidr-blocks|You cannot increase or decrease the size of an existing CIDR block.',
      'vpc-cidr-blocks|you cannot disassociate the CIDR block with which you originally created the VPC (the primary CIDR block)',
    ],
  }),
  mc({
    id: 'surveyors-grid-007',
    building: 'surveyors-grid',
    d: 2,
    stem: 'A company runs a Linux bastion host on EC2. Only administrators on the corporate network 198.51.100.0/24 should be able to connect over SSH. Which inbound security group rule is the MOST secure way to meet this requirement?',
    correct: ['Protocol TCP, port 22, source 198.51.100.0/24', 'SSH uses TCP port 22, and limiting the source to the corporate CIDR range allows only those administrators.'],
    wrong: [
      ['Protocol TCP, port 22, source 0.0.0.0/0', 'SSH would work, but every address on the internet could reach the port, which is less secure than the corporate range.'],
      ['Protocol UDP, port 22, source 198.51.100.0/24', 'SSH runs over TCP, so a UDP rule would not allow the administrators to connect.'],
      ['Protocol TCP, port 3389, source 198.51.100.0/24', 'Port 3389 is the Remote Desktop port, so an SSH connection on port 22 is still blocked.'],
    ],
    slot: 1,
    evidence: [
      'vpc-sg-rules|Port range: For TCP, UDP, or a custom protocol, the range of ports to allow.',
      'vpc-sg-rules|Source or destination: The source (inbound rules) or destination (outbound rules) for the traffic to allow.',
    ],
  }),
  mc({
    id: 'surveyors-grid-008',
    building: 'surveyors-grid',
    d: 2,
    stem: 'Administrators can connect to an EC2 instance over SSH but cannot ping it from the corporate network 198.51.100.0/24. The instance security group allows inbound TCP port 22 from that range and still has its default outbound rule. Which change allows ping with the LEAST additional exposure?',
    correct: ['Add an inbound ICMP Echo Request rule with the source 198.51.100.0/24', 'Ping uses ICMP, and limiting the source to the corporate range opens the instance to no other addresses.'],
    wrong: [
      ['Add an inbound UDP rule for all ports with the source 198.51.100.0/24', 'Ping is carried by ICMP, not UDP, so this opens many ports and still does not allow ping.'],
      ['Add an inbound ICMP Echo Request rule with the source 0.0.0.0/0', 'It would allow ping, but it exposes the instance to ping from every address, not only the corporate range.'],
      ['Add an outbound ICMP rule with the destination 198.51.100.0/24', 'The incoming echo request is what is blocked, and the default outbound rule already allows all outbound traffic.'],
    ],
    slot: 2,
    evidence: [
      'vpc-sg-rules|The most common protocols are 6 (TCP), 17 (UDP), and 1 (ICMP).',
      'vpc-sg-rules|For example, use type 8 for ICMP Echo Request or type 128 for ICMPv6 Echo Request.',
      'vpc-sg-rules|When you first create a security group, it has an outbound rule that allows all outbound traffic from the resource.',
    ],
  }),
  mc({
    id: 'surveyors-grid-009',
    building: 'surveyors-grid',
    d: 3,
    stem: 'A company has two VPCs in different accounts, and both use the primary CIDR block 10.0.0.0/16. The company needs a VPC peering connection between them and is able to rebuild one of the VPCs. Which solution BEST meets these requirements?',
    correct: ['Create a replacement VPC in one account with a non-overlapping CIDR block, migrate its resources, and peer the VPCs', 'Peering requires VPCs with no matching or overlapping CIDR blocks, and a replacement VPC removes the overlap.'],
    wrong: [
      ['Associate the secondary CIDR block 10.1.0.0/16 with one VPC and peer using only that range', 'Peering fails if any CIDR block overlaps, and the 10.0.0.0/16 primary blocks still overlap.'],
      ['Create the peering connection and add route table entries for 10.0.0.0/16 in both VPCs', 'The connection cannot be created while the CIDR blocks overlap, so routes have nothing to use.'],
      ['Create the peering connection and open the ports in the security groups of both VPCs', 'Security group rules do not change the CIDR overlap that blocks the peering connection.'],
    ],
    slot: 3,
    evidence: [
      'peering-basics|You cannot create a VPC peering connection between VPCs that have matching or overlapping IPv4 or IPv6 CIDR blocks.',
      'peering-basics|If you have multiple IPv4 CIDR blocks, you can\'t create a VPC peering connection if any of the CIDR blocks overlap, even if you intend to use only the non-overlapping CIDR blocks or only IPv6 CIDR blocks.',
    ],
  }),
  mr({
    id: 'surveyors-grid-010',
    building: 'surveyors-grid',
    d: 3,
    stem: 'A company has a VPC with the CIDR block 10.0.0.0/16 and needs two new, non-overlapping subnets. Each subnet must provide at least 500 usable IPv4 addresses for instances. Which TWO CIDR blocks can the architect assign to the two subnets? (Choose two.)',
    correct: [
      ['10.0.0.0/23', 'A /23 block has 512 addresses, and 507 remain after the 5 reserved ones, which is at least 500.'],
      ['10.0.2.0/23', 'A /23 block leaves 507 usable addresses, and it does not overlap 10.0.0.0/23.'],
    ],
    wrong: [
      ['10.0.4.0/24', 'A /24 block has 256 addresses and 251 usable ones, which is fewer than 500.'],
      ['10.0.8.0/24', 'A /24 block leaves only 251 usable addresses, which is fewer than 500.'],
      ['10.1.0.0/23', 'It is large enough, but it is outside the 10.0.0.0/16 VPC block, and a subnet block must be a subset of the VPC block.'],
    ],
    slots: [0, 3],
    evidence: [
      'vpc-subnet-sizing|The first four IP addresses and the last IP address in each subnet CIDR block are not available for your use, and they cannot be assigned to a resource, such as an EC2 instance.',
      'vpc-subnet-sizing|If you create more than one subnet in a VPC, the CIDR blocks of the subnets cannot overlap.',
    ],
  }),
];

export default questions;
