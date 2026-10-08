import type { Source } from '../src/content/types.ts';

const aws = (id: string, url: string, title: string): Source => ({ id, url, title, kind: 'aws' });
const azure = (id: string, url: string, title: string): Source => ({ id, url, title, kind: 'azure' });

const D = 'https://docs.aws.amazon.com';
const L = 'https://learn.microsoft.com/en-us/azure';

/** Every page cited by the notes, once. Ids are stable; `npm run check:links` verifies each URL, anchor and quote. */
const sources: Source[] = [
  // Exam guide and Well-Architected
  aws('exam-guide', `${D}/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html`, 'AWS Certified Solutions Architect - Associate (SAA-C03) exam guide'),
  aws('waf-pillars', `${D}/wellarchitected/latest/framework/the-pillars-of-the-framework.html`, 'AWS Well-Architected Framework: The pillars of the framework'),
  aws('waf-security', `${D}/wellarchitected/latest/framework/security.html`, 'AWS Well-Architected Framework: Security'),
  aws('waf-reliability', `${D}/wellarchitected/latest/framework/reliability.html`, 'AWS Well-Architected Framework: Reliability'),
  aws('waf-performance', `${D}/wellarchitected/latest/framework/performance-efficiency.html`, 'AWS Well-Architected Framework: Performance efficiency'),
  aws('waf-cost', `${D}/wellarchitected/latest/framework/cost-optimization.html`, 'AWS Well-Architected Framework: Cost optimization'),
  aws('waf-opex', `${D}/wellarchitected/latest/framework/operational-excellence.html`, 'AWS Well-Architected Framework: Operational excellence'),
  aws('waf-sustainability', `${D}/wellarchitected/latest/framework/sustainability.html`, 'AWS Well-Architected Framework: Sustainability'),
  aws('waf-tool', 'https://aws.amazon.com/well-architected-tool/', 'AWS Well-Architected Tool'),
  aws('lambda-welcome', `${D}/lambda/latest/dg/welcome.html`, 'What is AWS Lambda?'),

  // Account basics and cost visibility
  aws('iam-root-user', `${D}/IAM/latest/UserGuide/id_root-user.html`, 'AWS account root user'),
  aws('iam-mfa', `${D}/IAM/latest/UserGuide/id_credentials_mfa.html`, 'AWS Multi-factor authentication in IAM'),
  aws('iam-best-practices', `${D}/IAM/latest/UserGuide/best-practices.html`, 'Security best practices in IAM'),
  aws('budgets-managing', `${D}/cost-management/latest/userguide/budgets-managing-costs.html`, 'Managing your costs with AWS Budgets'),

  // Networking basics
  aws('vpc-cidr-blocks', `${D}/vpc/latest/userguide/vpc-cidr-blocks.html`, 'VPC CIDR blocks'),
  aws('vpc-subnet-sizing', `${D}/vpc/latest/userguide/subnet-sizing.html`, 'Subnet CIDR blocks'),
  aws('vpc-sg-rules', `${D}/vpc/latest/userguide/security-group-rules.html`, 'Security group rules'),

  // Monitoring and audit
  aws('cw-what-is', `${D}/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html`, 'What is Amazon CloudWatch?'),
  aws('cw-concepts', `${D}/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html`, 'CloudWatch metrics concepts'),
  aws('cw-alarms', `${D}/AmazonCloudWatch/latest/monitoring/CloudWatch_Alarms.html`, 'Using Amazon CloudWatch alarms'),
  aws('cwl-what-is', `${D}/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html`, 'What is Amazon CloudWatch Logs?'),
  aws('cwl-concepts', `${D}/AmazonCloudWatch/latest/logs/CloudWatchLogsConcepts.html`, 'CloudWatch Logs concepts'),
  aws('cloudtrail-what-is', `${D}/awscloudtrail/latest/userguide/cloudtrail-user-guide.html`, 'What is AWS CloudTrail?'),
  aws('cloudtrail-concepts', `${D}/awscloudtrail/latest/userguide/cloudtrail-concepts.html`, 'CloudTrail concepts'),
  aws('config-what-is', `${D}/config/latest/developerguide/WhatIsConfig.html`, 'What is AWS Config?'),
  aws('config-rules', `${D}/config/latest/developerguide/evaluate-config.html`, 'Evaluating resources with AWS Config rules'),

  // Microsoft Learn (Azure side of the Azure notes only)
  azure('learn-hub', `${L}/architecture/aws-professional/`, 'Azure for AWS professionals: service comparison'),
  azure('learn-compute', `${L}/architecture/aws-professional/compute`, 'Compute services on Azure and AWS'),
  azure('learn-storage', `${L}/architecture/aws-professional/storage`, 'Compare storage on Azure and AWS'),
  azure('learn-networking', `${L}/architecture/aws-professional/networking`, 'Compare AWS and Azure networking options'),
  azure('learn-databases', `${L}/architecture/aws-professional/databases`, 'Database services on Azure and AWS'),
  azure('learn-analytics', `${L}/architecture/aws-professional/analytics`, 'Analytics services on Azure and AWS'),
];

export default sources;
