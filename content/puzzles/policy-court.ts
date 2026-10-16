import type { Policy, PolicyCourtScenario, Req, Statement } from '../../src/puzzles/policy-court/def';
import type { Scenario } from '../../src/puzzles/types';

type S = Scenario<PolicyCourtScenario>;

const allow = (Action: string | string[], Resource: string | string[], extra: Partial<Statement> = {}): Statement => ({ Effect: 'Allow', Action, Resource, ...extra });
const deny = (Action: string | string[], Resource: string | string[], extra: Partial<Statement> = {}): Statement => ({ Effect: 'Deny', Action, Resource, ...extra });
const pol = (id: string, kind: Policy['kind'], label: string, statements: Statement[], account?: string): Policy => ({ id, kind, label, statements, ...(account ? { account } : {}) });
const aws = (...p: string[]): { AWS: string | string[] } => ({ AWS: p.length === 1 ? p[0]! : p });
const base = (type: S['type'], building: string, bullets: string[], difficulty: 1 | 2 | 3, n: number) => ({ id: `${type}-${String(n).padStart(3, '0')}`, type, building, bullets, difficulty });

const user = (account: string, name: string, extra: Partial<Req['principal']> = {}): Req['principal'] => ({ type: 'user', account, name, ...extra });
const role = (account: string, name: string, session: string, extra: Partial<Req['principal']> = {}): Req['principal'] => ({ type: 'role', account, name, session, ...extra });
const ctx = (extra: Partial<Req['context']> = {}): Req['context'] => ({ secureTransport: true, ...extra });

const FULL = allow('*', '*');

const scenarios: S[] = [
  // ───────────── Identity Keep ─────────────
  // Source: IAM User Guide, "Policy evaluation for requests within a single account" (the carlossalazar example, log bucket).
  {
    ...base('policy-court', 'identity-keep', ['1.1-K4', '1.1-S2'], 1, 1),
    title: 'Carlos saves a file to the logs bucket',
    story: 'Carlos has a broad Amazon S3 permission on his own bucket and one statement that keeps him out of every bucket with "log" in its name. He tries to save a file into a bucket named like his own with a -logs suffix.',
    data: {
      request: {
        principal: user('ACCT_MAIN', 'carlossalazar'),
        action: 's3:PutObject',
        resource: { arn: 'arn:aws:s3:::amzn-s3-demo-bucket-carlossalazar-logs/today.txt', account: 'ACCT_MAIN' },
        context: ctx(),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the user carlossalazar', [
          allow(['s3:GetBucketLocation', 's3:ListAllMyBuckets'], 'arn:aws:s3:::*', { Sid: 'AllowS3ListRead' }),
          allow('s3:*', ['arn:aws:s3:::amzn-s3-demo-bucket-carlossalazar/*', 'arn:aws:s3:::amzn-s3-demo-bucket-carlossalazar'], { Sid: 'AllowS3Self' }),
          deny('s3:*', 'arn:aws:s3:::*log*', { Sid: 'DenyS3Logs' }),
        ]),
      ],
    },
  },
  // Source: same page, the second half of the carlossalazar example (identity-based and bucket policy both allow).
  {
    ...base('policy-court', 'identity-keep', ['1.1-K4', '1.1-S2'], 1, 2),
    title: 'Carlos saves a file to his own bucket',
    story: 'Carlos retries with his own bucket. His user policy allows the bucket, and the bucket policy names his user as well. Neither policy contains a Deny that matches this request.',
    data: {
      request: {
        principal: user('ACCT_MAIN', 'carlossalazar'),
        action: 's3:PutObject',
        resource: { arn: 'arn:aws:s3:::amzn-s3-demo-bucket-carlossalazar/notes.txt', account: 'ACCT_MAIN' },
        context: ctx(),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the user carlossalazar', [
          allow('s3:*', ['arn:aws:s3:::amzn-s3-demo-bucket-carlossalazar/*', 'arn:aws:s3:::amzn-s3-demo-bucket-carlossalazar'], { Sid: 'AllowS3Self' }),
          deny('s3:*', 'arn:aws:s3:::*log*', { Sid: 'DenyS3Logs' }),
        ]),
        pol('bucket', 'resource', 'Bucket policy on amzn-s3-demo-bucket-carlossalazar', [
          allow('s3:*', ['arn:aws:s3:::amzn-s3-demo-bucket-carlossalazar/*', 'arn:aws:s3:::amzn-s3-demo-bucket-carlossalazar'], { Principal: aws('arn:aws:iam::ACCT_MAIN:user/carlossalazar') }),
        ]),
      ],
    },
  },
  // Source: IAM User Guide, "Permissions boundaries for IAM entities" (the Shirley example).
  {
    ...base('policy-court', 'identity-keep', ['1.1-K4', '1.1-S2'], 2, 3),
    title: 'Shirley creates a user',
    story: 'Shirley should manage only Amazon S3, Amazon CloudWatch and Amazon EC2, so she has a permissions boundary. Later an administrator attached a policy that allows her to create IAM users.',
    data: {
      request: {
        principal: user('ACCT_MAIN', 'Shirley'),
        action: 'iam:CreateUser',
        resource: { arn: 'arn:aws:iam::ACCT_MAIN:user/new-hire', account: 'ACCT_MAIN' },
        context: ctx(),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the user Shirley', [allow('iam:CreateUser', '*')]),
        pol('boundary', 'boundary', "Shirley's permissions boundary", [allow(['s3:*', 'cloudwatch:*', 'ec2:*'], '*')]),
      ],
    },
  },
  // Source: same page, the Nikhil example: an explicit deny in the boundary beats a resource-based policy that names the user.
  {
    ...base('policy-court', 'identity-keep', ['1.1-S2'], 2, 4),
    title: 'Nikhil and the logs bucket policy',
    story: 'Someone added a bucket policy to the logs bucket that allows the user Nikhil to put objects. Nikhil has a permissions boundary that explicitly denies every Amazon S3 action on that bucket.',
    data: {
      request: {
        principal: user('ACCT_MAIN', 'Nikhil'),
        action: 's3:PutObject',
        resource: { arn: 'arn:aws:s3:::logs/app.log', account: 'ACCT_MAIN' },
        context: ctx(),
      },
      policies: [
        pol('identity', 'identity', 'Policies on the user Nikhil (read-only Amazon S3, IAM)', [allow(['s3:Get*', 's3:List*'], '*'), allow('iam:*', '*')]),
        pol('boundary', 'boundary', 'XCompanyBoundaries (boundary of Nikhil)', [
          allow(['s3:*', 'cloudwatch:*', 'ec2:*', 'dynamodb:*'], '*', { Sid: 'ServiceBoundaries' }),
          deny('s3:*', ['arn:aws:s3:::logs', 'arn:aws:s3:::logs/*'], { Sid: 'DenyS3Logs' }),
        ]),
        pol('bucket', 'resource', 'Bucket policy on logs', [allow('s3:PutObject', 'arn:aws:s3:::logs/*', { Principal: aws('arn:aws:iam::ACCT_MAIN:user/Nikhil') })]),
      ],
    },
  },
  // Source: same page, the Nikhil example: a resource policy for a secret is not limited by an implicit deny in the boundary.
  {
    ...base('policy-court', 'identity-keep', ['1.1-S2', '1.1-K4'], 3, 5),
    title: 'Nikhil reads a secret',
    story: 'A secret has a resource-based policy that names the user Nikhil. His own policies and his boundary say nothing about AWS Secrets Manager, and nothing denies it.',
    data: {
      request: {
        principal: user('ACCT_MAIN', 'Nikhil'),
        action: 'secretsmanager:GetSecretValue',
        resource: { arn: 'arn:aws:secretsmanager:us-east-1:ACCT_MAIN:secret:prod/db-AbCdEf', account: 'ACCT_MAIN' },
        context: ctx(),
      },
      policies: [
        pol('identity', 'identity', 'Policies on the user Nikhil (read-only Amazon S3, IAM)', [allow(['s3:Get*', 's3:List*'], '*'), allow('iam:*', '*')]),
        pol('boundary', 'boundary', 'XCompanyBoundaries (boundary of Nikhil)', [
          allow(['s3:*', 'cloudwatch:*', 'ec2:*', 'dynamodb:*'], '*', { Sid: 'ServiceBoundaries' }),
          deny('s3:*', ['arn:aws:s3:::logs', 'arn:aws:s3:::logs/*'], { Sid: 'DenyS3Logs' }),
        ]),
        pol('secret', 'resource', 'Secret resource policy', [allow('secretsmanager:GetSecretValue', '*', { Principal: aws('arn:aws:iam::ACCT_MAIN:user/Nikhil') })]),
      ],
    },
  },
  // Same pair as above, but the resource policy names a role ARN: limited by the boundary (IAM User Guide, "Permissions boundaries for IAM entities").
  {
    ...base('policy-court', 'identity-keep', ['1.1-S2', '1.1-K4'], 3, 6),
    title: 'A role named in a bucket policy',
    story: 'A bucket policy names the reporting role by its role ARN. The role has a permissions boundary that covers only Amazon DynamoDB. The role has no identity-based policy for Amazon S3.',
    data: {
      request: {
        principal: role('ACCT_MAIN', 'reporting', 'nightly'),
        action: 's3:GetObject',
        resource: { arn: 'arn:aws:s3:::amzn-s3-demo-reports/q3.csv', account: 'ACCT_MAIN' },
        context: ctx(),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the role reporting', [allow(['dynamodb:GetItem', 'dynamodb:Query'], '*')]),
        pol('boundary', 'boundary', 'Boundary of the role reporting', [allow('dynamodb:*', '*')]),
        pol('bucket', 'resource', 'Bucket policy on amzn-s3-demo-reports', [allow('s3:GetObject', 'arn:aws:s3:::amzn-s3-demo-reports/*', { Principal: aws('arn:aws:iam::ACCT_MAIN:role/reporting') })]),
      ],
    },
  },
  // Source: IAM User Guide, "AWS global condition context keys" (aws:MultiFactorAuthPresent, BoolIfExists with Deny).
  {
    ...base('policy-court', 'identity-keep', ['1.1-S1', '1.1-K4'], 2, 7),
    title: 'Terminating instances without MFA',
    story: 'A developer calls the Amazon EC2 API from the CLI with long-term access keys. The user policy allows EC2 and adds a Deny for terminating instances unless MFA was used.',
    data: {
      request: {
        principal: user('ACCT_MAIN', 'dev-sam'),
        action: 'ec2:TerminateInstances',
        resource: { arn: 'arn:aws:ec2:us-east-1:ACCT_MAIN:instance/i-0abc1234', account: 'ACCT_MAIN' },
        context: ctx(),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the user dev-sam', [
          allow('ec2:*', '*'),
          deny('ec2:TerminateInstances', '*', { Sid: 'DenyWithoutMfa', Condition: { BoolIfExists: { 'aws:MultiFactorAuthPresent': 'false' } } }),
        ]),
      ],
    },
  },
  // Same page: Allow with Bool aws:MultiFactorAuthPresent true does not allow long-term access key requests.
  {
    ...base('policy-court', 'identity-keep', ['1.1-S1', '1.1-K4'], 3, 8),
    title: 'An MFA-only allow, called with access keys',
    story: 'A user policy allows deleting objects only when MFA was used. The user runs the same call from a script with long-term access keys. No other policy mentions this action.',
    data: {
      request: {
        principal: user('ACCT_MAIN', 'ops-lee'),
        action: 's3:DeleteObject',
        resource: { arn: 'arn:aws:s3:::amzn-s3-demo-archive/old.zip', account: 'ACCT_MAIN' },
        context: ctx(),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the user ops-lee', [
          allow('s3:DeleteObject', 'arn:aws:s3:::amzn-s3-demo-archive/*', { Condition: { Bool: { 'aws:MultiFactorAuthPresent': 'true' } } }),
        ]),
      ],
    },
  },
  // Source: IAM User Guide, "IAM JSON policy elements: Condition operators" (IpAddress with aws:SourceIp 203.0.113.0/24 example table).
  {
    ...base('policy-court', 'identity-keep', ['1.1-K4', '1.1-S2'], 1, 9),
    title: 'Read access only from the office range',
    story: 'A user policy allows reading objects only from one public IP range. The user makes the call from a different public address.',
    data: {
      request: {
        principal: user('ACCT_MAIN', 'analyst-kim'),
        action: 's3:GetObject',
        resource: { arn: 'arn:aws:s3:::amzn-s3-demo-data/report.csv', account: 'ACCT_MAIN' },
        context: ctx({ sourceIp: '198.51.100.1' }),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the user analyst-kim', [allow('s3:GetObject', 'arn:aws:s3:::amzn-s3-demo-data/*', { Condition: { IpAddress: { 'aws:SourceIp': '203.0.113.0/24' } } })]),
      ],
    },
  },
  // Deny with NotIpAddress, request from inside the range: the Deny does not match, the Allow applies.
  {
    ...base('policy-court', 'identity-keep', ['1.1-K4', '1.1-S1'], 2, 10),
    title: 'A guardrail Deny for other networks',
    story: 'A user policy allows Amazon S3 and adds a guardrail that denies every request that does not come from the corporate range. This request does come from inside that range.',
    data: {
      request: {
        principal: user('ACCT_MAIN', 'admin-ana'),
        action: 's3:PutObject',
        resource: { arn: 'arn:aws:s3:::amzn-s3-demo-docs/plan.txt', account: 'ACCT_MAIN' },
        context: ctx({ sourceIp: '203.0.113.25' }),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the user admin-ana', [
          allow('s3:*', '*'),
          deny('*', '*', { Sid: 'DenyOutsideOffice', Condition: { NotIpAddress: { 'aws:SourceIp': '203.0.113.0/24' } } }),
        ]),
      ],
    },
  },

  // ───────────── Embassy Row ─────────────
  // Source: Organizations User Guide, "SCP evaluation", scenario 2 (an Allow policy at the OU that names only EC2).
  {
    ...base('policy-court', 'embassy-row', ['1.1-S4', '1.1-K1'], 1, 11),
    title: 'The OU allows only Amazon EC2',
    story: 'A workload account sits in an OU. The root and the account keep the default allow-all service control policy, but the OU policy replaced it with one that allows only Amazon EC2. The user has a full Amazon S3 identity-based policy.',
    data: {
      request: {
        principal: user('ACCT_WORK', 'builder', { orgId: 'o-exampleorg' }),
        action: 's3:GetObject',
        resource: { arn: 'arn:aws:s3:::amzn-s3-demo-build/artifact.zip', account: 'ACCT_WORK' },
        context: ctx(),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the user builder', [allow('s3:*', '*')]),
        pol('scp-root', 'scp', 'SCP at the root: FullAWSAccess', [FULL], 'ACCT_WORK'),
        pol('scp-ou', 'scp', 'SCP at the Sandbox OU: allow EC2 only', [allow('ec2:*', '*')], 'ACCT_WORK'),
        pol('scp-acct', 'scp', 'SCP on the account: FullAWSAccess', [FULL], 'ACCT_WORK'),
      ],
    },
  },
  // Source: Organizations User Guide, "SCP evaluation", "How SCPs work with Deny" (a Deny at an OU overrides Allow at root and account).
  {
    ...base('policy-court', 'embassy-row', ['1.1-S4', '1.1-K1'], 2, 12),
    title: 'A Deny two levels above the account',
    story: 'The root and the account allow everything. The Production OU policy also allows everything but adds a Deny for Amazon EC2. A role in the account has full EC2 permissions.',
    data: {
      request: {
        principal: role('ACCT_PROD', 'deployer', 'pipeline', { orgId: 'o-exampleorg' }),
        action: 'ec2:RunInstances',
        resource: { arn: 'arn:aws:ec2:us-east-1:ACCT_PROD:instance/*', account: 'ACCT_PROD' },
        context: ctx(),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the role deployer', [allow('ec2:*', '*')]),
        pol('scp-root', 'scp', 'SCP at the root: FullAWSAccess', [FULL], 'ACCT_PROD'),
        pol('scp-ou', 'scp', 'SCP at the Production OU: no EC2', [FULL, deny('ec2:*', '*')], 'ACCT_PROD'),
        pol('scp-acct', 'scp', 'SCP on the account: FullAWSAccess', [FULL], 'ACCT_PROD'),
      ],
    },
  },
  // Source: Organizations User Guide, "Service control policies (SCPs)": SCPs do not affect the management account.
  {
    ...base('policy-court', 'embassy-row', ['1.1-S4', '1.1-K1'], 3, 13),
    title: 'The management account and a root SCP',
    story: 'The organization root has an SCP that denies deleting Amazon S3 objects. An administrator signs in to the management account with a user whose identity-based policy allows the delete.',
    data: {
      request: {
        principal: user('ACCT_MGMT', 'org-admin', { orgId: 'o-exampleorg', managementAccount: true }),
        action: 's3:DeleteObject',
        resource: { arn: 'arn:aws:s3:::amzn-s3-demo-mgmt/old.log', account: 'ACCT_MGMT' },
        context: ctx(),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the user org-admin', [allow('s3:*', '*')]),
        pol('scp-root', 'scp', 'SCP at the root: no S3 deletes', [FULL, deny('s3:DeleteObject', '*')], 'ACCT_MGMT'),
      ],
    },
  },
  // Source: Organizations User Guide, "Service control policies (SCPs)" ("SCPs apply to principals of the account where attached") and IAM User Guide cross-account evaluation.
  {
    ...base('policy-court', 'embassy-row', ['1.1-K1', '1.1-S5', '1.1-S4'], 3, 14),
    title: 'An SCP in the bucket account, a principal outside it',
    story: 'A partner role in another account reads an object from a bucket in a member account. That member account has an SCP that denies all Amazon S3 actions. The bucket policy and the role policy both allow the read.',
    data: {
      request: {
        principal: role('ACCT_PARTNER', 'vendor-reader', 'job1'),
        action: 's3:GetObject',
        resource: { arn: 'arn:aws:s3:::amzn-s3-demo-shared/data.csv', account: 'ACCT_PROD' },
        context: ctx(),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the role vendor-reader (partner account)', [allow('s3:GetObject', 'arn:aws:s3:::amzn-s3-demo-shared/*')]),
        pol('bucket', 'resource', 'Bucket policy on amzn-s3-demo-shared', [allow('s3:GetObject', 'arn:aws:s3:::amzn-s3-demo-shared/*', { Principal: aws('ACCT_PARTNER') })]),
        pol('scp-prod', 'scp', 'SCP on ACCT_PROD: no Amazon S3', [FULL, deny('s3:*', '*')], 'ACCT_PROD'),
      ],
    },
  },
  // Source: IAM User Guide, "Cross-account policy evaluation logic": the principal needs an identity-based allow in its own account.
  {
    ...base('policy-court', 'embassy-row', ['1.1-K1', '1.1-S3', '1.1-S5'], 1, 15),
    title: 'The bucket trusts the account, the user has no Amazon S3 policy',
    story: 'A bucket policy in the production account allows the whole development account to read objects. A developer in the development account has only an Amazon EC2 read-only policy.',
    data: {
      request: {
        principal: user('ACCT_DEV', 'dev-pat'),
        action: 's3:GetObject',
        resource: { arn: 'arn:aws:s3:::amzn-s3-demo-prod-data/report.csv', account: 'ACCT_PROD' },
        context: ctx(),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the user dev-pat', [allow('ec2:Describe*', '*')]),
        pol('bucket', 'resource', 'Bucket policy on amzn-s3-demo-prod-data', [allow('s3:GetObject', 'arn:aws:s3:::amzn-s3-demo-prod-data/*', { Principal: aws('arn:aws:iam::ACCT_DEV:root') })]),
      ],
    },
  },
  // Source: IAM User Guide, "Cross-account policy evaluation logic" (the Demo role writes to the production bucket).
  {
    ...base('policy-court', 'embassy-row', ['1.1-K1', '1.1-S3', '1.1-S5'], 2, 16),
    title: 'The Demo role saves a file in the production bucket',
    story: 'The role Demo lives in the development account. Its policy allows object actions on the production bucket. The production account bucket policy names the Demo role for create and edit actions.',
    data: {
      request: {
        principal: role('ACCT_DEV', 'Demo', 'carlos'),
        action: 's3:PutObject',
        resource: { arn: 'arn:aws:s3:::amzn-s3-demo-bucket-production/report.csv', account: 'ACCT_PROD' },
        context: ctx(),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the role Demo', [
          allow('s3:ListAllMyBuckets', '*', { Sid: 'AllowS3ListRead' }),
          allow('s3:*Object*', 'arn:aws:s3:::amzn-s3-demo-bucket-production/*', { Sid: 'AllowS3ProductionObjectActions' }),
          deny('s3:*', ['arn:aws:s3:::*log*', 'arn:aws:s3:::*log*/*'], { Sid: 'DenyS3Logs' }),
        ]),
        pol('bucket', 'resource', 'Bucket policy on amzn-s3-demo-bucket-production', [
          allow(['s3:GetObject*', 's3:PutObject*', 's3:ReplicateObject', 's3:RestoreObject'], 'arn:aws:s3:::amzn-s3-demo-bucket-production/*', { Principal: aws('arn:aws:iam::ACCT_DEV:role/Demo') }),
        ]),
      ],
    },
  },
  // Source: same page: "The role can create and edit, but not delete the objects in the bucket."
  {
    ...base('policy-court', 'embassy-row', ['1.1-K1', '1.1-S3', '1.1-S5'], 2, 17),
    title: 'The Demo role deletes a file in the production bucket',
    story: 'The same Demo role now tries to delete an object. Its own policy allows every object action on the bucket. The bucket policy lists get, put, replicate and restore actions.',
    data: {
      request: {
        principal: role('ACCT_DEV', 'Demo', 'carlos'),
        action: 's3:DeleteObject',
        resource: { arn: 'arn:aws:s3:::amzn-s3-demo-bucket-production/report.csv', account: 'ACCT_PROD' },
        context: ctx(),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the role Demo', [allow('s3:*Object*', 'arn:aws:s3:::amzn-s3-demo-bucket-production/*', { Sid: 'AllowS3ProductionObjectActions' })]),
        pol('bucket', 'resource', 'Bucket policy on amzn-s3-demo-bucket-production', [
          allow(['s3:GetObject*', 's3:PutObject*', 's3:ReplicateObject', 's3:RestoreObject'], 'arn:aws:s3:::amzn-s3-demo-bucket-production/*', { Principal: aws('arn:aws:iam::ACCT_DEV:role/Demo') }),
        ]),
      ],
    },
  },
  // Source: IAM User Guide, "AWS global condition context keys" (aws:PrincipalOrgID bucket policy with Principal "*").
  {
    ...base('policy-court', 'embassy-row', ['1.1-K1', '1.1-S5', '1.1-S4'], 2, 18),
    title: 'Any account in the organization may upload',
    story: 'A bucket policy lets any principal write objects, but only when its account belongs to the organization with the given ID. A user in another member account, with an Amazon S3 policy of its own, uploads a file.',
    data: {
      request: {
        principal: user('ACCT_DEV', 'uploader', { orgId: 'o-exampleorg' }),
        action: 's3:PutObject',
        resource: { arn: 'arn:aws:s3:::amzn-s3-demo-bucket/inbox/file.txt', account: 'ACCT_SHARED' },
        context: ctx(),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the user uploader', [allow('s3:PutObject', 'arn:aws:s3:::amzn-s3-demo-bucket/inbox/*')]),
        pol('bucket', 'resource', 'Bucket policy on amzn-s3-demo-bucket', [
          allow('s3:PutObject', 'arn:aws:s3:::amzn-s3-demo-bucket/*', { Sid: 'AllowPutObject', Principal: '*', Condition: { StringEquals: { 'aws:PrincipalOrgID': 'o-exampleorg' } } }),
        ]),
      ],
    },
  },
  // Source: IAM User Guide, "Cross account resource access in IAM" and "How AWS enforcement code logic evaluates requests" (role trust policies).
  {
    ...base('policy-court', 'embassy-row', ['1.1-S3', '1.1-K1'], 2, 19),
    title: 'Assuming an audit role in another account',
    story: 'The production account has a role named auditor. Its trust policy allows the development account. A developer in the development account has an identity-based policy that allows sts:AssumeRole on that role.',
    data: {
      request: {
        principal: user('ACCT_DEV', 'dev-pat'),
        action: 'sts:AssumeRole',
        resource: { arn: 'arn:aws:iam::ACCT_PROD:role/auditor', account: 'ACCT_PROD', kind: 'role-trust' },
        context: ctx(),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the user dev-pat', [allow('sts:AssumeRole', 'arn:aws:iam::ACCT_PROD:role/auditor')]),
        pol('trust', 'resource', 'Trust policy of the role auditor', [allow('sts:AssumeRole', '*', { Principal: aws('arn:aws:iam::ACCT_DEV:root') })]),
      ],
    },
  },
  // Source: IAM User Guide, "How AWS enforcement code logic evaluates requests": role trust policies are an exception to the same-account union.
  {
    ...base('policy-court', 'embassy-row', ['1.1-S3', '1.1-S5'], 3, 20),
    title: 'Same account, but the trust policy names someone else',
    story: 'A user in the production account has an identity-based policy that allows sts:AssumeRole on the deployer role. The role trust policy names a different user and does not mention this one.',
    data: {
      request: {
        principal: user('ACCT_PROD', 'intern'),
        action: 'sts:AssumeRole',
        resource: { arn: 'arn:aws:iam::ACCT_PROD:role/deployer', account: 'ACCT_PROD', kind: 'role-trust' },
        context: ctx(),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the user intern', [allow('sts:AssumeRole', '*')]),
        pol('trust', 'resource', 'Trust policy of the role deployer', [allow('sts:AssumeRole', '*', { Principal: aws('arn:aws:iam::ACCT_PROD:user/release-manager') })]),
      ],
    },
  },
  // Source: IAM User Guide, "Policy evaluation for requests within a single account" (explicit deny in a resource-based policy) and the aws:SecureTransport example on the condition operators page.
  {
    ...base('policy-court', 'embassy-row', ['1.1-S5'], 2, 21),
    title: 'A bucket policy that insists on TLS',
    story: 'The bucket policy denies every request that is not sent over TLS. A user with a full Amazon S3 identity-based policy reads an object over plain HTTP.',
    data: {
      request: {
        principal: user('ACCT_PROD', 'reader'),
        action: 's3:GetObject',
        resource: { arn: 'arn:aws:s3:::amzn-s3-demo-secure/doc.pdf', account: 'ACCT_PROD' },
        context: ctx({ secureTransport: false }),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the user reader', [allow('s3:*', '*')]),
        pol('bucket', 'resource', 'Bucket policy on amzn-s3-demo-secure', [
          deny('s3:*', ['arn:aws:s3:::amzn-s3-demo-secure', 'arn:aws:s3:::amzn-s3-demo-secure/*'], { Sid: 'DenyInsecureTransport', Principal: '*', Condition: { Bool: { 'aws:SecureTransport': 'false' } } }),
        ]),
      ],
    },
  },
  // Source: IAM User Guide, "Permissions boundaries for IAM entities": a resource-based policy that names the session ARN grants directly to the session.
  {
    ...base('policy-court', 'embassy-row', ['1.1-S3', '1.1-S5'], 3, 22),
    title: 'A bucket policy that names the session',
    story: 'An analyst assumed a role and passed a session policy that allows only s3:ListBucket. The bucket policy names this exact role session ARN and allows s3:GetObject. The role policy covers only Amazon EC2 reads.',
    data: {
      request: {
        principal: role('ACCT_MAIN', 'analyst', 'review-2026'),
        action: 's3:GetObject',
        resource: { arn: 'arn:aws:s3:::amzn-s3-demo-reviews/a.txt', account: 'ACCT_MAIN' },
        context: ctx(),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the role analyst', [allow('ec2:Describe*', '*')]),
        pol('session', 'session', 'Session policy passed when assuming the role', [allow('s3:ListBucket', 'arn:aws:s3:::amzn-s3-demo-reviews')]),
        pol('bucket', 'resource', 'Bucket policy on amzn-s3-demo-reviews', [
          allow('s3:GetObject', 'arn:aws:s3:::amzn-s3-demo-reviews/*', { Principal: aws('arn:aws:sts::ACCT_MAIN:assumed-role/analyst/review-2026') }),
        ]),
      ],
    },
  },

  // ───────────── Federation Bridge ─────────────
  // Source: IAM User Guide, "Policies and permissions in IAM" and "Permissions boundaries for IAM entities" (session policies limit).
  {
    ...base('policy-court', 'federation-bridge', ['1.1-K2', '1.1-S6'], 2, 23),
    title: 'A directory user with a narrower session',
    story: 'Users from the corporate directory sign in through a federated role. The access portal passes a session policy that allows only s3:GetObject. The role itself allows every Amazon S3 action. The user tries to upload.',
    data: {
      request: {
        principal: role('ACCT_MAIN', 'DirectoryDevs', 'alice'),
        action: 's3:PutObject',
        resource: { arn: 'arn:aws:s3:::amzn-s3-demo-team/notes.txt', account: 'ACCT_MAIN' },
        context: ctx(),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the role DirectoryDevs', [allow('s3:*', '*')]),
        pol('session', 'session', 'Session policy for this sign-in', [allow('s3:GetObject', '*')]),
      ],
    },
  },
  // Source: IAM User Guide, "Policies and permissions in IAM": "Session policies limit permissions for a created session, but do not grant permissions."
  {
    ...base('policy-court', 'federation-bridge', ['1.1-K2', '1.1-S6'], 2, 24),
    title: 'A session policy cannot add permissions',
    story: 'A federated role session carries a session policy that allows every Amazon DynamoDB action. The role itself allows only Amazon S3 reads. The user reads an item from a table.',
    data: {
      request: {
        principal: role('ACCT_MAIN', 'DirectoryAnalysts', 'bob'),
        action: 'dynamodb:GetItem',
        resource: { arn: 'arn:aws:dynamodb:us-east-1:ACCT_MAIN:table/Orders', account: 'ACCT_MAIN' },
        context: ctx(),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the role DirectoryAnalysts', [allow(['s3:GetObject', 's3:ListBucket'], '*')]),
        pol('session', 'session', 'Session policy for this sign-in', [allow('dynamodb:*', '*')]),
      ],
    },
  },
  // Both the role policy and the session policy allow the action (intersection is non-empty).
  {
    ...base('policy-court', 'federation-bridge', ['1.1-K2', '1.1-S6'], 1, 25),
    title: 'Role and session policy agree',
    story: 'A federated role session reads an object. The role policy allows reads in one bucket, and the session policy allows reads and listing in the same bucket. No policy denies anything.',
    data: {
      request: {
        principal: role('ACCT_MAIN', 'DirectoryReaders', 'carol'),
        action: 's3:GetObject',
        resource: { arn: 'arn:aws:s3:::amzn-s3-demo-team/plan.txt', account: 'ACCT_MAIN' },
        context: ctx(),
      },
      policies: [
        pol('identity', 'identity', 'Policy on the role DirectoryReaders', [allow('s3:GetObject', 'arn:aws:s3:::amzn-s3-demo-team/*')]),
        pol('session', 'session', 'Session policy for this sign-in', [allow(['s3:GetObject', 's3:ListBucket'], ['arn:aws:s3:::amzn-s3-demo-team', 'arn:aws:s3:::amzn-s3-demo-team/*'])]),
      ],
    },
  },
];

export default scenarios;
