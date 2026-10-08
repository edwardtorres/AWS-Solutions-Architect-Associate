import type { GlossaryTerm } from '../src/content/types.ts';
import { b } from './helpers.ts';

const t = (id: string, term: string, definition: GlossaryTerm['definition'], aliases?: string[]): GlossaryTerm =>
  aliases ? { id, term, aliases, definition } : { id, term, definition };

/** Each term is defined here once. Notes reference terms with {{term:id}} and never redefine them. */
const glossary: GlossaryTerm[] = [
  // ── Founders' Square ──
  t('well-architected-framework', 'AWS Well-Architected Framework',
    b('AWS\'s set of design principles and best practices for building workloads, organised into six pillars. The SAA exam validates your ability to design solutions based on it.',
      ['waf-pillars', 'exam-guide'],
      ['waf-pillars|the six pillars of operational excellence, security, reliability, performance efficiency, cost optimization, and sustainability',
       "exam-guide|The exam validates a candidate's ability to design solutions based on the AWS Well-Architected Framework."]),
    ['Well-Architected']),
  t('pillar', 'Pillar',
    b('One of the six areas of the Well-Architected Framework: operational excellence, security, reliability, performance efficiency, cost optimization and sustainability.',
      'waf-pillars', ['the six pillars of operational excellence, security, reliability, performance efficiency, cost optimization, and sustainability'])),
  t('root-user', 'Root user',
    b('The single sign-in identity you begin with when you create an AWS account. It has complete access to the account, so it is reserved for the few tasks that need it.',
      'iam-root-user', ['you begin with a single sign-in identity that has complete access to all AWS', 'Use the root user only to perform the tasks that require root-level permissions.']),
    ['AWS account root user']),
  t('mfa', 'Multi-factor authentication (MFA)',
    b('A sign-in check that needs more than a password. AWS recommends turning it on to help protect your resources, including the root user.',
      'iam-mfa', ['we recommend that you configure multi-factor authentication (MFA) to help protect your AWS resources']),
    ['MFA']),
  t('budget', 'Budget (AWS Budgets)',
    b('A spending or usage limit you set in AWS Budgets that alerts you when actual or forecasted costs approach or exceed a threshold.',
      'budgets-managing', ['Set spending limits for services and receive alerts when costs approach or exceed your defined threshold.']),
    ['AWS Budgets budget']),
  t('cidr-block', 'CIDR block',
    b('A range of IP addresses written in CIDR (Classless Inter-Domain Routing) notation, such as a VPC or subnet range.',
      'vpc-subnet-sizing', ['The IP addresses for your subnets are represented using Classless Inter-Domain Routing (CIDR) notation.']),
    ['CIDR']),
  t('protocol', 'Protocol (network)',
    b('The traffic type a network rule matches. In security group rules the most common are TCP, UDP and ICMP.',
      'vpc-sg-rules', ['The most common protocols are 6 (TCP), 17 (UDP), and 1 (ICMP).']),
    ['IP protocol']),
  t('port-range', 'Port range',
    b('For TCP and UDP rules, the range of ports a rule allows or matches.',
      'vpc-sg-rules', ['Port range: For TCP, UDP, or a custom protocol, the range of ports to allow.'])),
  t('metric', 'Metric (CloudWatch)',
    b('Performance data that CloudWatch collects and tracks at intervals you choose, kept in a namespace so different applications are not mixed together.',
      ['cw-concepts', 'cw-what-is'], ['cw-concepts|A namespace is a container for CloudWatch metrics.', 'cw-what-is|Metrics collect and track key performance data at user-defined intervals.']),
    ['CloudWatch metric']),
  t('alarm', 'Alarm (CloudWatch)',
    b('A CloudWatch rule that watches a metric and sends a notification or takes an automatic action when a threshold is breached.',
      'cw-alarms', ['You can create alarms that watch metrics and send notifications or automatically make changes to the resources you are monitoring when a threshold is breached.']),
    ['CloudWatch alarm']),
  t('log-group', 'Log group',
    b('A CloudWatch Logs container for log streams that share the same retention, monitoring and access control settings.',
      'cwl-concepts', ['Log groups define groups of log streams that share the same retention, monitoring, and access control settings.']),
    ['CloudWatch log group']),
  t('cloudtrail-event', 'CloudTrail event',
    b('A record of an action taken by a user, role or AWS service, including actions in the console, CLI, SDKs and APIs.',
      'cloudtrail-what-is', ['Actions taken by a user, role, or an AWS service are recorded as events in CloudTrail.']),
    ['CloudTrail management event']),
  t('config-rule', 'AWS Config rule',
    b('A rule that represents an ideal configuration setting; AWS Config evaluates your resources against it.',
      'config-rules', ['You do this by creating AWS Config rules, which represent your ideal configuration settings.'])),
];

export default glossary;
