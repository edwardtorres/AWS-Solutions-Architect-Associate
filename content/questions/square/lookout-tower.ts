import type { Question } from '../../../src/content/types.ts';
import { mc, mr } from '../helpers.ts';

const questions: Question[] = [
  mc({
    id: 'lookout-tower-001',
    building: 'lookout-tower',
    d: 1,
    stem: 'A security team discovers that an Amazon EC2 instance was terminated. The team needs to find out which IAM user made the API call and when. Which service should the team use to answer this question?',
    correct: ['AWS CloudTrail', 'CloudTrail records actions taken by a user, role, or service as events, so it shows who made the call and when.'],
    wrong: [
      ['Amazon CloudWatch metrics', 'Metrics track performance data such as CPU use and do not record which identity made an API call.'],
      ['AWS Config', 'AWS Config records how a resource was configured over time, but the question is about the identity that made the call.'],
      ['Amazon CloudWatch alarms', 'An alarm reacts to a metric crossing a threshold and does not record who performed an action.'],
    ],
    slot: 0,
    evidence: [
      'cloudtrail-what-is|Actions taken by a user, role, or an AWS service are recorded as events in CloudTrail.',
      'cloudtrail-what-is|You can identify who or what took which action, what resources were acted upon, when the event occurred, and other details to help you analyze and respond to activity in your AWS account.',
    ],
  }),
  mc({
    id: 'lookout-tower-002',
    building: 'lookout-tower',
    d: 1,
    stem: 'An operations team wants to be notified by email whenever the CPU utilization of a production Amazon EC2 instance stays above a set limit. Which solution is the SIMPLEST way to meet this requirement?',
    correct: ['Create an Amazon CloudWatch alarm on the CPU metric that notifies an Amazon SNS topic', 'An alarm watches a metric and sends a notification when its threshold is breached.'],
    wrong: [
      ['Create an AWS CloudTrail trail that delivers events to Amazon S3', 'A trail records API activity and does not watch the CPU metric of an instance.'],
      ['Create an AWS Config rule that evaluates the instance type', 'A Config rule evaluates configuration settings, not a running performance value such as CPU use.'],
      ['Set a retention period on the instance log group in Amazon CloudWatch Logs', 'Retention controls how long log events are kept and does not notify anyone about CPU use.'],
    ],
    slot: 1,
    evidence: [
      'cw-alarms|You can create alarms that watch metrics and send notifications or automatically make changes to the resources you are monitoring when a threshold is breached.',
    ],
  }),
  mc({
    id: 'lookout-tower-003',
    building: 'lookout-tower',
    d: 2,
    stem: 'A company requires that every Amazon EBS volume in its account stays encrypted. The company wants resources that break this setting to be flagged as noncompliant automatically, with the LEAST ongoing effort. Which solution meets these requirements?',
    correct: ['Create an AWS Config rule that represents the encryption setting', 'A Config rule states the ideal configuration, and AWS Config flags resources that violate it as noncompliant.'],
    wrong: [
      ['Create an Amazon CloudWatch alarm on the volume read throughput metric', 'A metric alarm watches performance values and cannot tell whether a volume is encrypted.'],
      ['Search the AWS CloudTrail event history every week for volume creation calls', 'It is a manual process with ongoing effort, and it does not flag noncompliant resources automatically.'],
      ['Create a metric filter on an Amazon CloudWatch Logs log group', 'A metric filter turns log events into metrics and does not evaluate the configuration of volumes.'],
    ],
    slot: 2,
    evidence: [
      'config-rules|You do this by creating AWS Config rules, which represent your ideal configuration settings.',
      'config-what-is|When AWS Config detects that a resource violates the conditions in one of your rules, AWS Config flags the resource as noncompliant and sends a notification.',
    ],
  }),
  mc({
    id: 'lookout-tower-004',
    building: 'lookout-tower',
    d: 2,
    stem: 'During an audit, a company must show how the configuration of a security group and its related resources looked six months ago and how it changed since then. Which service BEST provides this information?',
    correct: ['AWS Config', 'It keeps the configuration of resources and their relationships and shows how they changed over time.'],
    wrong: [
      ['AWS CloudTrail Event history', 'It covers only the past 90 days of management events, and it records API activity, not the configuration of resources.'],
      ['Amazon CloudWatch dashboards', 'Dashboards visualize metrics and logs and do not hold the configuration history of resources.'],
      ['Amazon CloudWatch alarms', 'Alarms react to a metric threshold and do not record past configurations.'],
    ],
    slot: 3,
    evidence: [
      'config-what-is|how they were configured in the past so that you can see how the configurations and relationships change over time',
      'cloudtrail-what-is|The Event history provides a viewable, searchable, downloadable, and immutable record of the past 90 days of management events in an AWS Region.',
    ],
  }),
  mc({
    id: 'lookout-tower-005',
    building: 'lookout-tower',
    d: 2,
    stem: 'A company must keep a record of all management API calls made in its account for 13 months, stored in Amazon S3, with the LOWEST operational overhead. Which solution meets these requirements?',
    correct: ['Create an AWS CloudTrail trail that delivers the events to an Amazon S3 bucket', 'A trail captures AWS activity and stores the events in an S3 bucket, so the record lasts as long as the bucket data does.'],
    wrong: [
      ['Rely on the AWS CloudTrail Event history', 'Event history shows only the past 90 days of management events, which is shorter than 13 months.'],
      ['Turn on the AWS Config configuration recorder', 'It records resource configurations and relationships, not a record of the API calls made.'],
      ['Create an Amazon CloudWatch dashboard that shows API activity', 'A dashboard displays metrics and does not keep a record of each API call for 13 months.'],
    ],
    slot: 0,
    evidence: [
      'cloudtrail-what-is|Trails – Trails capture a record of AWS activities, delivering and storing these events in an Amazon S3 bucket, with optional delivery to CloudWatch Logs and Amazon EventBridge.',
      'cloudtrail-what-is|The Event history provides a viewable, searchable, downloadable, and immutable record of the past 90 days of management events in an AWS Region.',
    ],
  }),
  mc({
    id: 'lookout-tower-006',
    building: 'lookout-tower',
    d: 2,
    stem: 'An application sends its logs to an Amazon CloudWatch Logs log group, and the logs are currently kept forever. Compliance requires deleting log events after 90 days. Which solution meets this requirement with the LEAST effort?',
    correct: ['Set a 90-day retention policy on the log group', 'Retention is a log group setting that applies to all log streams in the group, and old events then expire without any code.'],
    wrong: [
      ['Set a 90-day retention policy on each log stream separately', 'Retention settings are assigned to log groups, not to individual log streams.'],
      ['Create an AWS CloudTrail trail with a 90-day setting', 'A trail records API activity and does not control how long CloudWatch Logs keeps log events.'],
      ['Write a scheduled script that deletes old log events from the log group', 'It would work, but it adds code to build and run, which is more effort than a built-in setting.'],
    ],
    slot: 1,
    evidence: [
      'cwl-what-is|By default, logs are kept indefinitely and never expire.',
      'cwl-concepts|Just like metric filters, retention settings are also assigned to log groups, and the retention assigned to a log group is applied to their log streams.',
    ],
  }),
  mc({
    id: 'lookout-tower-007',
    building: 'lookout-tower',
    d: 3,
    stem: 'An application writes ERROR lines to an Amazon CloudWatch Logs log group. The team wants an email whenever the number of ERROR lines passes a threshold within five minutes, with the LEAST development effort. Which solution meets these requirements?',
    correct: ['Create a metric filter on the log group, a CloudWatch alarm on the metric, and an Amazon SNS topic for the email', 'A metric filter turns matching log events into a metric, and an alarm on that metric notifies an SNS topic when the threshold is breached.'],
    wrong: [
      ['Create an AWS CloudTrail trail and search it for the word ERROR', 'A trail records API activity of the account, not the log lines that an application writes.'],
      ['Create an AWS Config rule that matches the word ERROR in the logs', 'Config rules evaluate resource configuration settings and do not read application log lines.'],
      ['Write a function that reads the log group every minute and counts the lines', 'It would work, but it needs custom code that a metric filter and alarm make unnecessary.'],
    ],
    slot: 2,
    evidence: [
      'cwl-concepts|You can use metric filters to extract metric observations from ingested events and transform them to data points in a CloudWatch metric.',
      'cw-alarms|The action can be sending a notification to an Amazon SNS topic, performing an Amazon EC2 action or an Amazon EC2 Auto Scaling action',
    ],
  }),
  mr({
    id: 'lookout-tower-008',
    building: 'lookout-tower',
    d: 3,
    stem: 'A company has two requirements. First, it must be able to find out which user changed a security group rule. Second, it must automatically flag security groups that break its rule against opening SSH to the internet. Which TWO actions meet these requirements? (Choose two.)',
    correct: [
      ['Use AWS CloudTrail to record the API calls that change security groups', 'CloudTrail records the actions taken by a user, role, or service, so it answers who made the change.'],
      ['Create an AWS Config rule that evaluates security group settings', 'A Config rule represents the ideal configuration, and resources that violate it are flagged as noncompliant.'],
    ],
    wrong: [
      ['Create an Amazon CloudWatch alarm on the NetworkIn metric of the instances', 'A metric alarm watches traffic volume and shows neither the user who made a change nor the security group configuration.'],
      ['Build an Amazon CloudWatch dashboard of EC2 CPU utilization', 'A dashboard visualizes metrics and does not identify users or evaluate configuration.'],
      ['Set a one-year retention period on an Amazon CloudWatch Logs log group', 'Retention only decides how long log events are kept and neither records API callers nor evaluates security groups.'],
    ],
    slots: [0, 2],
    evidence: [
      'cloudtrail-what-is|Actions taken by a user, role, or an AWS service are recorded as events in CloudTrail.',
      'config-what-is|When AWS Config detects that a resource violates the conditions in one of your rules, AWS Config flags the resource as noncompliant and sends a notification.',
    ],
  }),
  mc({
    id: 'lookout-tower-009',
    building: 'lookout-tower',
    d: 3,
    stem: 'A company has a multi-Region AWS CloudTrail trail with its default settings. An auditor now needs a record of who reads and deletes objects in one Amazon S3 bucket that holds regulated data. The company wants to keep the number of logged events as low as possible. Which solution meets these requirements?',
    correct: ['Add data events for only that bucket to the trail', 'Object-level operations such as GetObject and DeleteObject are data events, which are not logged by default, and limiting them to one bucket keeps the volume low.'],
    wrong: [
      ['Add data events for all S3 buckets to the trail', 'It records the object-level activity, but data events are high-volume, so logging every bucket exceeds the low volume the company wants.'],
      ['Enable Insights events on the trail', 'Insights events analyze management events for unusual API call rates and do not record object-level reads and deletes.'],
      ['Use the CloudTrail Event history for the bucket', 'Event history holds management events only, so it does not contain GetObject or DeleteObject calls.'],
    ],
    slot: 3,
    evidence: [
      'cloudtrail-concepts|By default, trails and event data stores log management events, but not data or Insights events.',
      'cloudtrail-concepts|Example data events include: Amazon S3 object-level API activity (for example, GetObject, DeleteObject, and PutObject API operations) on objects in S3 buckets.',
      'cloudtrail-concepts|Data events are often high-volume activities.',
    ],
  }),
  mr({
    id: 'lookout-tower-010',
    building: 'lookout-tower',
    d: 2,
    stem: 'An operations team creates an Amazon CloudWatch alarm on the average CPU utilization of an Amazon EC2 Auto Scaling group. When the threshold is breached, the alarm must alert the engineers and add capacity to the group. Which TWO alarm actions meet these requirements? (Choose two.)',
    correct: [
      ['Send a notification to an Amazon SNS topic', 'An alarm action can send a notification to an Amazon SNS topic, which alerts the engineers.'],
      ['Perform an Amazon EC2 Auto Scaling action', 'An alarm action can be an Amazon EC2 Auto Scaling action, which adds capacity to the group.'],
    ],
    wrong: [
      ['Evaluate the Auto Scaling group against an AWS Config rule', 'This is not an alarm action; Config rules evaluate configuration settings separately from metric alarms.'],
      ['Record the breach as an AWS CloudTrail data event', 'This is not an alarm action, and data events describe resource operations such as S3 object requests.'],
      ['Change the retention period of a CloudWatch Logs log group', 'This is not an alarm action, and it neither alerts the engineers nor adds capacity.'],
    ],
    slots: [4, 1],
    evidence: [
      'cw-alarms|The action can be sending a notification to an Amazon SNS topic, performing an Amazon EC2 action or an Amazon EC2 Auto Scaling action',
    ],
  }),
];

export default questions;
