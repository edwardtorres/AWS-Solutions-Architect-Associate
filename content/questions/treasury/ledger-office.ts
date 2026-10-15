import type { Question } from '../../../src/content/types.ts';
import { mc, mr } from '../helpers.ts';

const questions: Question[] = [
  mc({
    id: 'ledger-office-001',
    building: 'ledger-office',
    bullets: ['4.1-K1'],
    d: 1,
    stem: 'A research institute stores a large public dataset in an Amazon S3 bucket and shares it with university partners that have their own AWS accounts. The institute wants the partners to pay the request and download costs for their own use of the data. Which solution meets this requirement with the LEAST change to the bucket?',
    correct: ['Enable Requester Pays on the bucket and have the partners make authenticated requests', 'With Requester Pays, the requester instead of the bucket owner pays the cost of the request and the data download.'],
    wrong: [
      ['Apply a cost allocation tag to the bucket and activate it in the Billing and Cost Management console', 'A tag only labels the bucket costs in reports; the institute would still be charged for the partners\' downloads.'],
      ['Move the bucket to a different storage class and keep the bucket open to anonymous access', 'A storage class changes how storage is billed, and the owner would still pay for the downloads by anonymous users.'],
      ['Add the partner accounts to the institute\'s AWS Organizations organization with consolidated billing', 'Consolidated billing combines the member accounts onto one bill paid by the management account, so the institute would pay.'],
    ],
    slot: 0,
    evidence: [
      'requester-pays|With Requester Pays buckets, the requester instead of the bucket owner pays the cost of the request and the data download from the bucket.',
      'requester-pays|Typically, you configure buckets to be Requester Pays buckets when you want to share data but not incur charges associated with others accessing the data.',
    ],
  }),
  mc({
    id: 'ledger-office-002',
    building: 'ledger-office',
    bullets: ['4.1-K1'],
    d: 2,
    stem: 'A company shares data from an Amazon S3 bucket that has Requester Pays enabled. A partner\'s application runs in the partner\'s account A and assumes an IAM role that belongs to the partner\'s separate account B before it downloads objects. Which account is charged for the request and the data download?',
    correct: ['Account B, the account to which the assumed role belongs', 'When the requester assumes an IAM role before making the request, the account to which the role belongs is charged for the request.'],
    wrong: [
      ['Account A, the account where the application runs and made the call', 'The charge follows the account the assumed role belongs to, not the account where the application is running.'],
      ['The account that owns the bucket, because role-based requests are billed to the owner', 'Requester Pays moves the request and download costs away from the bucket owner, including for role-based requests.'],
      ['The management account of the bucket owner\'s organization, which pays for all member accounts', 'Consolidated billing covers charges inside the owner\'s organization; the partner accounts are the requesters here.'],
    ],
    slot: 1,
    evidence: [
      'requester-pays|When the requester assumes an AWS Identity and Access Management (IAM) role before making their request, the account to which the role belongs is charged for the request.',
      'requester-pays|The bucket owner always pays the cost of storing data.',
    ],
  }),
  mr({
    id: 'ledger-office-003',
    building: 'ledger-office',
    bullets: ['4.1-K1', '4.1-K2'],
    d: 3,
    stem: 'A company publishes a genomics dataset in an Amazon S3 bucket for customers who each have an AWS account. The company wants customers to pay for their own downloads, and wants to report the storage cost of this bucket separately from its other projects in the same account. Which TWO actions meet these requirements with the LEAST operational overhead? (Choose two.)',
    correct: [
      ['Enable Requester Pays on the bucket', 'The requester pays the request and download cost, while the company keeps paying only to store the data.'],
      ['Tag the bucket with a project key and activate the key as a cost allocation tag', 'Activated cost allocation tags organise resource costs on the cost allocation report, so the bucket can be reported by project.'],
    ],
    wrong: [
      ['Make the bucket public so that customers can download without signing in', 'Requester Pays does not allow anonymous access, and downloads by anonymous users would not be charged to anyone but the owner.'],
      ['Invite the customer accounts into the company\'s organization to share one bill', 'This puts all charges on the management account and does not separate the bucket\'s costs by project.'],
      ['Create a separate AWS account for every customer and copy the dataset into each one', 'This multiplies storage and management effort and does not report this bucket separately from the other projects.'],
    ],
    slots: [1, 3],
    evidence: [
      'requester-pays|If you enable Requester Pays on a general purpose bucket, anonymous access to that bucket is not allowed.',
      'requester-pays|The bucket owner always pays the cost of storing data.',
      'cost-alloc-tags|After you activate cost allocation tags, AWS uses the cost allocation tags to organize your resource costs on your cost allocation report, to make it easier for you to categorize and track your AWS costs.',
    ],
  }),
  mc({
    id: 'ledger-office-004',
    building: 'ledger-office',
    bullets: ['4.1-K2'],
    d: 2,
    stem: 'A finance team tagged all Amazon EC2 instances with a CostCenter tag, but the tag does not appear as a grouping option in AWS Cost Explorer. The team wants to see costs by cost center with the LEAST effort. Which action meets this requirement?',
    correct: ['Activate the CostCenter tag as a cost allocation tag in the Billing and Cost Management console', 'Tags must be activated as cost allocation tags before they can appear in Cost Explorer or on a cost allocation report.'],
    wrong: [
      ['Re-apply the CostCenter tag to every instance by using a different tag key name', 'The key is not the problem; a tag with any key name still has to be activated before it shows in Cost Explorer.'],
      ['Place all of the accounts into an organization and turn on consolidated billing', 'Consolidated billing gives one bill for several accounts but does not activate a tag for cost reporting.'],
      ['Wait for the tag to appear on its own, because every tag is shown in Cost Explorer automatically', 'Tags do not appear automatically; both AWS-generated and user-defined tags must be activated separately.'],
    ],
    slot: 2,
    evidence: [
      'cost-alloc-tags|You must activate both types of tags separately before they can appear in Cost Explorer or on a cost allocation report.',
      'cost-alloc-tags|All tags can take up to 24 hours to appear in the Billing and Cost Management console.',
    ],
  }),
  mc({
    id: 'ledger-office-005',
    building: 'ledger-office',
    bullets: ['4.1-K2'],
    d: 2,
    stem: 'A company runs twelve AWS accounts that each receive a separate bill. The company wants one bill, wants to combine usage across the accounts so that volume pricing and Reserved Instance discounts are shared, and does not want to pay a fee for the feature. Which solution meets these requirements?',
    correct: ['Create an AWS Organizations organization and use consolidated billing from its management account', 'Consolidated billing gives one bill, combines usage across accounts to share discounts, and is offered at no additional cost.'],
    wrong: [
      ['Buy Reserved Instances in each account and send each invoice to the finance team by email', 'Separate accounts keep separate bills, and the discounts would not be shared across accounts.'],
      ['Create a budget in each account and review the budgets together every month', 'AWS Budgets tracks costs and alerts on thresholds; it does not merge bills or share discounts.'],
      ['Deliver a Cost and Usage Report from each account to one S3 bucket and add the totals', 'The reports give detailed data but the accounts are still billed separately with no shared discounts.'],
    ],
    slot: 3,
    evidence: [
      'consolidated-billing|One bill – You get one bill for multiple accounts in the same SOR.',
      'consolidated-billing|This shares the volume pricing discounts, Reserved Instance discounts, and Savings Plans.',
      'consolidated-billing|No extra fee – Consolidated billing is offered at no additional cost.',
    ],
  }),
  mc({
    id: 'ledger-office-006',
    building: 'ledger-office',
    bullets: ['4.1-K3'],
    d: 1,
    stem: 'A company wants its finance team to receive an email notification when monthly AWS spending approaches or exceeds a limit that the team defines. The company wants the LEAST operational overhead. Which AWS service should the company use?',
    correct: ['AWS Budgets, with a budget that has an alert threshold', 'Budgets lets you set spending limits and receive alerts when costs approach or exceed your defined threshold.'],
    wrong: [
      ['AWS Cost Explorer, with a saved report of monthly cost by service', 'Cost Explorer views and analyses costs and usage; it is not the service for setting limits and alerts.'],
      ['AWS Cost and Usage Report, delivered daily to an Amazon S3 bucket', 'The report publishes detailed billing data to S3 but sends no alert when spending reaches a limit.'],
      ['Cost allocation tags, activated on every resource in the account', 'Tags organise costs on reports but do not compare spending with a limit or send notifications.'],
    ],
    slot: 0,
    evidence: [
      'budgets-managing|Set spending limits for services and receive alerts when costs approach or exceed your defined threshold.',
      'ce-what-is|AWS Cost Explorer is a tool that enables you to view and analyze your costs and usage.',
    ],
  }),
  mc({
    id: 'ledger-office-007',
    building: 'ledger-office',
    bullets: ['4.1-K3'],
    d: 2,
    stem: 'A data analyst needs the most detailed AWS billing data, with line items broken down by hour and by product, delivered to a storage location the company owns so that the analyst can query it with SQL in Amazon Athena. Which solution meets these requirements with the LEAST custom work?',
    correct: ['Configure an AWS Cost and Usage Report that delivers to an Amazon S3 bucket', 'The report holds the most comprehensive cost and usage data, is published to your own S3 bucket, and can be queried with Athena.'],
    wrong: [
      ['Use the main graph in AWS Cost Explorer and export the chart each day to a file', 'Cost Explorer is for viewing and analysing costs, and exported charts do not give hourly line items to query.'],
      ['Create an AWS Budgets budget for each service and read the budget history', 'A budget tracks spending against limits and does not provide line-item billing data to query.'],
      ['Tag every resource and read the tag names from the Billing and Cost Management console', 'Tags label resources; they are not a delivered data set that can be queried with SQL.'],
    ],
    slot: 1,
    evidence: [
      'cur-what-is|AWS Cost and Usage Reports (AWS CUR) contains the most comprehensive set of cost and usage data available.',
      'cur-what-is|You can use Cost and Usage Reports to publish your AWS billing reports to an Amazon Simple Storage Service (Amazon S3) bucket that you own.',
      'cur-what-is|Using your report You can download your report from the Amazon S3 console, query the report using Amazon Athena, or upload the report into Amazon Redshift or Quick.',
    ],
  }),
  mr({
    id: 'ledger-office-008',
    building: 'ledger-office',
    bullets: ['4.1-K3'],
    d: 3,
    stem: 'A finance team wants to explore the last year of AWS costs by service in a graph without writing queries, and wants to be told when the utilization of its Reserved Instances falls below a target. Which TWO actions meet these requirements with the LEAST operational overhead? (Choose two.)',
    correct: [
      ['Use AWS Cost Explorer to view and filter costs and usage by service', 'Cost Explorer lets you explore usage and costs with the main graph, with filters and groupings you can change.'],
      ['Create an AWS Budgets budget that monitors Reserved Instance utilization with an alert', 'Budgets can monitor the aggregate utilization and coverage of Reserved Instances and alert on a threshold.'],
    ],
    wrong: [
      ['Deliver an AWS Cost and Usage Report to Amazon S3 and build graphs with queries', 'The report is a detailed data set that needs queries and a charting tool, which the team wants to avoid.'],
      ['Enable Requester Pays on the Amazon S3 buckets that store the company data', 'Requester Pays shifts request and download charges to requesters; it gives no cost graphs or utilization alerts.'],
      ['Activate cost allocation tags on all resources and read the tag names each month', 'Tags group costs on reports but do not graph the full year of costs or alert on Reserved Instance utilization.'],
    ],
    slots: [0, 4],
    evidence: [
      'ce-what-is|You can explore your usage and costs using the main graph, the Cost Explorer cost and usage reports, or the Cost Explorer RI reports.',
      'budgets-managing|You can use AWS Budgets to monitor your aggregate utilization and coverage metrics for your Reserved Instances (RIs) or Savings Plans.',
    ],
  }),
  mc({
    id: 'ledger-office-009',
    building: 'ledger-office',
    bullets: ['4.1-K2'],
    d: 3,
    tags: ['mock-reserve'],
    stem: 'A company uses AWS Organizations and applies a Project tag to resources in several member accounts. A finance analyst signs in to a member account but cannot find the Project tag in the cost allocation tags manager of the Billing console, and wants the tag to appear in Cost Explorer for the whole organization. Which solution meets this requirement with the LEAST effort?',
    correct: ['Sign in to the management account and activate the Project tag as a cost allocation tag in the Billing console', 'In an organization, only the management account has access to the cost allocation tags manager, and a tag must be activated before it can appear in Cost Explorer.'],
    wrong: [
      ['Have an administrator in each member account activate the tag in that account\'s Billing console', 'Member accounts of an organization have no access to the cost allocation tags manager, so the tag cannot be activated there.'],
      ['Attach an IAM policy that allows tagging actions to every user in each member account', 'Permission to tag resources does not activate the tag for cost reporting, and the tag is already applied.'],
      ['Create an AWS Budgets budget for each member account that is filtered on the Project tag', 'A budget does not activate the tag for Cost Explorer grouping, and it adds one budget per account to manage.'],
    ],
    slot: 2,
    evidence: [
      'cost-alloc-tags|Only the management account in an organization and single accounts that aren\'t members of an organization have access to the cost allocation tags manager in the Billing console.',
      'cost-alloc-tags|You must activate both types of tags separately before they can appear in Cost Explorer or on a cost allocation report.',
    ],
  }),
];

export default questions;
