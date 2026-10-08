import type { BuildingNotes } from '../../../src/content/types.ts';
import { b, cue, example } from '../../helpers.ts';

const notes: BuildingNotes = {
  building: 'key-vault',
  overview: [
    b('Encryption protects data only as well as the keys are controlled. In AWS the managed answer is {{term:aws-kms|AWS KMS}}: it creates and controls the keys used to encrypt and sign your data, and AWS services such as S3, EBS and RDS use it for server-side encryption. Who can use a key is set by its {{term:key-policy|key policy}}. For stricter needs there is AWS CloudHSM.',
      ['kms-overview', 'kms-key-policies', 'cloudhsm'],
      ['kms-overview|AWS Key Management Service (AWS KMS) is an AWS managed service that makes it easy for you to create and control the keys used to encrypt and sign your data.',
       'kms-key-policies|Key policies are the primary way to control access to KMS keys.',
       'cloudhsm|A hardware security module (HSM) is a computing device that processes cryptographic operations and provides secure storage for cryptographic keys.']),
  ],
  bullets: [
    {
      id: '1.3-K4',
      concepts: [
        b('KMS keys you create and manage are customer managed keys, which AWS recommends for full control over their lifecycle and usage; there is a monthly cost for each customer managed key in your account. Keys that AWS creates for you in your account are AWS managed keys.',
          'kms-concepts',
          ['The KMS keys that you create and manage for use in your own cryptographic applications are of a type known as customer managed keys.',
           'Customer managed keys are recommended for customers who want full control over the lifecycle and usage of their keys.',
           'There is a monthly cost to have a customer managed key in your account.']),
        b('KMS keys never leave AWS KMS unencrypted and are protected by FIPS-validated hardware security modules. If you need more, AWS KMS custom key stores can be backed by a dedicated CloudHSM cluster that you own, or by an external key manager.',
          ['kms-overview', 'kms-key-stores'],
          ['kms-overview|They never leave AWS KMS unencrypted.',
           'kms-key-stores|There are two types: AWS CloudHSM key stores, backed by a dedicated, customer-owned AWS CloudHSM cluster, and external key stores, backed by an HSM or key management system outside the AWS Cloud.'],
          { allow: ['two'] }),
        b('AWS CloudHSM gives you full control of the algorithms and keys, with single-tenant, standards-compliant HSMs. Use it when a requirement says the customer must exclusively control the HSM; compare it with KMS in the Don\'t confuse section.',
          'cloudhsm',
          ['Full control of your keys, algorithms, and application development AWS CloudHSM gives you full control of the algorithms and keys you use.',
           'We offer HSMs that are standards-compliant, single-tenant']),
      ],
      services: ['AWS KMS', 'AWS CloudHSM'],
      design: [
        b('Default to AWS KMS for encryption in AWS services and use key policies to separate who administers a key from who uses it. Move to CloudHSM only when the question demands single-tenant HSMs or complete control of the key and algorithm.',
          ['kms-key-policies', 'cloudhsm'],
          ['kms-key-policies|The statements in the key policy determine who has permission to use the KMS key and how they can use it.',
           'cloudhsm|Full control of your keys, algorithms, and application development AWS CloudHSM gives you full control of the algorithms and keys you use.']),
      ],
    },
    {
      id: '1.3-S2',
      concepts: [
        b('S3 encrypts every new object at rest by default using server-side encryption with Amazon S3 managed keys (SSE-S3), with no additional fees. To choose a different model you can specify SSE-KMS, DSSE-KMS or SSE-C on the request, or change the bucket\'s default encryption.',
          ['s3-sse-s3-specify', 's3-sse-s3'],
          ['s3-sse-s3-specify|Server-side encryption with Amazon S3 managed keys (SSE-S3) is the default encryption configuration for every bucket in Amazon S3.',
           's3-sse-s3-specify|you can use server-side encryption with AWS Key Management Service (AWS KMS) keys (SSE-KMS), dual-layer server-side encryption with AWS KMS keys (DSSE-KMS), or server-side encryption with customer-provided keys (SSE-C).',
           's3-sse-s3|There are no additional fees for using server-side encryption with Amazon S3 managed keys (SSE-S3).']),
        b('SSE-KMS lets AWS KMS keys govern access to objects: the key policy and KMS permissions decide who can decrypt. With SSE-C you supply the key on every request and S3 does the encrypting and decrypting. Compare SSE-S3, SSE-KMS and SSE-C below.',
          ['s3-sse-kms', 's3-sse-c'],
          ['s3-sse-kms|However, you can choose to configure buckets to use server-side encryption with AWS Key Management Service (AWS KMS) keys (SSE-KMS) instead.',
           's3-sse-c|With the encryption key that you provide as part of your request, Amazon S3 manages data encryption as it writes to disks and data decryption when you access your objects.']),
      ],
      services: ['AWS KMS', 'Amazon S3'],
      design: [
        b('Other AWS services follow the same idea: they use KMS keys to encrypt the data they store on your behalf. Customer managed keys can be used in conjunction with those services.',
          'kms-concepts', ['Customer managed keys can also be used in conjunction with AWS services that use KMS keys to encrypt the data the service stores on your behalf.']),
      ],
    },
    {
      id: '1.3-S4',
      concepts: [
        b('A {{term:key-policy|key policy}} is a resource policy for a KMS key, every KMS key must have exactly one, and its statements determine who can use the key and how.',
          'kms-key-policies',
          ['A key policy is a resource policy for an AWS KMS key.', 'Every KMS key must have exactly one key policy.',
           'The statements in the key policy determine who has permission to use the KMS key and how they can use it.']),
        b('The default key policy has a statement that gives the account permission to use IAM policies to allow access to all KMS operations on the key; the default policy also separates key administrators and key users.',
          'kms-default-key-policy',
          ['This default key policy has one policy statement that gives the AWS account that owns the KMS key permission to use IAM policies to allow access to all AWS KMS operations on the KMS key.',
           'Allows access to the AWS account and enables IAM policiesAllows key administrators to administer the KMS keyAllows key users to use the KMS key']),
      ],
      services: ['AWS KMS', 'IAM'],
      design: [
        b('In a design, give administrators permission to manage the key but not necessarily to use it for decryption, and give application roles permission to use the key. Because key policies are the primary control, an IAM policy alone is not enough unless the key policy enables IAM policies.',
          ['kms-key-policies', 'kms-default-key-policy'],
          ['kms-key-policies|Key policies are the primary way to control access to KMS keys.',
           'kms-default-key-policy|gives the AWS account that owns the KMS key permission to use IAM policies to allow access to all AWS KMS operations on the KMS key']),
      ],
    },
  ],
  cues: [
    cue('manage and control the encryption keys / audit key usage', 'AWS KMS (customer managed key)',
      b('Customer managed keys are recommended when you want full control over key lifecycle and usage.', 'kms-concepts',
        ['Customer managed keys are recommended for customers who want full control over the lifecycle and usage of their keys.'])),
    cue('single-tenant hardware security module / full control of keys and algorithms', 'AWS CloudHSM',
      b('CloudHSM gives you full control of the algorithms and keys, with single-tenant HSMs.', 'cloudhsm',
        ['We offer HSMs that are standards-compliant, single-tenant'])),
    cue('S3 objects must be encrypted at rest, no other requirement', 'already satisfied: SSE-S3 is the default',
      b('All new object uploads to S3 are encrypted by default with SSE-S3.', 's3-sse-s3',
        ['All new object uploads to Amazon S3 buckets are encrypted by default with server-side encryption with Amazon S3 managed keys (SSE-S3).'])),
    cue('who can use the key / separate administrators from users', 'the KMS key policy',
      b('Key policies are the primary way to control access to KMS keys.', 'kms-key-policies', ['Key policies are the primary way to control access to KMS keys.'])),
    cue('provide our own key with each request to S3', 'SSE-C',
      b('With SSE-C, S3 uses the key you provide with your request.', 's3-sse-c',
        ['With the encryption key that you provide as part of your request, Amazon S3 manages data encryption as it writes to disks and data decryption when you access your objects.'])),
  ],
  examples: [
    example('Key policy with an account statement, an administrator and a user', 'key-policy',
      `
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EnableIAMPolicies",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::<ACCOUNT_ID>:root" },
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "KeyAdministrators",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::<ACCOUNT_ID>:role/KeyAdminRole" },
      "Action": ["kms:Create*", "kms:Describe*", "kms:Enable*", "kms:Put*", "kms:ScheduleKeyDeletion"],
      "Resource": "*"
    },
    {
      "Sid": "KeyUsers",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::<ACCOUNT_ID>:role/AppRole" },
      "Action": ["kms:Encrypt", "kms:Decrypt", "kms:GenerateDataKey*"],
      "Resource": "*"
    }
  ]
}
`,
      [
        b('A key policy is a resource policy for the KMS key itself, so it is attached to the key rather than to the users.', 'kms-key-policies',
          ['A key policy is a resource policy for an AWS KMS key.']),
        b('The first statement enables IAM policies: it lets the account use IAM policies to allow access to KMS operations on the key. Without it, only the principals the key policy names directly could use the key.', 'kms-default-key-policy',
          ['This default key policy has one policy statement that gives the AWS account that owns the KMS key permission to use IAM policies to allow access to all AWS KMS operations on the KMS key.']),
        b('The default key policy distinguishes key administrators, who administer the key, from key users, who use it for cryptographic operations. The second and third statements follow that shape; the action lists are examples, not a complete or recommended set.', 'kms-default-key-policy',
          ['Allows access to the AWS account and enables IAM policiesAllows key administrators to administer the KMS keyAllows key users to use the KMS key']),
        b('Illustrative only: `<ACCOUNT_ID>` and the role names are placeholders, and a real policy should be tested before use.', 'kms-key-policies',
          ['The statements in the key policy determine who has permission to use the KMS key and how they can use it.']),
      ]),
  ],
  confuse: ['kms-vs-cloudhsm', 'sse-s3-kms-c'],
  azure: [
    {
      concept: 'Azure Key Vault and Managed HSM',
      aws: 'AWS KMS and AWS CloudHSM',
      mapping: b('The Learn comparison pairs Azure Key Vault and Key Vault Managed HSM with AWS KMS and CloudHSM: the same split between a managed key service and dedicated HSMs.',
        ['learn-hub', 'kms-overview'],
        ['learn-hub|These services improve security and enable you to work with other services', 'kms-overview|AWS Key Management Service (AWS KMS) is an AWS managed service that makes it easy for you to create and control the keys used to encrypt and sign your data.']),
      breaks: b('Learn lists AWS KMS and CloudHSM together against Azure Key Vault. In AWS they are distinct services with a different control model: KMS is a managed service with key policies, CloudHSM is single-tenant HSMs you control. Exam questions often hinge on which one the requirement describes.',
        ['cloudhsm', 'kms-key-policies', 'learn-hub'],
        ['cloudhsm|We offer HSMs that are standards-compliant, single-tenant', 'kms-key-policies|Key policies are the primary way to control access to KMS keys.',
         'learn-hub|AWS Key Management Service (KMS), AWS CloudHSM Azure Key Vault Azure Key Vault Managed HSM']),
    },
  ],
};

export default notes;
