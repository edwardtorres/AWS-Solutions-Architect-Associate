import type { Question } from '../../../src/content/types.ts';
import { mc, mr } from '../helpers.ts';

const questions: Question[] = [
  mc({
    id: 'db-cost-desk-001',
    building: 'db-cost-desk',
    bullets: ['4.3-K1'],
    d: 2,
    stem: 'A company tags each Amazon RDS DB instance with a Team tag and has activated Team as a cost allocation tag. Finance cannot assign the storage cost of manual DB snapshots to teams because the snapshots carry no tags. The company wants every new snapshot to carry its source DB instance tags with the LEAST ongoing effort. Which solution meets this requirement?',
    correct: ['Turn on copying of tags to snapshots for each DB instance', 'Tags on a DB instance are then copied to its snapshots, so the snapshots appear under the Team tag in cost reports without manual steps.'],
    wrong: [
      ['Add the Team tag to each snapshot by hand after the snapshot is created', 'Every new snapshot would need a manual step, which is not the least ongoing effort.'],
      ['Create a Cost and Usage Report and group the snapshot line items by the Team tag', 'A report can group by tags only where tags exist, and the snapshots still carry none.'],
      ['Create an AWS Budgets cost budget for each team that covers all of its DB instance hours', 'A budget alerts on spend and does not assign untagged snapshot storage to teams.'],
    ],
    slot: 0,
    evidence: [
      'rds-tagging|When you create or restore a DB instance, you can specify that the tags from the DB instance are copied to snapshots of the DB instance.',
      'rds-tagging|You can also use these tags to track costs by grouping expenses for similarly tagged resources.',
      'cost-alloc-tags|You must activate both types of tags separately before they can appear in Cost Explorer or on a cost allocation report.',
    ],
  }),
  mc({
    id: 'db-cost-desk-002',
    building: 'db-cost-desk',
    bullets: ['4.3-K1'],
    d: 1,
    stem: 'A company runs databases in four AWS accounts that are billed separately. Reserved DB instances bought in one account are only partly used there, while the other accounts run matching DB instances at on-demand rates. The company wants one bill and wants the unused discount to benefit the other accounts, with the LEAST effort. Which solution meets these requirements?',
    correct: ['Join the accounts to one organization in AWS Organizations and use consolidated billing', 'Consolidated billing combines usage across the accounts and shares Reserved Instance discounts, and the management account pays one bill.'],
    wrong: [
      ['Buy matching reserved DB instances in each of the three other accounts so that every account has its own reservation', 'The company would pay for extra reservations while the existing discount stays partly unused.'],
      ['Create a Cost and Usage Report in each account and share the reports with finance', 'Reports describe cost and usage but do not move discounts between accounts or merge the bills.'],
      ['Create an AWS Budgets reservation budget in each of the four accounts', 'A budget monitors utilization and alerts, but it does not share discounts or combine the bills.'],
    ],
    slot: 1,
    evidence: [
      'consolidated-billing|Every organization in AWS Organizations has a management account that pays the charges of all the member accounts.',
      'consolidated-billing|Combined usage – You can combine the usage across all accounts in the organization.',
      'consolidated-billing|This shares the volume pricing discounts, Reserved Instance discounts, and Savings Plans.',
    ],
  }),
  mc({
    id: 'db-cost-desk-003',
    building: 'db-cost-desk',
    bullets: ['4.3-K2'],
    d: 1,
    stem: 'A finance lead wants to see how spending on Amazon RDS and Amazon Aurora changed month by month over the past year, in a graph, and wants a forecast for the coming months. The lead does not want to build any data pipeline. Which AWS tool meets these requirements with the LEAST effort?',
    correct: ['AWS Cost Explorer filtered to the database services', 'Cost Explorer lets you view and analyze costs and usage for up to the last 13 months and forecast future spend without extra setup.'],
    wrong: [
      ['AWS Cost and Usage Report delivered to an Amazon S3 bucket and queried with Amazon Athena', 'This needs a delivery, queries and a charting step to build, which is far more effort than an existing graphing tool.'],
      ['AWS Budgets with a monthly cost budget and alert thresholds', 'Budgets alerts when spending approaches a limit and is not a month-by-month graph of the past year.'],
      ['AWS Organizations with consolidated billing turned on for all accounts', 'Consolidated billing combines charges and shares discounts but does not itself graph or forecast costs.'],
    ],
    slot: 2,
    evidence: [
      'ce-what-is|AWS Cost Explorer is a tool that enables you to view and analyze your costs and usage.',
      'ce-what-is|You can view data for up to the last 13 months, forecast how much you\'re likely to spend for the next 18 months, and get recommendations for what Reserved Instances to purchase.',
    ],
  }),
  mc({
    id: 'db-cost-desk-004',
    building: 'db-cost-desk',
    bullets: ['4.3-K2'],
    d: 3,
    stem: "A finance engineer must load Amazon RDS cost data into the company's own reporting tool each day. The data must be broken down by the hour, by individual database resource, and by a Project tag, and it must land in an Amazon S3 bucket that the company owns so that the tool can process it automatically. Which AWS tool meets these requirements?",
    correct: ['AWS Cost and Usage Report delivered to the S3 bucket', 'The report holds the most comprehensive cost and usage data, publishes to a bucket the company owns, and breaks costs down by hour, by product resource and by tags.'],
    wrong: [
      ['AWS Cost Explorer with filters for Amazon RDS and a grouping by the Project tag', 'Cost Explorer is for viewing and analyzing costs in the console, and it does not deliver files to a bucket for another tool to process.'],
      ['AWS Budgets with a cost budget that is filtered to the Project tag', 'A budget tracks spend against a limit and alerts, and it does not deliver hourly resource-level data to a bucket.'],
      ['AWS Organizations consolidated billing with a member account for each project', 'Consolidated billing combines charges for the accounts and does not produce hourly, resource-level files in a bucket.'],
    ],
    slot: 3,
    evidence: [
      'cur-what-is|AWS Cost and Usage Reports (AWS CUR) contains the most comprehensive set of cost and usage data available.',
      'cur-what-is|You can use Cost and Usage Reports to publish your AWS billing reports to an Amazon Simple Storage Service (Amazon S3) bucket that you own.',
      'cur-what-is|You can receive reports that break down your costs by the hour, day, or month, by product or product resource, or by tags that you define yourself.',
    ],
  }),
  mc({
    id: 'db-cost-desk-005',
    building: 'db-cost-desk',
    bullets: ['4.3-K2'],
    d: 3,
    tags: ['trap:savings-plans-ri-spot'],
    stem: 'A company runs steady production databases on Amazon RDS for Oracle. During the next year it expects to modernize some of them to Aurora PostgreSQL-Compatible Edition and to change DB instance sizes. The company wants to commit to database usage to lower its bill while staying free to change engines and sizes. Which commitment is the MOST cost-effective?',
    correct: ['Database Savings Plans', 'Database Savings Plans apply across Aurora, RDS and other database services, so the discount is kept when a workload moves from RDS for Oracle to Aurora PostgreSQL-Compatible Edition.'],
    wrong: [
      ['Reserved DB instances for the current RDS for Oracle instance type', 'The discount of a reserved DB instance is tied to instance type and Region, so it does not follow a change of size or engine.'],
      ['Compute Savings Plans', 'Compute Savings Plans apply to Amazon EC2, AWS Fargate and AWS Lambda usage, not to the database services.'],
      ['No commitment, with On-Demand pricing and an AWS Budgets alert on database spend', 'The steady database usage would stay at On-Demand rates, and a budget only warns about spend and does not lower it.'],
    ],
    slot: 0,
    evidence: [
      'savings-plans-types|For example, with Database Savings Plans, you can change between Aurora db.r7g and db.r8g instances, shift a workload from EU (Ireland) to EU (London), modernize from RDS for Oracle to Aurora PostgreSQL-Compatible Edition, or move a workload from RDS to DynamoDB while maintaining your discounted rates.',
      'rds-reserved|Discounts for reserved DB instances are tied to instance type and AWS Region.',
      'savings-plans-types|They also apply to your Fargate and Lambda usage.',
    ],
  }),
  mr({
    id: 'db-cost-desk-006',
    building: 'db-cost-desk',
    bullets: ['4.3-K1', '4.3-K2'],
    d: 3,
    stem: 'A company has 12 AWS accounts in one organization in AWS Organizations. Each team runs Amazon RDS and Amazon Aurora databases in its own account and puts a Team tag on them. Finance wants one view of database spend per team across all accounts, with the LEAST manual work. Which TWO actions meet these requirements? (Choose two.)',
    correct: [
      ['Activate the Team tag as a cost allocation tag', 'A tag must be activated before it can appear in Cost Explorer or on a cost allocation report.'],
      ['Use Cost Explorer in the management account, filter to the database services, and group by the Team tag', 'Consolidated billing lets the management account track charges across the accounts, and Cost Explorer can filter and group by a tag.'],
    ],
    wrong: [
      ['Create a Cost and Usage Report in every member account and merge the files by hand each month', 'The merging is manual work, which the company wants to minimize.'],
      ['Ask each team to compile its database spend into a spreadsheet at the end of each month', 'This relies on manual work by twelve teams instead of tags and a cost tool.'],
      ['Create a Reserved Instance utilization budget in each member account', 'A utilization budget monitors how well a reservation is used and does not show spend per team.'],
    ],
    slots: [0, 3],
    evidence: [
      'cost-alloc-tags|You must activate both types of tags separately before they can appear in Cost Explorer or on a cost allocation report.',
      'consolidated-billing|Easy tracking – You can track the charges across multiple accounts and download the combined cost and usage data.',
      'ce-filtering|Tag A label that you can use to track the costs associated with specific areas or entities within your business.',
    ],
  }),
  mr({
    id: 'db-cost-desk-007',
    building: 'db-cost-desk',
    bullets: ['4.3-K2'],
    d: 2,
    stem: 'A company wants two automatic protections for its database spending. First, an email when the forecast spend on Amazon RDS for the month is going to pass a set limit. Second, a daily check of how much of its database usage its Database Savings Plans cover, with an alert when coverage drops below a target. Which TWO actions meet these requirements? (Choose two.)',
    correct: [
      ['Create an AWS Budgets cost budget filtered to Amazon RDS with an alert on forecasted spend', 'AWS Budgets can alert on forecasted spend before it accrues, so the team hears about a likely overrun in advance.'],
      ['Create an AWS Budgets Savings Plans coverage budget with a daily period and an alert threshold', 'AWS Budgets can track the utilization and coverage of Savings Plans with a daily budget and alert when it drops.'],
    ],
    wrong: [
      ['Review an AWS Cost Explorer report every morning to look for changes', 'This is a manual daily review, not an automatic alert.'],
      ['Create a Cost and Usage Report and review the delivered files once a week', 'The files are raw data that no one is alerted about, and a weekly review is not a daily check.'],
      ['Create an AWS Budgets usage budget for Amazon EC2 instance hours', 'EC2 usage is not database spend or Savings Plans coverage of databases.'],
    ],
    slots: [2, 4],
    evidence: [
      'budgets-managing|You can choose to be alerted for both actual (after accruing) and forecasted (before accruing) spends.',
      'budgets-managing|You can use AWS Budgets to monitor your aggregate utilization and coverage metrics for your Reserved Instances (RIs) or Savings Plans.',
      'budgets-managing|Setting a daily utilization or coverage budget to track your RI or Savings Plans.',
    ],
  }),
  mc({
    id: 'db-cost-desk-008',
    building: 'db-cost-desk',
    bullets: ['4.3-K2'],
    d: 2,
    stem: 'A company has run 25 Amazon RDS DB instances at steady load on On-Demand pricing for a year. It wants a recommendation, based on its own usage, of which reserved DB instances to buy, without building its own analysis. Which AWS tool should the company use?',
    correct: ['AWS Cost Explorer, which analyzes past usage and recommends Reserved Instances to purchase', 'Cost Explorer can analyze costs and usage and give recommendations for which Reserved Instances to purchase.'],
    wrong: [
      ['AWS Budgets, which tracks spend against limits and sends alerts about costs', 'Budgets alerts on thresholds and can monitor existing reservations but does not recommend which reservations to buy.'],
      ['AWS Cost and Usage Report, which delivers the raw usage and cost data to Amazon S3', 'The report is raw data that the company would have to analyze itself, which it wants to avoid.'],
      ['AWS Organizations consolidated billing, which shares discounts across accounts', 'Consolidated billing shares existing discounts and gives no recommendation about what to buy.'],
    ],
    slot: 1,
    evidence: [
      'ce-what-is|You can view data for up to the last 13 months, forecast how much you\'re likely to spend for the next 18 months, and get recommendations for what Reserved Instances to purchase.',
      'budgets-managing|Set spending limits for services and receive alerts when costs approach or exceed your defined threshold.',
    ],
  }),
  mc({
    id: 'db-cost-desk-009',
    building: 'db-cost-desk',
    bullets: ['4.3-K1'],
    d: 2,
    tags: ['mock-reserve'],
    stem: 'Accounts A, B and C belong to one organization with consolidated billing. Account A bought reserved DB instances for one DB instance type in one Region. Account A runs fewer matching DB instances than it reserved, while accounts B and C run matching DB instances in that Region at on-demand rates. Which usage receives the unused discount?',
    correct: ['Matching DB instance usage in accounts B and C, because the organization shares Reserved Instance discounts', 'Consolidated billing shares Reserved Instance discounts across the accounts, and the discount applies to matching instance type and Region.'],
    wrong: [
      ['Only usage in account A, because a reservation is always limited to the account that bought it', 'Consolidated billing shares Reserved Instance discounts across the member accounts, so it is not limited to account A.'],
      ['DB instance usage in accounts B and C in any Region, whatever the instance type', 'The discount of a reserved DB instance is tied to instance type and Region, so mismatched usage is not covered.'],
      ['Only usage in accounts B and C that runs in the same Availability Zone as the reservation of account A, and no usage elsewhere', 'The discount is tied to instance type and Region, and nothing in the description limits it to one Availability Zone.'],
    ],
    slot: 2,
    evidence: [
      'consolidated-billing|This shares the volume pricing discounts, Reserved Instance discounts, and Savings Plans.',
      'rds-reserved|Discounts for reserved DB instances are tied to instance type and AWS Region.',
    ],
  }),
];

export default questions;
