import type { Question } from '../../../src/content/types.ts';
import { mc, mr } from '../helpers.ts';

const questions: Question[] = [
  mc({
    id: 'counting-house-001',
    building: 'counting-house',
    bullets: ['4.2-K1'],
    d: 1,
    stem: 'A company runs production, test and analytics workloads in three separate standalone AWS accounts. Compute usage in the three accounts is steady, and the company wants one Savings Plans commitment whose discount applies to the usage in all three accounts, without moving any workload. Which solution meets this requirement with the LEAST effort?',
    correct: ['Add the three accounts to one AWS Organizations organization and buy the plan in one of them', 'Consolidated billing combines usage across the accounts of the organization and shares Savings Plans discounts among them.'],
    wrong: [
      ['Buy a separate Savings Plan in each of the three accounts and size each one for its own account', 'Each plan covers only the usage of its own account, so a plan that is larger than its account\'s usage leaves part of the commitment unused.'],
      ['Create IAM roles that let the three accounts use the account that holds the Savings Plan', 'Roles grant access to resources and do not share a billing discount between accounts.'],
      ['Apply the same cost allocation tags to the instances in all three accounts', 'Cost allocation tags categorize and report costs and do not move a discount from one account to another.'],
    ],
    slot: 1,
    evidence: [
      'consolidated-billing|This shares the volume pricing discounts, Reserved Instance discounts, and Savings Plans.',
      'cost-alloc-tags|After you activate cost allocation tags, AWS uses the cost allocation tags to organize your resource costs on your cost allocation report, to make it easier for you to categorize and track your AWS costs.',
    ],
  }),
  mc({
    id: 'counting-house-002',
    building: 'counting-house',
    bullets: ['4.2-K1'],
    d: 3,
    stem: 'A company has already activated its user-defined Team tag for cost allocation. For Amazon EC2 instances that are launched from now on, finance also wants Cost Explorer to show the cost grouped by who created each instance, and it does not want people to type this information on each instance. Which action meets this requirement with the LEAST operational overhead?',
    correct: ['Activate the AWS-generated createdBy cost allocation tag in the billing console', 'The createdBy tag is applied by AWS and tracks who created a resource, and it must be activated separately from user-defined tags.'],
    wrong: [
      ['Ask each engineer to add a user-defined Owner tag with their name to every new instance', 'This relies on people typing the value on each instance, which the company wants to avoid, and untagged instances would be missed.'],
      ['Group the costs by the Service dimension in Cost Explorer', 'It breaks costs down by AWS service, and it carries no information about who created an instance.'],
      ['Enable consolidated billing for the accounts in AWS Organizations', 'Consolidated billing combines usage and shares discounts, and it does not record who created a resource.'],
    ],
    slot: 0,
    evidence: [
      'cost-alloc-tags|You must activate both types of tags separately before they can appear in Cost Explorer or on a cost allocation report.',
      'cost-alloc-tags|The createdBy tag tracks who created the resource.',
    ],
  }),
  mc({
    id: 'counting-house-003',
    building: 'counting-house',
    bullets: ['4.2-K2'],
    d: 1,
    stem: 'A company has run on Amazon EC2 On-Demand Instances for a year and wants to buy a Savings Plan. The finance team wants a recommendation for the hourly commitment, based on the company\'s own historical usage, with the LEAST effort. Which solution meets these requirements?',
    correct: ['Use AWS Cost Explorer to view the recommended Savings Plans commitment', 'Cost Explorer shows recommended Savings Plans commitments and the historical usage that they are based on, and the plan can be purchased from it.'],
    wrong: [
      ['Create an AWS Budgets Savings Plans coverage budget', 'A budget tracks utilization and coverage of plans that already exist and does not recommend a commitment to buy.'],
      ['Publish an AWS Cost and Usage Report to Amazon S3 and calculate the commitment by hand', 'The report holds the most detailed usage data, but the finance team would compute the recommendation itself.'],
      ['Activate cost allocation tags on every instance and read the tag report', 'Tags categorize costs by label and do not produce a recommended commitment.'],
    ],
    slot: 3,
    evidence: [
      'savings-plans|To get started, use AWS Cost Explorer to view your recommended Savings Plans commitment, refresh Savings Plans recommendations, purchase Savings Plans, manage your Savings Plans, and view your historical AWS usage.',
      'cur-what-is|AWS Cost and Usage Reports (AWS CUR) contains the most comprehensive set of cost and usage data available.',
    ],
  }),
  mc({
    id: 'counting-house-004',
    building: 'counting-house',
    bullets: ['4.2-K2'],
    d: 2,
    stem: 'A company bought Compute Savings Plans for its steady workloads. Some workloads were later moved to a different service, and the company wants to be notified automatically when the share of its commitment that is actually used falls too low. Which solution meets this requirement with the LEAST operational overhead?',
    correct: ['Create an AWS Budgets budget that monitors Savings Plans utilization and sends an alert', 'AWS Budgets can monitor aggregate utilization and coverage metrics for Savings Plans and alert when they cross the threshold set.'],
    wrong: [
      ['Check the Savings Plans recommendations in AWS Cost Explorer each month', 'Recommendations show what additional commitment to buy and do not notify anyone when utilization of an existing plan drops.'],
      ['Turn on cost allocation tags for the workloads that moved', 'Tags categorize costs and do not measure how much of a commitment is used.'],
      ['Deliver the Cost and Usage Report to Amazon S3 and have an analyst query it every week', 'The report holds detailed data, but the weekly query is manual and does not send a notification.'],
    ],
    slot: 1,
    evidence: [
      'budgets-managing|You can use AWS Budgets to monitor your aggregate utilization and coverage metrics for your Reserved Instances (RIs) or Savings Plans.',
      'savings-plans|To get started, use AWS Cost Explorer to view your recommended Savings Plans commitment, refresh Savings Plans recommendations, purchase Savings Plans, manage your Savings Plans, and view your historical AWS usage.',
    ],
  }),
  mc({
    id: 'counting-house-005',
    building: 'counting-house',
    bullets: ['4.2-K1', '4.2-K4'],
    d: 3,
    tags: ['trap:savings-plans-ri-spot'],
    stem: 'A company has six AWS accounts in one AWS Organizations organization. Over the next year it will move some steady Amazon EC2 workloads to other instance families and shift some containers to AWS Fargate. It wants one one-year commitment that discounts the usage of all six accounts with the GREATEST flexibility. Which solution meets these requirements?',
    correct: ['Buy a Compute Savings Plan in the management account', 'Compute Savings Plans apply regardless of instance family and also to Fargate usage, and consolidated billing shares the plan across the accounts.'],
    wrong: [
      ['Buy an EC2 Instance Savings Plan for the current instance family in the management account', 'It commits to a specific instance family in one Region and does not cover the Fargate usage or a move to another family.'],
      ['Buy Standard Reserved Instances for the current instance configurations in each account', 'Reserved Instances commit to a consistent instance configuration, cannot be exchanged, and do not apply to Fargate.'],
      ['Run all the steady workloads on Spot Instances in each account', 'Spot capacity can be interrupted, so it is not a commitment and does not suit steady production workloads.'],
    ],
    slot: 2,
    evidence: [
      'savings-plans-types|They also apply to your Fargate and Lambda usage.',
      'savings-plans-types|With Compute Savings Plans, you can move a workload from c5 to m5, shift your usage from EU (Ireland) to EU (London), or migrate your application from Amazon EC2 to Amazon ECS using Fargate at any time.',
      'consolidated-billing|This shares the volume pricing discounts, Reserved Instance discounts, and Savings Plans.',
    ],
  }),
  mr({
    id: 'counting-house-006',
    building: 'counting-house',
    bullets: ['4.2-K4'],
    d: 2,
    tags: ['trap:savings-plans-ri-spot'],
    stem: 'A company renders video in a nightly batch job made of thousands of independent tasks. Each task takes about ten minutes, writes its result to Amazon S3, and can be run again without harm. The company wants to run the workers at the LOWEST cost. Which TWO actions meet these requirements? (Choose two.)',
    correct: [
      ['Run the worker instances as Amazon EC2 Spot Instances', 'Spot Instances use spare capacity at less than the On-Demand price and suit applications that are flexible about timing and can be interrupted.'],
      ['Return unfinished tasks to the work queue when the two-minute Spot interruption notice arrives', 'The notice warns two minutes before EC2 stops or terminates the instance, so an interrupted task can be run again elsewhere.'],
    ],
    wrong: [
      ['Buy three-year Standard Reserved Instances for the worker fleet', 'A three-year commitment to an instance configuration is wasteful for a job that runs only part of each night.'],
      ['Run the workers on Dedicated Hosts', 'Dedicated Hosts are for dedicated physical servers and per-socket or per-core licenses, which the job does not need.'],
      ['Reserve the worker capacity with an On-Demand Capacity Reservation in one Availability Zone', 'Capacity Reservations are charged at the On-Demand rate whether or not instances run in them, which does not lower the cost.'],
    ],
    slots: [0, 3],
    evidence: [
      'ec2-spot|Spot Instances are a cost-effective choice if you can be flexible about when your applications run and if your applications can be interrupted.',
      'ec2-spot-notices|A Spot Instance interruption notice is a warning that is issued two minutes before Amazon EC2 stops or terminates your Spot Instance.',
      'ec2-capacity-reservation-billing|Capacity Reservations are charged at the equivalent On-Demand rate whether you run instances in reserved capacity or not, including any applicable regional surcharge for Dedicated Instances.',
    ],
  }),
  mc({
    id: 'counting-house-007',
    building: 'counting-house',
    bullets: ['4.2-K4'],
    d: 2,
    tags: ['trap:savings-plans-ri-spot'],
    stem: 'A retailer expects a two-week sales event and must be sure that a fixed number of Amazon EC2 instances can be launched in one specific Availability Zone during it. The company does not want a one-year or three-year commitment. Which purchasing option meets these requirements?',
    correct: ['An On-Demand Capacity Reservation in that Availability Zone, cancelled after the event', 'A Capacity Reservation reserves capacity in a specific Availability Zone for any duration, with no term commitment, and can be cancelled at any time.'],
    wrong: [
      ['A regional Reserved Instance for the instance type', 'A regional Reserved Instance does not reserve capacity, and it carries a term of one or three years.'],
      ['A Compute Savings Plan sized for the event usage', 'Savings Plans do not provide capacity reservations, and the plan carries a commitment of one or three years.'],
      ['A zonal Reserved Instance in that Availability Zone with a one-year term and partial upfront payment', 'It reserves capacity in the Availability Zone, but it carries a one-year commitment that the company does not want for a two-week need.'],
    ],
    slot: 0,
    evidence: [
      'ec2-capacity-reservations|Amazon EC2 Capacity Reservations allow you to reserve compute capacity for your Amazon EC2 instances in a specific Availability Zone for any duration.',
      'ec2-capacity-reservations|If you request a Capacity Reservation for immediate use, the Capacity Reservation becomes available for use immediately and there is no term commitment.',
      'ec2-ri-scope|A regional Reserved Instance does not reserve capacity.',
      'savings-plans-vs-ri|Savings Plans doesn\'t provide capacity reservations, but you can allocate On-Demand Capacity Reservation (ODCR) for your needs and your Savings Plans will apply.',
    ],
  }),
  mr({
    id: 'counting-house-008',
    building: 'counting-house',
    bullets: ['4.2-K2', '4.2-K4'],
    d: 2,
    tags: ['trap:savings-plans-ri-spot'],
    stem: 'A company wants to cover its steady Amazon EC2 usage with Savings Plans. It wants to size the first purchase from its own usage history, and after the purchase it wants to track what share of its usage the plans cover. Which TWO actions meet these requirements with the LEAST operational overhead? (Choose two.)',
    correct: [
      ['Use AWS Cost Explorer to view the recommended Savings Plans commitment before purchasing', 'Cost Explorer shows the recommended commitment based on historical usage and is where plans are purchased.'],
      ['Create an AWS Budgets coverage budget for Savings Plans', 'AWS Budgets monitors aggregate utilization and coverage metrics for Savings Plans.'],
    ],
    wrong: [
      ['Activate cost allocation tags on the instances and review the tag report', 'Tags group costs by label and do not recommend a commitment or measure coverage.'],
      ['Use consolidated billing in AWS Organizations as the way to measure coverage', 'Consolidated billing shares discounts across accounts and is not a coverage report or a recommendation.'],
      ['Query the Cost and Usage Report in Amazon S3 by hand to decide and to track coverage', 'The report has the detail, but doing both jobs by hand is more operational work than the two managed tools.'],
    ],
    slots: [1, 4],
    evidence: [
      'savings-plans|To get started, use AWS Cost Explorer to view your recommended Savings Plans commitment, refresh Savings Plans recommendations, purchase Savings Plans, manage your Savings Plans, and view your historical AWS usage.',
      'budgets-managing|You can use AWS Budgets to monitor your aggregate utilization and coverage metrics for your Reserved Instances (RIs) or Savings Plans.',
    ],
  }),
  mc({
    id: 'counting-house-009',
    building: 'counting-house',
    bullets: ['4.2-K4'],
    d: 2,
    tags: ['mock-reserve', 'trap:savings-plans-ri-spot'],
    stem: 'A company must run a database engine that is licensed per socket, and it wants to bring its existing licenses to AWS to reduce the cost of running it on Amazon EC2. Which EC2 purchasing option BEST meets this requirement?',
    correct: ['Dedicated Hosts, which accept existing per-socket and per-core software licenses', 'A Dedicated Host is a physical host fully dedicated to the company\'s instances, and existing per-socket licenses can be used on it.'],
    wrong: [
      ['Spot Instances spread across a large pool of instance types and Availability Zones', 'Spot Instances use spare capacity and can be interrupted, and they do not provide a dedicated physical host for per-socket licenses.'],
      ['Compute Savings Plans with a three-year term and all upfront payment', 'Savings Plans commit to a usage amount and do not give the company a physical host to which socket-based licenses apply.'],
      ['On-Demand Capacity Reservations in one Availability Zone for the full length of the project', 'Capacity Reservations reserve capacity and give no billing discount, and they do not give the company a dedicated physical host.'],
    ],
    slot: 3,
    evidence: [
      'ec2-purchasing|Dedicated Hosts – Pay for a physical host that is fully dedicated to running your instances, and bring your existing per-socket, per-core, or per-VM software licenses to reduce costs.',
      'ec2-capacity-reservations|No billing discount.',
    ],
  }),
];

export default questions;
