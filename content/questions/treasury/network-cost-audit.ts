import type { Question } from '../../../src/content/types.ts';
import { mc, mr } from '../helpers.ts';

const questions: Question[] = [
  mc({
    id: 'network-cost-audit-001',
    building: 'network-cost-audit',
    bullets: ['4.4-K1'],
    d: 1,
    stem: 'A company has 14 AWS accounts that were opened by separate teams and are paid separately. Finance wants one bill for all of the accounts and a way to track the charges across them, with no additional fee. Which solution meets these requirements with the LEAST effort?',
    correct: ['Add the accounts to an organization in AWS Organizations and use consolidated billing', 'Consolidated billing gives one bill for multiple accounts, lets the management account track charges across them, and has no extra fee.'],
    wrong: [
      ['Create an AWS Budgets budget in every account and send the alerts to one finance mailbox', 'Budgets alert on spending but do not combine the accounts into one bill.'],
      ['Export a Cost Explorer report from every account each month and combine the files in a spreadsheet', 'This is manual work each month and the accounts would still be billed separately.'],
      ['Run a Trusted Advisor cost optimization check in every account and total the savings by hand', 'Trusted Advisor recommends savings; it does not consolidate the bills of several accounts.'],
    ],
    slot: 0,
    evidence: [
      'consolidated-billing|Every organization in AWS Organizations has a management account that pays the charges of all the member accounts.',
      'consolidated-billing|One bill – You get one bill for multiple accounts in the same SOR.',
      'consolidated-billing|No extra fee – Consolidated billing is offered at no additional cost.',
    ],
  }),
  mc({
    id: 'network-cost-audit-002',
    building: 'network-cost-audit',
    bullets: ['4.4-K1'],
    d: 2,
    stem: 'A company uses AWS Organizations with 30 member accounts. Data transfer charges rose sharply last month, and the finance team must find which member account spent the most on Amazon EC2 without signing in to each account. Which solution meets this requirement with the LEAST effort?',
    correct: ['In the management account, use AWS Cost Explorer with the Linked Account and Service filters', 'Cost Explorer in the management account can filter by linked account and service to identify the member account that spent the most.'],
    wrong: [
      ['Sign in to every member account and read the Billing page of each one in turn', 'This takes 30 separate sign-ins and manual comparison, which is the effort the team wants to avoid.'],
      ['Create an AWS Budgets budget in the management account with a spending alert threshold', 'A budget alerts when costs reach a threshold; it does not rank the member accounts by what they spent.'],
      ['Run the Trusted Advisor cost optimization checks in the management account', 'These checks look for idle and unused resources; they do not break down spending by member account.'],
    ],
    slot: 1,
    evidence: [
      'ce-filtering|For example, you can use the Linked Account and Services filters to identify the member account that spent the most money on Amazon EC2.',
      'consolidated-billing|Easy tracking – You can track the charges across multiple accounts and download the combined cost and usage data.',
    ],
  }),
  mr({
    id: 'network-cost-audit-003',
    building: 'network-cost-audit',
    bullets: ['4.4-K1', '4.4-K2'],
    d: 2,
    stem: 'Three teams share one account and one VPC. Each team has tagged its NAT gateways and load balancers with a team tag. Finance wants a monthly breakdown of these network costs by team in the Billing and Cost Management console. Which TWO actions meet these requirements with the LEAST effort? (Choose two.)',
    correct: [
      ['Activate the team tag as a cost allocation tag', 'A tag must be activated before it can appear in Cost Explorer or on a cost allocation report.'],
      ['Group the costs by the team tag in AWS Cost Explorer', 'Cost Explorer can filter and group costs by tag, which gives the cost per team.'],
    ],
    wrong: [
      ['Turn on consolidated billing for the account', 'Consolidated billing combines the bills of several accounts and does not split the costs of one account by team.'],
      ['Enable VPC Flow Logs on the VPC and publish them to Amazon S3', 'Flow logs record IP traffic information and do not report the cost of each team.'],
      ['Create an AWS Budgets budget that sends an alert to the finance team every month', 'A budget sends alerts at a threshold and does not produce a cost breakdown by team.'],
    ],
    slots: [0, 3],
    evidence: [
      'cost-alloc-tags|You must activate both types of tags separately before they can appear in Cost Explorer or on a cost allocation report.',
      'ce-filtering|With Cost Explorer, you can filter how you view your AWS costs by one or more of the following values: API operation Availability Zone (AZ) Billing entity Charge type Include all Instance type Legal entity Linked account Platform Product attribute Purchase option Region Resources Service Tag Tenancy Usage type Usage type group',
    ],
  }),
  mc({
    id: 'network-cost-audit-004',
    building: 'network-cost-audit',
    bullets: ['4.4-K2', '4.4-S5'],
    d: 2,
    stem: 'A company runs a workload in three Availability Zones in one Region, and the data transfer charges are higher than expected. The team wants to see in which Availability Zone most of the traffic is and which usage types drive the cost, using an existing AWS tool with the LEAST effort. Which solution meets these requirements?',
    correct: ['Open AWS Cost Explorer and filter and group the costs by Availability Zone and usage type', 'Cost Explorer shows which Availability Zone most of the traffic is in and can be refined with filters and grouping, such as usage type.'],
    wrong: [
      ['Set up AWS Budgets with a cost threshold for each Availability Zone', 'A budget alerts when a threshold is reached; it does not show which zone or usage type causes the cost.'],
      ['Turn on the Cost and Usage Report and write queries over the files to total the cost per zone', 'This can give the data but needs setup and query work, while Cost Explorer already shows it in the console.'],
      ['Review the Trusted Advisor idle resource checks for the three Availability Zones', 'These checks find idle resources and do not break the data transfer cost down by zone or usage type.'],
    ],
    slot: 2,
    evidence: [
      'ce-filtering|You can use Cost Explorer to see which service you use the most, which Availability Zone (AZ) most of your traffic is in, and which member account uses AWS the most.',
      'ce-filtering|You can continue refining your cost analysis by using multiple filters, grouping your data by filter type, and choosing Advanced Options tab options.',
    ],
  }),
  mc({
    id: 'network-cost-audit-005',
    building: 'network-cost-audit',
    bullets: ['4.4-K2'],
    d: 1,
    stem: 'A company wants an email warning when its forecasted monthly spending on AWS is going to exceed a fixed amount, so that it can act before the month ends. Which AWS tool meets this requirement with the LEAST effort?',
    correct: ['AWS Budgets, with a cost budget and a notification for forecasted spend', 'A cost budget sets a spending limit and can alert on actual or forecasted spend, sending notifications by email or an SNS topic.'],
    wrong: [
      ['AWS Cost Explorer, by opening its charts at the end of each week', 'Cost Explorer is for viewing and analyzing costs and does not send alerts at a threshold.'],
      ['AWS Cost and Usage Report, delivered daily to an Amazon S3 bucket', 'The report delivers detailed cost data files and does not send a warning when a limit is forecast to be passed.'],
      ['AWS Trusted Advisor, by reading the cost optimization checks each month', 'Trusted Advisor recommends savings and does not warn about a spending limit being forecast to be exceeded.'],
    ],
    slot: 3,
    evidence: [
      'budgets-managing|Cost budgets: Set spending limits for services and receive alerts when costs approach or exceed your defined threshold.',
      'budgets-managing|You can choose to be alerted for both actual (after accruing) and forecasted (before accruing) spends.',
    ],
  }),
  mc({
    id: 'network-cost-audit-006',
    building: 'network-cost-audit',
    bullets: ['4.4-K2'],
    d: 3,
    stem: 'A company wants every line item of its AWS costs, broken down by hour and by product, delivered automatically to an Amazon S3 bucket that the company owns. Analysts will run their own queries on the files to find the sources of network charges. Which solution meets these requirements with the LEAST operational overhead?',
    correct: ['Create an AWS Cost and Usage Report that delivers to the bucket', 'The report holds the most comprehensive cost and usage data, with line items by product and usage type, published to a bucket you own.'],
    wrong: [
      ['Create an AWS Budgets cost budget with notifications to an Amazon SNS topic', 'A budget tracks spending against a limit and sends alerts; it does not deliver line-item data to a bucket.'],
      ['Turn on AWS Cost Anomaly Detection with an alert subscription for the finance team', 'Cost Anomaly Detection alerts on unusual spend patterns and does not deliver line items for analysts to query.'],
      ['Use the AWS Cost Explorer console and save a report for each month', 'Cost Explorer is an interactive view of costs and does not publish detailed hourly line items to a bucket the company owns.'],
    ],
    slot: 0,
    evidence: [
      'cur-what-is|AWS Cost and Usage Reports (AWS CUR) contains the most comprehensive set of cost and usage data available.',
      'cur-what-is|You can use Cost and Usage Reports to publish your AWS billing reports to an Amazon Simple Storage Service (Amazon S3) bucket that you own.',
      'cur-what-is|Each report contains line items for each unique combination of AWS products, usage type, and operation that you use in your AWS account.',
    ],
  }),
  mc({
    id: 'network-cost-audit-007',
    building: 'network-cost-audit',
    bullets: ['4.4-S5'],
    d: 2,
    stem: 'A company is reviewing an existing workload that has been running for two years. The team suspects that some NAT gateways, VPC interface endpoints and Elastic IP addresses no longer carry traffic or are not attached to anything, and it wants to find them with the LEAST effort. Which solution meets these requirements?',
    correct: ['Review the AWS Trusted Advisor cost optimization checks for idle and unassociated network resources', 'Trusted Advisor has cost checks for idle NAT gateways, inactive VPC interface endpoints and unassociated Elastic IP addresses.'],
    wrong: [
      ['Enable VPC Flow Logs for the whole VPC and analyze the records for resources with no traffic', 'Flow logs add logging charges and analysis work, while a Trusted Advisor check already reports these resources.'],
      ['Create a cost budget in AWS Budgets for each resource type and wait for an alert', 'A budget alerts on spending thresholds and does not list resources that are idle or unattached.'],
      ['Group the costs by Availability Zone in AWS Cost Explorer and delete the most expensive resources', 'Cost Explorer shows spending by zone and does not identify which resources are idle, so busy resources could be deleted.'],
    ],
    slot: 1,
    evidence: [
      'trusted-advisor-cost-checks|A NAT Gateway is considered to be inactive if no data (0 bytes) was processed in the last 30 days.',
      'trusted-advisor-cost-checks|A VPC interface endpoint is considered to be inactive if it has no data processed in the last 30 days.',
      'trusted-advisor-cost-checks|Checks for Elastic IP addresses (EIPs) that are not associated with a running Amazon Elastic Compute Cloud (Amazon EC2) instance.',
    ],
  }),
  mr({
    id: 'network-cost-audit-008',
    building: 'network-cost-audit',
    bullets: ['4.4-S5'],
    d: 3,
    stem: 'A company reviews a workload whose single NAT gateway has high data processing charges. The team wants to find out which traffic flows go through the NAT gateway and how much data it sends out, using services that capture traffic information. Which TWO actions meet these requirements? (Choose two.)',
    correct: [
      ['Enable VPC Flow Logs for the VPC and analyze the records for traffic through the NAT gateway', 'Flow logs capture information about the IP traffic going to and from network interfaces in the VPC, which shows the flows.'],
      ['Review the BytesOutToDestination metric of the NAT gateway in Amazon CloudWatch', 'This metric is the number of bytes sent out through the NAT gateway to the destination, which shows how much data leaves.'],
    ],
    wrong: [
      ['Review the idle NAT gateway check in AWS Trusted Advisor', 'The check finds NAT gateways that are idle, and this gateway is busy, so the check does not show which flows use it.'],
      ['Create an AWS Cost and Usage Report and total the NAT gateway charge', 'The report gives the cost line items but contains no information about which flows the traffic belongs to.'],
      ['Set an AWS Budgets cost budget for the NAT gateway with an email alert', 'A budget warns about spend at a threshold and does not reveal which flows or how much data pass through.'],
    ],
    slots: [1, 4],
    evidence: [
      'vpc-flow-logs|VPC Flow Logs is a feature that enables you to capture information about the IP traffic going to and from network interfaces in your VPC.',
      'vpc-nat-metrics|BytesOutToDestination The number of bytes sent out through the NAT gateway to the destination.',
    ],
  }),
  mc({
    id: 'network-cost-audit-009',
    building: 'network-cost-audit',
    bullets: ['4.4-K2'],
    d: 2,
    tags: ['mock-reserve'],
    stem: 'A company has seasonal traffic, so its spending on data transfer changes a lot from month to month and no fixed limit fits. The company wants to be alerted when spending departs from its normal pattern, without choosing a threshold. Which AWS feature meets this requirement with the LEAST effort?',
    correct: ['AWS Cost Anomaly Detection, with an alert subscription', 'It uses machine learning models to detect and alert on anomalous spend patterns, including seasonality, without a threshold.'],
    wrong: [
      ['AWS Budgets, with a cost budget set to a fixed monthly amount', 'A fixed amount does not fit seasonal spending, so it would alert falsely in busy months and miss spikes in quiet ones.'],
      ['AWS Cost and Usage Report, delivered to Amazon S3 and reviewed each week', 'The report delivers data files and does not alert on spending that departs from a normal pattern.'],
      ['AWS Cost Explorer, by filtering the data transfer costs every morning', 'Cost Explorer is a manual view and does not send alerts when spending changes.'],
    ],
    slot: 2,
    evidence: [
      'cost-anomaly|AWS Cost Anomaly Detection is a feature that uses machine learning models to detect and alert on anomalous spend patterns in your deployed AWS services.',
      'cost-anomaly|You can evaluate your spend patterns using machine learning methods to minimize false positive alerts.',
    ],
  }),
];

export default questions;
