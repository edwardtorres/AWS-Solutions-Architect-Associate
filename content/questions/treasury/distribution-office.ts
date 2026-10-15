import type { Question } from '../../../src/content/types.ts';
import { mc, mr } from '../helpers.ts';

const questions: Question[] = [
  mc({
    id: 'distribution-office-001',
    building: 'distribution-office',
    bullets: ['4.2-K3'],
    d: 1,
    stem: 'A company will run a nightly analytics batch on Amazon EC2. No users wait for the results, no law restricts where the data may be stored, and every required service is offered in several AWS Regions. Which approach to selecting the Region is the MOST cost-effective?',
    correct: ['Deploy in the Region that offers the lowest prices for the services the batch uses', 'Resource pricing differs between Regions, and AWS advises using Regions with lower prices when there are no data privacy, security or business obligations.'],
    wrong: [
      ['Deploy in the Region closest to the company headquarters to give the lowest network latency', 'No users wait for the results, so lower latency adds nothing, and prices still differ between Regions.'],
      ['Deploy in the Region that has the largest number of Availability Zones available to the account', 'The number of zones does not address the price of the services, which is the only differentiator here.'],
      ['Deploy in the Region where the company already stores its oldest backups from earlier projects', 'The batch has no requirement to sit near old backups, so price is left unconsidered.'],
    ],
    slot: 0,
    evidence: [
      'waf-region-cost|Each AWS Region operates within local market conditions, and resource pricing is different in each Region due to differences in the cost of land, fiber, electricity, and taxes, for example.',
      'waf-region-cost|Use Regions that provide lower prices for AWS services to deploy your workloads if you have no obligations in data privacy, security and business requirements.',
    ],
  }),
  mc({
    id: 'distribution-office-002',
    building: 'distribution-office',
    bullets: ['4.2-S4'],
    d: 2,
    stem: 'A software team uses an Amazon RDS for PostgreSQL DB instance and several Amazon EC2 instances for a test environment only from Monday morning to Friday evening. The data in the database must be kept over the weekend. Which action is the MOST cost-effective?',
    correct: ['Stop the DB instance and the EC2 instances on Friday evening and start them again on Monday morning', 'No DB instance hours or EC2 instance usage are charged while the resources are stopped, and the stored data is kept.'],
    wrong: [
      ['Delete the DB instance every Friday evening and create a new empty one on Monday morning', 'The data in the database would not be kept over the weekend.'],
      ['Convert the DB instance to a Multi-AZ deployment so that a standby handles the weekend', 'A standby adds a second copy to pay for and does nothing to stop charges while nobody uses the environment.'],
      ['Leave all the resources running and buy a Compute Savings Plan to cover the EC2 instances', 'The weekend hours of the database and instances are still paid for, although nobody uses the environment.'],
    ],
    slot: 1,
    evidence: [
      'rds-stop|While the instance is stopped, you\'re not charged for DB instance hours.',
      'rds-stop|While your DB instance is stopped, you are charged for provisioned storage (including Provisioned IOPS).',
      'ec2-lifecycle|You are not charged for usage or data transfer fees for your instance when it is stopped.',
    ],
  }),
  mc({
    id: 'distribution-office-003',
    building: 'distribution-office',
    bullets: ['4.2-K3', '4.2-S4'],
    d: 2,
    stem: 'A company is deploying an order-processing system. The production database must keep running automatically if the Availability Zone that hosts it fails. A staging copy of the system is used only for release testing, and a few minutes of downtime after a failure is acceptable there. Which design is the MOST cost-effective?',
    correct: ['Run the production database as a Multi-AZ DB instance deployment and the staging database as a Single-AZ DB instance', 'Production gets a synchronous standby in a different Availability Zone, while staging avoids paying for redundancy that its availability needs do not require.'],
    wrong: [
      ['Run both the production database and the staging database as Multi-AZ DB instance deployments', 'Staging would pay for a standby that its relaxed availability needs do not require.'],
      ['Run both databases as Single-AZ DB instances and restore from automated backups after a failure', 'Production would not fail over automatically when its Availability Zone fails.'],
      ['Run production as a Single-AZ DB instance with a read replica in another Region and staging as Multi-AZ', 'Production would not fail over automatically, and staging would pay for a standby it does not need.'],
    ],
    slot: 2,
    evidence: [
      'rds-multi-az-instance|In a Multi-AZ DB instance deployment, Amazon RDS automatically provisions and maintains a synchronous standby replica in a different Availability Zone.',
      'waf-cost-demand|The economic benefits of just-in-time supply should be balanced against the need to provision to account for resource failures, high availability, and provision time.',
    ],
  }),
  mc({
    id: 'distribution-office-004',
    building: 'distribution-office',
    bullets: ['4.2-K6'],
    d: 1,
    stem: 'A hospital must process medical-imaging data inside its own data center to meet local latency and data-handling rules. IT staff want the same APIs, tools and services such as Amazon EC2 that they use in the AWS Region, and they want AWS to operate the infrastructure. Which service BEST meets these requirements?',
    correct: ['AWS Outposts installed in the hospital data center', 'Outposts extends AWS infrastructure, services, APIs and tools to customer premises, with AWS operating the capacity as part of an AWS Region.'],
    wrong: [
      ['AWS Local Zones in the nearest large city', 'A Local Zone places resources close to population centers but not in the hospital data center, so the data would not be processed on site.'],
      ['AWS Wavelength Zones in the mobile carrier network', 'Wavelength puts compute at the edge of carrier networks, not inside the hospital data center.'],
      ['Amazon EC2 instances in the nearest Region reached over a dedicated network connection', 'The imaging data would be processed in the Region rather than locally inside the data center.'],
    ],
    slot: 3,
    evidence: [
      'outposts-what-is|AWS Outposts is a fully managed service that extends AWS infrastructure, services, APIs, and tools to customer premises.',
      'outposts-what-is|AWS operates, monitors, and manages this capacity as part of an AWS Region.',
    ],
  }),
  mc({
    id: 'distribution-office-005',
    building: 'distribution-office',
    bullets: ['4.2-K5'],
    d: 2,
    stem: "A company is building an augmented-reality app for smartphones on a mobile carrier's 5G network. The app needs the lowest possible latency between the phones and its Amazon EC2 servers, and the servers must still reach AWS services such as Amazon S3 in the parent Region. Which solution BEST meets these requirements?",
    correct: ['Extend the VPC to a Wavelength Zone and run the servers on EC2 instances in that zone', "Wavelength deploys AWS compute at the edge of communications service providers' networks, and servers there can reach services in the parent Region."],
    wrong: [
      ['Install AWS Outposts in the data center of the company and run the servers there', "The phones connect through the carrier network, and Outposts sits on the company's premises rather than at the carrier edge."],
      ['Run the servers in an AWS Local Zone near a large population center', 'A Local Zone sits near population and industry centers, not at the edge of the carrier network that the phones use.'],
      ['Serve the app through Amazon CloudFront edge locations with the servers in the parent Region as origin', 'CloudFront caches content at edge locations, but the live app servers would still run in the Region, away from the carrier network.'],
    ],
    slot: 0,
    evidence: [
      'wavelength-what-is|Wavelength deploys standard AWS compute and storage services to the edge of communications service providers\' (CSP) networks.',
      'wavelength-what-is|You can extend a virtual private cloud (VPC) to one or more Wavelength Zones.',
    ],
  }),
  mc({
    id: 'distribution-office-006',
    building: 'distribution-office',
    bullets: ['4.2-K5'],
    d: 2,
    stem: 'A software vendor distributes large installer files that are identical for every user from Amazon EC2 instances behind an Application Load Balancer in one Region. Downloads peak after each release, and the vendor keeps adding instances to cope. Customers are spread worldwide. The vendor wants to reduce the load on the origin and shorten downloads without running servers in more Regions. Which solution is the MOST cost-effective?',
    correct: ['Serve the files through Amazon CloudFront with the load balancer as the origin', 'CloudFront delivers cached content from edge locations with the lowest latency and goes to the origin only when the file is not already cached.'],
    wrong: [
      ['Deploy the instance fleet and load balancer in more Regions and use latency-based routing', 'The vendor would run full fleets in more Regions, which is exactly what it wants to avoid.'],
      ['Move the instances to AWS Wavelength Zones in carrier networks', 'Wavelength serves mobile devices on carrier networks, and the fleet would still serve every download.'],
      ['Move the instances to an AWS Local Zone and keep serving every download from them', 'Customers are worldwide, and every download would still hit the instances instead of a cache.'],
    ],
    slot: 1,
    evidence: [
      'cloudfront-what-is|If the content is already in the edge location with the lowest latency, CloudFront delivers it immediately.',
      'cloudfront-what-is|CloudFront delivers your content through a worldwide network of data centers called edge locations.',
    ],
  }),
  mr({
    id: 'distribution-office-007',
    building: 'distribution-office',
    bullets: ['4.2-K3', '4.2-S4'],
    d: 3,
    stem: 'A company runs production and QA copies of a web application. Each is an Auto Scaling group of Amazon EC2 instances behind an Application Load Balancer, spread across three Availability Zones with a minimum of six instances. QA is used only from 08:00 to 18:00 on weekdays, and the QA team accepts that QA is unavailable until repaired if one Availability Zone fails. Production must keep its current availability. Which TWO changes lower the cost of QA MOST cost-effectively without changing production? (Choose two.)',
    correct: [
      ['Add scheduled actions to the QA group that lower its desired capacity outside weekday working hours', 'Scheduled actions increase or decrease desired capacity at specific times, so QA stops running instances nobody uses.'],
      ['Run the QA group in one Availability Zone with a smaller minimum size', 'QA does not need capacity provisioned for a zone failure, so it can drop the redundancy that production still needs.'],
    ],
    wrong: [
      ['Apply the same single-zone, smaller configuration to the production group', 'Production must keep its current availability, which needs instances in more than one Availability Zone.'],
      ['Add a warm standby copy of QA in a second Region for disaster recovery', 'QA needs no disaster recovery, and the standby adds a second environment to pay for.'],
      ['Raise the QA minimum size to nine so that each zone has spare capacity', 'QA accepts an outage in one zone, so spare capacity only adds cost.'],
    ],
    slots: [0, 2],
    evidence: [
      'asg-scheduled|You create scheduled actions that increase or decrease your group\'s desired capacity at specific times.',
      'waf-cost-demand|The economic benefits of just-in-time supply should be balanced against the need to provision to account for resource failures, high availability, and provision time.',
      'asg-what-is|You can specify multiple Availability Zones for your Auto Scaling group, and Amazon EC2 Auto Scaling balances your instances evenly across the Availability Zones as the group scales.',
    ],
  }),
  mc({
    id: 'distribution-office-008',
    building: 'distribution-office',
    bullets: ['4.2-K6'],
    d: 3,
    stem: 'A company runs a latency-sensitive application on AWS Outposts in its own data center. The servers on the Outpost must talk to instances and services in the parent Region over private IP addresses. The company wants one VPC and one set of route tables and security groups for both locations, with the LEAST new network components. Which solution meets these requirements?',
    correct: ['Create a subnet on the Outpost in the existing Region VPC and launch the on-premises servers into that subnet', 'Instances in Outpost subnets communicate with instances in the Region over private IP addresses within the same VPC.'],
    wrong: [
      ['Create a separate VPC on the Outpost and connect it to the Region VPC with a transit gateway', 'This builds a second VPC and extra connections, so route tables and security groups are not shared in one VPC.'],
      ['Place the servers in an AWS Local Zone and extend the Region VPC to that zone', 'A Local Zone is not in the company data center, so the servers would no longer run on the Outpost.'],
      ['Give the Outpost servers public IP addresses and let them reach the Region over the internet', 'Traffic would use public addresses rather than private IP addresses, which the company requires.'],
    ],
    slot: 2,
    evidence: [
      'outposts-what-is|Instances in Outpost subnets communicate with other instances in the AWS Region using private IP addresses, all within the same VPC.',
      'local-zones|AWS Local Zones places compute, storage, database, and other select AWS resources close to large population and industry centers.',
    ],
  }),
  mr({
    id: 'distribution-office-009',
    building: 'distribution-office',
    bullets: ['4.2-K5', '4.2-K6'],
    d: 3,
    stem: "A company needs to place three components. A factory-floor controller must process data on site at very low latency while using the same APIs as the Region. Game servers must have the lowest latency to phones on a mobile carrier's 5G network. Marketing videos that are the same for every viewer go to viewers worldwide. Which TWO placements are the MOST cost-effective? (Choose two.)",
    correct: [
      ['Run the factory-floor controller on AWS Outposts at the factory', 'Outposts runs AWS infrastructure on customer premises with the same programming interfaces, for lower latency and local data processing.'],
      ['Run the game servers in an AWS Wavelength Zone', "Wavelength puts AWS compute at the edge of communications service providers' networks for low latency to mobile devices."],
    ],
    wrong: [
      ['Deliver the marketing videos from servers in AWS Wavelength Zones', 'Wavelength serves devices on carrier networks and does not cache the videos for viewers worldwide.'],
      ['Run the factory-floor controller in an AWS Local Zone in the nearest large city', 'A Local Zone is not on the factory premises, so the data would not be processed on site.'],
      ['Run the game servers on AWS Outposts at the factory', "The phones connect through the carrier network, not through the factory's premises."],
    ],
    slots: [1, 4],
    evidence: [
      'outposts-what-is|By providing local access to AWS managed infrastructure, AWS Outposts enables customers to build and run applications on premises using the same programming interfaces as in AWS Regions, while using local compute and storage resources for lower latency and local data processing needs.',
      'wavelength-what-is|Wavelength deploys standard AWS compute and storage services to the edge of communications service providers\' (CSP) networks.',
      'wavelength-what-is|AWS Wavelength enables developers to build applications that require edge computing infrastructure to deliver low latency to mobile devices and end users or increase the resiliency of their existing edge applications.',
    ],
  }),
  mc({
    id: 'distribution-office-010',
    building: 'distribution-office',
    bullets: ['4.2-K3'],
    d: 2,
    tags: ['mock-reserve'],
    stem: 'A customer-facing web tier runs on Amazon EC2 instances in a single Availability Zone, and an outage in that zone would take the application offline. The company must stay available if one Availability Zone fails but has no requirement to survive the loss of a whole Region. Which solution is the MOST cost-effective?',
    correct: ['Run the instances in an Auto Scaling group across two Availability Zones behind an Application Load Balancer', 'The group balances instances across the zones, so the application keeps serving from the other zone, with no second Region to pay for.'],
    wrong: [
      ['Run a full second copy of the application in another Region with DNS failover', 'A whole second Region is more redundancy than the requirement calls for and costs a second environment.'],
      ['Keep the instances in one zone on a larger instance type and take hourly snapshots', 'If the zone fails, the instances are still unavailable until someone restores them elsewhere.'],
      ['Move the instances to Spot Instances in the same Availability Zone', 'The instances would still all sit in one zone, so a zone failure still takes the application offline.'],
    ],
    slot: 3,
    evidence: [
      'asg-what-is|You can specify multiple Availability Zones for your Auto Scaling group, and Amazon EC2 Auto Scaling balances your instances evenly across the Availability Zones as the group scales.',
      'global-infra|We call each group of logical data centers an Availability Zone.',
    ],
  }),
];

export default questions;
