import type { BuildingNotes } from '../../../src/content/types.ts';
import { b, cue, example } from '../../helpers.ts';

const notes: BuildingNotes = {
  building: 'surveyors-grid',
  overview: [
    b('Networking questions on the SAA exam assume you can read an address range and reason about which traffic a rule matches. That needs three basics: a {{term:cidr-block}} (a range of IP addresses), a {{term:protocol}} (the kind of traffic), and a {{term:port-range}} (which doors that traffic uses).',
      ['vpc-subnet-sizing', 'vpc-sg-rules'],
      ['vpc-subnet-sizing|The IP addresses for your subnets are represented using Classless Inter-Domain Routing (CIDR) notation.',
       'vpc-sg-rules|Protocol: The protocol to allow.',
       'vpc-sg-rules|Port range: For TCP, UDP, or a custom protocol, the range of ports to allow.'],
      { allow: ['three'] }),
    b('A VPC is given a CIDR block, and AWS allows blocks from a /16 netmask (65,536 IP addresses) down to a /28 netmask (16 IP addresses), so a /16 block holds many more addresses than a /28 block.',
      'vpc-cidr-blocks', ['The allowed block size is between a /16 netmask (65,536 IP addresses) and /28 netmask (16 IP addresses).']),
    b('When you create a VPC, AWS recommends choosing its CIDR block from the private IPv4 ranges defined in RFC 1918. These are `10.0.0.0/8`, `172.16.0.0/12` and `192.168.0.0/16`.',
      'vpc-cidr-blocks', ['we recommend that you specify a CIDR block from the private IPv4 address ranges as specified in RFC 1918',
        '10.0.0.0 - 10.255.255.255 (10/8 prefix)', '172.16.0.0 - 172.31.255.255 (172.16/12 prefix)', '192.168.0.0 - 192.168.255.255 (192.168/16 prefix)']),
    b('Each subnet takes a slice of the VPC block, slices must not overlap, and AWS keeps five addresses in every subnet for itself: the first four and the last one.',
      'vpc-subnet-sizing',
      ['If you create more than one subnet in a VPC, the CIDR blocks of the subnets cannot overlap.',
       'The first four IP addresses and the last IP address in each subnet CIDR block are not available for your use',
       'the following five IP addresses are reserved'],
      { allow: ['five'] }),
    b('Security group rules name a protocol and, for TCP and UDP, a port range. The most common protocols are TCP, UDP and ICMP, and a rule can allow a specific source or destination.',
      'vpc-sg-rules', ['The most common protocols are 6 (TCP), 17 (UDP), and 1 (ICMP).', 'You can grant access to a specific source or destination.']),
  ],
  bullets: [],
  cues: [
    cue('overlapping CIDR blocks', 'redesign the address plan: subnets in one VPC cannot overlap',
      b('If you create more than one subnet in a VPC, the CIDR blocks of the subnets cannot overlap.', 'vpc-subnet-sizing',
        ['If you create more than one subnet in a VPC, the CIDR blocks of the subnets cannot overlap.'])),
    cue('how many hosts fit in this subnet', 'subtract the five reserved addresses from the block size',
      b('The first four IP addresses and the last IP address of each subnet CIDR block cannot be assigned to a resource such as an EC2 instance.', 'vpc-subnet-sizing',
        ['The first four IP addresses and the last IP address in each subnet CIDR block are not available for your use, and they cannot be assigned to a resource'])),
  ],
  examples: [
    example('Splitting a VPC block into subnets', 'cidr',
      `
VPC                10.0.0.0/16     65,536 addresses
 Subnet public-a   10.0.0.0/24       256 addresses (5 reserved by AWS)
 Subnet public-b   10.0.1.0/24       256 addresses
 Subnet private-a  10.0.2.0/24       256 addresses
 Subnet private-b  10.0.3.0/24       256 addresses

Reserved in 10.0.0.0/24:
 10.0.0.0   network address
 10.0.0.1   VPC router
 10.0.0.2   DNS server (base of the VPC range plus two)
 10.0.0.3   reserved by AWS for future use
 10.0.0.255 network broadcast address (not supported in a VPC)
`,
      [
        b('The VPC block `10.0.0.0/16` is one of the RFC 1918 private ranges and holds 65,536 addresses at the largest size AWS allows.', 'vpc-cidr-blocks',
          ['The allowed block size is between a /16 netmask (65,536 IP addresses) and /28 netmask (16 IP addresses).',
           'we recommend that you specify a CIDR block from the private IPv4 address ranges as specified in RFC 1918']),
        b('Each `/24` subnet carves out 256 addresses, and none of the four subnets overlaps another. The AWS example for a `10.0.0.0/24` VPC says it supports 256 IP addresses and can be split into two subnets of 128.',
          'vpc-subnet-sizing', ['if you create a VPC with CIDR block 10.0.0.0/24, it supports 256 IP addresses.', 'You can break this CIDR block into two subnets, each supporting 128 IP addresses.'],
          { allow: ['four'] }),
        b('In any subnet, the first four addresses and the last are reserved. In `10.0.0.0/24` that is the network address, the VPC router, `.2` (the DNS server address, the base of the VPC range plus two), `.3` (reserved for future use) and the last address, so the usable count is the block size minus five.',
          'vpc-subnet-sizing', ['in a subnet with CIDR block 10.0.0.0/24, the following five IP addresses are reserved: 10.0.0.0: Network address.', '10.0.0.1: Reserved by AWS for the VPC router.',
           'The IP address of the DNS server is the base of the VPC network range plus two.', '10.0.0.3: Reserved by AWS for future use.',
           'The first four IP addresses and the last IP address in each subnet CIDR block are not available for your use'],
          { allow: ['five'] }),
        b('Worked sizes: a `/n` block holds 2 to the power (32 minus n) addresses, so a `/24` has 256 and a `/28` has 16. Subtract the five reserved addresses and a `/24` subnet leaves 251 usable addresses and a `/28` subnet leaves 11.',
          ['vpc-subnet-sizing', 'vpc-cidr-blocks'],
          ['vpc-subnet-sizing|if you create a VPC with CIDR block 10.0.0.0/24, it supports 256 IP addresses.',
           'vpc-cidr-blocks|The allowed block size is between a /16 netmask (65,536 IP addresses) and /28 netmask (16 IP addresses).'],
          { allow: ['32', '24', '28', '2', '251', '11', '5', 'five'] }),
      ]),
  ],
  confuse: [],
};

export default notes;
