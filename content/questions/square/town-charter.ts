import type { Question } from '../../../src/content/types.ts';
import { mc, mr } from '../helpers.ts';

const questions: Question[] = [
  mc({
    id: 'town-charter-001',
    building: 'town-charter',
    d: 1,
    stem: 'A candidate sitting a certification exam has a few minutes left and four unanswered questions. The candidate cannot rule out any option on two of them. The exam guide states how unanswered questions are scored. Which action is the BEST use of the remaining time?',
    correct: ['Select an answer for every remaining question, guessing where needed', 'Unanswered questions are scored as incorrect and there is no penalty for guessing, so an answer can only help.'],
    wrong: [
      ['Leave the two uncertain questions blank so they are not counted', 'Blank questions are scored as incorrect, so leaving them blank gains nothing and removes any chance of credit.'],
      ['Answer only the two questions that seem certain and leave the rest', 'Unanswered questions are scored as incorrect, so skipping them throws away possible credit.'],
      ['Answer only questions with four options, because guessing on others is penalized', 'There is no penalty for guessing on any question, so the question type gives no reason to skip.'],
    ],
    slot: 0,
    evidence: ['exam-guide|Unanswered questions are scored as incorrect; there is no penalty for guessing.'],
  }),
  mc({
    id: 'town-charter-002',
    building: 'town-charter',
    d: 1,
    stem: 'A company needs to create thumbnails every time an image is uploaded to an Amazon S3 bucket. Uploads are unpredictable and sometimes none arrive for hours. The company wants the solution with the LEAST operational overhead. Which solution meets these requirements?',
    correct: ['Invoke an AWS Lambda function from the S3 upload event', 'Lambda runs code in response to events and manages server maintenance, capacity provisioning, scaling and patching, which leaves nothing to operate.'],
    wrong: [
      ['Run a fleet of Amazon EC2 instances that poll the bucket for new images', 'The company must patch, scale and monitor the instances, which adds the operational work the requirement tries to avoid.'],
      ['Run a self-managed container cluster on Amazon EC2 instances that scans the bucket', 'The cluster and its instances must be managed and sized by the company, which is more overhead than an event-driven function.'],
      ['Run a single Amazon EC2 instance with a cron job that checks for new objects', 'The instance needs patching and monitoring, and one instance is a single point of failure that the company must handle.'],
    ],
    slot: 1,
    evidence: [
      'lambda-welcome|Lambda automatically manages the underlying infrastructure – including server maintenance, capacity provisioning, scaling, and patching – so you can focus on your application logic.',
      'lambda-welcome|You write a handler function, connect it to a trigger (API Gateway, Amazon S3, Amazon SQS, EventBridge, and 200+ other AWS services), and Lambda executes it.',
    ],
  }),
  mc({
    id: 'town-charter-003',
    building: 'town-charter',
    d: 2,
    stem: 'A company runs a nightly data-conversion batch job on Amazon EC2. The job can be interrupted and restarted, and its start time is flexible within the night. Several options would work. Which option is the MOST cost-effective?',
    correct: ['Run the job on Amazon EC2 Spot Instances', 'Spot Instances use spare capacity at steep discounts and suit applications that are flexible about when they run and can be interrupted, which matches this job.'],
    wrong: [
      ['Run the job on On-Demand Instances', 'On-Demand Instances work, but they give up the discount available for a job that tolerates interruption.'],
      ['Buy three-year Reserved Instances for the job', 'A long commitment pays for capacity around the clock, though the job runs only part of each night.'],
      ['Run the job on Dedicated Hosts', 'Dedicated Hosts add cost for physical server isolation, which the job does not need.'],
    ],
    slot: 2,
    evidence: [
      'ec2-spot|Spot Instances are a cost-effective choice if you can be flexible about when your applications run and if your applications can be interrupted.',
      'ec2-spot|Because Spot Instances enable you to request unused EC2 instances at steep discounts, you can lower your Amazon EC2 costs significantly.',
    ],
  }),
  mc({
    id: 'town-charter-004',
    building: 'town-charter',
    d: 2,
    stem: 'An application on Amazon EC2 instances must read objects from an Amazon S3 bucket. The security team wants the MOST secure way to provide AWS credentials to the application. Which solution meets this requirement?',
    correct: ['Attach an IAM role to the instances through an instance profile', 'The application receives temporary credentials from the role, so no long-term access keys are stored or rotated.'],
    wrong: [
      ['Store an IAM user access key in a configuration file on each instance', 'A long-term key on disk can be copied and must be rotated by hand, which weakens security.'],
      ['Embed an IAM user access key in the application code', 'A long-term key in code is exposed to anyone who can read the code or its repository.'],
      ['Create access keys for the account root user and use them in the application', 'The root user has complete access and should be used only for tasks that need it, so this far exceeds what the application needs.'],
    ],
    slot: 3,
    evidence: [
      'iam-best-practices|Require workloads to use temporary credentials with IAM roles to access AWS',
      'ec2-iam-roles|We designed IAM roles so that your applications can securely make API requests from your instances, without requiring you to manage the security credentials that the applications use.',
    ],
  }),
  mc({
    id: 'town-charter-005',
    building: 'town-charter',
    d: 2,
    stem: 'A web tier on Amazon EC2 sees traffic that rises and falls unpredictably during the day. The company wants to meet performance requirements as demand changes, without paying for idle capacity, and with the LEAST manual intervention. Which solution meets these requirements?',
    correct: ['Use an Auto Scaling group with a target tracking policy on average CPU', 'The group adds capacity when the metric rises and removes it when demand falls, with no operator action.'],
    wrong: [
      ['Run a fixed fleet of instances sized for the highest expected traffic of the year', 'A fixed peak-sized fleet pays for idle capacity whenever demand is lower.'],
      ['Have an operator add and remove instances by hand whenever an alarm fires', 'The scaling is manual, which fails the requirement for the least manual intervention.'],
      ['Use scheduled scaling with fixed capacity changes at set times each day', 'Scheduled actions suit predictable patterns, but this traffic is unpredictable, so capacity will not follow demand.'],
    ],
    slot: 0,
    evidence: [
      'asg-target-tracking|A target tracking scaling policy automatically scales the capacity of your Auto Scaling group based on a target metric value.',
      'asg-what-is|Using auto scaling allows you to maintain application availability and reduce costs by adding capacity to handle peak loads and removing capacity when demand is lower.',
    ],
  }),
  mc({
    id: 'town-charter-006',
    building: 'town-charter',
    d: 2,
    stem: 'A company keeps compliance documents in Amazon S3. Each document is read about once a month, but when it is needed it must open within milliseconds. The company wants the MOST cost-effective storage class that meets this access pattern. Which storage class should it use?',
    correct: ['S3 Standard-IA', 'S3 Standard-IA is designed for long-lived, infrequently accessed data and still provides millisecond access.'],
    wrong: [
      ['S3 Standard', 'S3 Standard meets the access time, but it is intended for frequently accessed data and is not the lowest-cost fit for monthly reads.'],
      ['S3 Glacier Flexible Retrieval', 'Objects must be restored before use, with retrieval times of minutes to hours, so they do not open within milliseconds.'],
      ['S3 Glacier Deep Archive', 'Retrieval takes hours and objects are not available for real-time access, so it fails the millisecond requirement.'],
    ],
    slot: 1,
    evidence: [
      's3-storage-classes|S3 Standard-IA and S3 One Zone-IA storage classes are designed for long-lived and infrequently accessed data.',
      's3-storage-classes|S3 Standard-IA and S3 One Zone-IA objects are available for millisecond access (similar to the S3 Standard storage class).',
      's3-storage-classes|However, S3 Glacier Flexible Retrieval and S3 Glacier Deep Archive objects are archived, and not available for real-time access.',
    ],
  }),
  mr({
    id: 'town-charter-007',
    building: 'town-charter',
    d: 2,
    stem: 'A company stores private reports in an Amazon S3 bucket. Only the company\'s own IAM principals may read them. Which TWO actions MOST effectively restrict access? (Choose two.)',
    correct: [
      ['Turn on S3 Block Public Access for the bucket', 'Block Public Access settings override policies and permissions that would otherwise make the data public.'],
      ['Grant the application read access through an IAM role with least-privilege permissions', 'A role limits access to authorized principals and grants only the permissions the task needs.'],
    ],
    wrong: [
      ['Add an ACL that grants read access to all users', 'This makes the reports readable by anyone, which defeats the restriction.'],
      ['Allow any principal in a bucket policy and rely on hard-to-guess object names', 'Obscure names are not access control, and the policy still allows everyone.'],
      ['Share one IAM user\'s long-term access keys with every team', 'Shared long-term keys cannot be tied to one principal and are harder to protect than role credentials.'],
    ],
    slots: [2, 4],
    evidence: [
      's3-block-public-access|S3 Block Public Access settings override these policies and permissions so that you can limit public access to these resources.',
      'iam-best-practices|Apply least-privilege permissions When you set permissions with IAM policies, grant only the permissions required to perform a task.',
    ],
  }),
  mc({
    id: 'town-charter-008',
    building: 'town-charter',
    d: 3,
    stem: 'A company runs a stateless web application on Amazon EC2 instances behind an Application Load Balancer, in one Availability Zone. The application must keep serving users if one Availability Zone becomes unavailable. Many designs would work. Which design is the MOST cost-effective?',
    correct: ['Use an Auto Scaling group across two Availability Zones behind the load balancer', 'The group balances instances across zones and launches instances in the remaining zone if one becomes unavailable, without a permanently idle duplicate.'],
    wrong: [
      ['Keep one Availability Zone and move every instance to the largest instance size', 'A larger instance does not survive the loss of its zone, so it fails the availability requirement.'],
      ['Run a permanent full-size copy of the whole fleet in a second AWS Region', 'It meets availability but pays for a full idle duplicate, which costs more than needed.'],
      ['Run a full-size fleet in each of three Availability Zones at all times', 'It meets availability but carries a full idle fleet in every zone, which costs more than needed.'],
    ],
    slot: 2,
    tags: [],
    evidence: [
      'asg-benefits|If one Availability Zone becomes unavailable, Amazon EC2 Auto Scaling can launch instances in another one to compensate.',
      'asg-what-is|You can specify multiple Availability Zones for your Auto Scaling group, and Amazon EC2 Auto Scaling balances your instances evenly across the Availability Zones as the group scales.',
    ],
  }),
  mc({
    id: 'town-charter-009',
    building: 'town-charter',
    d: 3,
    stem: 'A company\'s checkout site calls an order-processing service on Amazon EC2 synchronously. During flash sales the service is overwhelmed and some orders are lost. A review of the existing architecture must find the improvement with the LEAST data loss that keeps the current processing code. Which change should the company make?',
    correct: ['Place an Amazon SQS queue between the site and the service so the service polls it', 'A durable queue decouples the two components, so orders wait in the queue instead of being lost when the service is busy.'],
    wrong: [
      ['Increase the timeout of the site\'s request to the order-processing service', 'The site waits longer, but an overwhelmed service still drops work and orders can still be lost.'],
      ['Move the order-processing service to a larger Amazon EC2 instance type', 'A larger instance raises the ceiling, but spikes can still exceed it and nothing buffers the excess orders.'],
      ['Put Amazon CloudFront in front of the order endpoint to cache requests', 'CloudFront caches content at edge locations and does not hold orders for later processing.'],
    ],
    slot: 3,
    evidence: [
      'sqs-what-is|Amazon Simple Queue Service (Amazon SQS) offers a secure, durable, and available hosted queue that lets you integrate and decouple distributed software systems and components.',
    ],
  }),
  mr({
    id: 'town-charter-010',
    building: 'town-charter',
    d: 3,
    stem: 'A company is moving a containerized web application and its relational database from self-managed servers to AWS. Leadership wants the LEAST operational overhead for both the application tier and the database tier. Which TWO actions meet these requirements? (Choose two.)',
    correct: [
      ['Run the containers on Amazon ECS with AWS Fargate', 'Fargate runs containers without having to manage servers or clusters of EC2 instances.'],
      ['Move the database to Amazon RDS', 'Amazon RDS is a managed database service that handles backups, software patching, automatic failure detection and recovery.'],
    ],
    wrong: [
      ['Run the containers on a self-managed cluster of Amazon EC2 instances', 'The company must manage and patch the servers and the cluster, which keeps the overhead.'],
      ['Install the database engine on Amazon EC2 instances and script the backups', 'The company must handle software install, patching and backups itself, which keeps the overhead.'],
      ['Patch the operating system images by hand every month', 'Manual patching is overhead, and this does not reduce it for either tier.'],
    ],
    slots: [0, 3],
    evidence: [
      'fargate-ecs|AWS Fargate is a technology that you can use with Amazon ECS to run containers without having to manage servers or clusters of Amazon EC2 instances.',
      'rds-what-is|Amazon RDS manages backups, software patching, automatic failure detection, and recovery.',
    ],
  }),
];

export default questions;
