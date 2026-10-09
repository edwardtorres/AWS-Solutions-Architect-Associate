import type { RenamedService } from '../src/content/types.ts';
import { b } from './helpers.ts';

/**
 * Naming rule: questions use the service names from the exam guide's in-scope list and the short-names
 * list. Notes show the current name alongside any rename, written as {{rename:id}}, with sources for both.
 * Only renames confirmed on an AWS page are listed here.
 */
const renamed: RenamedService[] = [
  {
    id: 'iam-identity-center',
    examGuideName: 'AWS IAM Identity Center',
    otherName: 'AWS Single Sign-On (AWS SSO)',
    relation: b('AWS Single Sign-On was renamed AWS IAM Identity Center on 26 July 2022. Older articles and some API and CLI names (the sso and identitystore namespaces) still use the old name.',
      'sso-what-is',
      ['On July 26, 2022, AWS Single Sign-On was renamed to AWS IAM Identity Center.',
       'The sso and identitystore API namespaces along with the following related namespaces remain unchanged for backward compatibility purposes.']),
  },
  {
    id: 'sagemaker-ai',
    examGuideName: 'Amazon SageMaker AI',
    otherName: 'Amazon SageMaker',
    relation: b('Amazon SageMaker was renamed Amazon SageMaker AI on 3 December 2024. The name Amazon SageMaker now also describes a wider offering that includes SageMaker AI, so older material that says "SageMaker" usually means what the exam guide calls SageMaker AI.',
      'sagemaker-what-is',
      ['On December 03, 2024, Amazon SageMaker was renamed to Amazon SageMaker AI.',
       'Amazon SageMaker AI (formerly Amazon SageMaker)']),
  },
  {
    id: 'quick',
    examGuideName: 'Amazon Quick',
    otherName: 'Amazon QuickSight',
    relation: b('The exam guide lists Amazon Quick. AWS documentation says Amazon Quick evolved from Amazon QuickSight, and that QuickSight continues as Amazon Quick Sight, a feature within Quick. Older material still uses the name QuickSight for the business-intelligence feature.',
      'quick-what-is',
      ['Amazon Quick evolved from Amazon QuickSight.',
       'QuickSight continues as Amazon Quick Sight, a feature within Quick.']),
  },
  {
    id: 'data-firehose',
    examGuideName: 'Amazon Data Firehose',
    otherName: 'Amazon Kinesis Data Firehose',
    relation: b('Amazon Kinesis Data Firehose was renamed Amazon Data Firehose in February 2024. The change was a name change only: service endpoints, APIs, the CLI, IAM access policies and CloudWatch metrics did not change. Older articles and some practice material still use the previous name.',
      'firehose-rename',
      ['Posted on: Feb 9, 2024 AWS is renaming Amazon Kinesis Data Firehose to Amazon Data Firehose.',
       'There are no other changes, including service endpoints, APIs, the AWS Command Line Interface (AWS CLI), the AWS Identity and Access Management (IAM) access policies, and Amazon CloudWatch metrics.']),
  },
];

export default renamed;
