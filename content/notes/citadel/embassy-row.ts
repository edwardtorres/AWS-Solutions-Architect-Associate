import type { BuildingNotes } from '../../../src/content/types.ts';
import { b, cue, example } from '../../helpers.ts';

const notes: BuildingNotes = {
  building: 'embassy-row',
  overview: [
    b('Real organisations run many AWS accounts, not one. This building is about keeping that estate safe: grouping accounts under {{term:aws-organizations}}, limiting what they may do with {{term:scp|SCPs}}, setting up a governed multi-account environment with {{term:control-tower}}, and letting principals in one account use resources in another through roles or resource policies.',
      ['orgs-intro', 'orgs-scps', 'control-tower'],
      ['orgs-intro|AWS Organizations helps you centrally manage and govern your environment as you grow and scale your AWS resources.',
       'orgs-scps|SCPs offer central control over the maximum available permissions for the IAM users and IAM roles in your organization.',
       'control-tower|AWS Control Tower offers a straightforward way to set up and govern an AWS multi-account environment, following prescriptive best practices.']),
  ],
  beyondProject: [
    b('If your CloudFront and S3 static site uses origin access control (OAC), an S3 bucket policy allows the CloudFront service principal to read the bucket, and that bucket policy is what SAA calls a resource policy for an AWS service. AWS says CloudFront can send authenticated requests to an S3 origin with either OAC or the older origin access identity (OAI), and recommends OAC. OAC does not apply if the origin is a bucket configured as a website endpoint. What SAA adds is choosing between a resource policy, a role and an SCP guardrail, and knowing what each can and cannot do.',
      'cf-oac',
      ['Use an S3 bucket policy to allow the CloudFront service principal (cloudfront.amazonaws.com) to access the bucket.',
       'CloudFront provides two ways to send authenticated requests to an Amazon S3 origin: origin access control (OAC) and origin access identity (OAI).',
       'We recommend that you use OAC instead because it supports the following features:',
       'This origin must be a regular S3 bucket, not a bucket configured as a website endpoint.'],
      { allow: ['two'] }),
  ],
  bullets: [
    {
      id: '1.1-K1',
      concepts: [
        b('AWS Organizations lets you create accounts, group them, apply policies for governance, and simplify billing with a single payment method for all of them. It integrates with other services to define central configurations, security mechanisms, audit requirements and resource sharing across accounts.',
          'orgs-intro',
          ['Using Organizations, you can create accounts and allocate resources, group accounts to organize your workflows, apply policies for governance, and simplify billing by using a single payment method for all of your accounts.',
           'Organizations is integrated with other AWS services so you can define central configurations, security mechanisms, audit requirements, and resource sharing across accounts in your organization.']),
        b('Access across accounts comes in three flavours: a principal assumes a role in the other account, a resource-based policy names the outside principal directly, or {{term:aws-ram}} shares a resource with other accounts or an entire organization.',
          ['iam-cross-account', 'ram-what-is'],
          ['iam-cross-account|To do this, you can attach a resource policy directly to the resource that you want to share, or use a role as a proxy.',
           'ram-what-is|AWS Resource Access Manager (AWS RAM) helps you securely share your resources across AWS accounts, within your organization or organizational units (OUs)'],
          { allow: ['three'] }),
        b('With AWS RAM you create a resource once and make it usable by other accounts. You can share with every account in the organization, with specific organizational units, or with specific accounts by ID.',
          'ram-what-is',
          ['If you have multiple AWS accounts, you can create a resource once and use AWS RAM to make that resource usable by those other accounts.',
           'You can also share with specific AWS accounts by account ID, regardless of whether the account is part of an organization.']),
      ],
      services: ['AWS Organizations', 'AWS Resource Access Manager (AWS RAM)', 'IAM'],
      design: [
        b('AWS says accounts are a hard boundary, and recommends account-level separation to isolate production workloads from development and test workloads. Cross-account roles then make the allowed paths between accounts explicit, and can help prevent accidental changes to sensitive environments.',
          ['sec-account-separation', 'iam-account-switch'],
          ['sec-account-separation|In AWS, accounts are a hard boundary.',
           'sec-account-separation|For example, account-level separation is strongly recommended for isolating production workloads from development and test workloads.',
           'iam-account-switch|With roles you can help prevent accidental changes to sensitive environments, especially if you combine them with auditing to help make sure that roles are only used when needed.']),
      ],
    },
    {
      id: '1.1-S3',
      concepts: [
        b('{{term:sts}} issues temporary, short-term security credentials that are generated dynamically when requested. A role in another account is assumed through the AssumeRole operation after a trust relationship exists, and the administrator grants users or groups permission for the sts:AssumeRole action.',
          ['iam-temp-creds', 'iam-cross-account-role'],
          ['iam-temp-creds|Temporary security credentials are not stored with the user but are generated dynamically and provided to the user when requested.',
           'iam-cross-account-role|After you create the trust relationship, an IAM user or an application from the trusted account can use the AWS Security Token Service (AWS STS) AssumeRole API operation.',
           'iam-cross-account-role|To do this, the administrator attaches a policy to the user or a group that grants permission for the sts:AssumeRole action.']),
        b('Role switching: you do not sign in to a role, but once signed in as an IAM user (or an Identity Center, SAML-federated or web-identity user) you can switch to one. That temporarily sets aside your original permissions and gives you the role\'s.',
          'iam-switch-role',
          ['However, you don\'t sign in to a role, but once signed in as an IAM user you can switch to an IAM role.',
           'This temporarily sets aside your original user permissions and instead gives you the permissions assigned to the role.']),
        b('A cross-account role is defined by its trust policy: you specify the accounts whose users need access in the Principal element of the role\'s trust policy, and a user in one account can switch to a role in the same or a different account.',
          'iam-account-switch',
          ["you specify the accounts by ID whose users need access in the Principal element of the role's trust policy.",
           'A user in one account can switch to a role in the same or a different account.']),
      ],
      services: ['IAM'],
      design: [
        b('Role-based access control across accounts: give people one place to sign in (the identity account or IAM Identity Center), then let them assume purpose-specific roles in the workload accounts. Each role has a narrow permission policy and a trust policy that names exactly who can assume it.',
          ['iam-account-switch', 'iam-el-principal'],
          ['iam-account-switch|For example, you might need cross-account access when you are promoting an update from the development environment to the production environment.',
           'iam-el-principal|In IAM roles, use the Principal element in the role trust policy to specify who can assume the role.']),
      ],
    },
    {
      id: '1.1-S4',
      concepts: [
        b('SCPs are a type of organization policy that offers central control over the maximum available permissions for IAM users and roles in the organization. They do not grant permissions, are available only when all features are enabled, and have no effect on users or roles in the management account. Effective permissions are the intersection of what the SCP allows and what identity-based and resource-based policies allow.',
          'orgs-scps',
          ['SCPs offer central control over the maximum available permissions for the IAM users and IAM roles in your organization.',
           'SCPs do not grant permissions to the IAM users and IAM roles in your organization.',
           'SCPs are available only in an organization that has all features enabled.',
           'They have no effect on users or roles in the management account.',
           'The effective permissions are the logical intersection between what is allowed by the SCP and resource control policies (RCPs) and what is allowed by the identity-based and resource-based policies.']),
        b('SCPs are attached to the organization root, to organizational units, or to accounts. Enabling SCPs attaches the AWS managed FullAWSAccess policy, which allows all services and actions; for a permission to be allowed in an account it must be allowed at each level above it.',
          ['orgs-scp-eval'],
          ['This is why when you enable SCPs, AWS Organizations attaches an AWS managed SCP policy named FullAWSAccess which allows all services and actions.',
           'For a permission or a service to be allowed at Account B, a SCP that allows the permission or service should be attached to Root, the Production OU, and to Account B itself.']),
        b('AWS Control Tower orchestrates AWS Organizations, AWS Service Catalog and AWS IAM Identity Center to build a landing zone, and applies controls (sometimes called guardrails) to keep accounts from drift. Controls can be preventive, detective or proactive and apply to a whole organizational unit.',
          ['control-tower', 'control-tower-controls'],
          ['control-tower|AWS Control Tower orchestrates the capabilities of several other AWS services, including AWS Organizations, AWS Service Catalog, and AWS IAM Identity Center, to build a landing zone',
           'control-tower|To help keep your organizations and accounts from drift, which is divergence from best practices, AWS Control Tower applies controls (sometimes called guardrails).',
           'control-tower-controls|AWS Control Tower implements preventive, detective, and proactive controls that help you govern your resources and monitor compliance across groups of AWS accounts.']),
        b('SCP evaluation follows a deny-by-default model, so any permission not explicitly allowed in the SCPs is denied. A Deny in an SCP attached at any level on the path to an account denies that permission for the account, even if another SCP allows it.',
          'orgs-scp-eval',
          ['SCP evaluation follows a deny-by-default model, meaning that any permissions not explicitly allowed in the SCPs are denied.',
           'For a permission to be denied for a specific account, any SCP from the root through each OU in the direct path to the account (including the target account itself) can deny that permission.']),
        b('Control Tower lets distributed teams provision new accounts quickly through configurable account templates in Account Factory.',
          'control-tower', ['AWS Control Tower enables end users on your distributed teams to provision new AWS accounts quickly, by means of configurable account templates in Account Factory.']),
      ],
      services: ['AWS Organizations', 'AWS Control Tower', 'IAM'],
      design: [
        b('Use Control Tower when the question wants a governed multi-account environment set up quickly with best practices. Use SCPs when the question wants a ceiling on what accounts can do (for example, blocking a service or a Region). An SCP does not grant permissions on its own.',
          ['control-tower', 'orgs-scps'],
          ['control-tower|AWS Control Tower offers a straightforward way to set up and govern an AWS multi-account environment, following prescriptive best practices.',
           'orgs-scps|SCPs do not grant permissions to the IAM users and IAM roles in your organization.']),
      ],
    },
    {
      id: '1.1-S5',
      concepts: [
        b('Resource-based policies are attached to a resource. Examples include S3 buckets, SQS queues, VPC endpoints, KMS keys and DynamoDB tables and streams. They must use the Principal element, which an identity-based policy cannot.',
          ['iam-identity-vs-resource', 'iam-el-principal'],
          ['iam-identity-vs-resource|you can attach resource-based policies to Amazon S3 buckets, Amazon SQS queues, VPC endpoints, AWS Key Management Service encryption keys, Amazon DynamoDB tables and streams',
           'iam-el-principal|You must use the Principal element in resource-based policies.']),
        b('For cross-account access, the resource-based policy in the trusting account names the principal of the trusted account, and the principal\'s own identity-based policy must also allow the request. Inside a single account the rule is looser: if either the identity-based policy or the resource-based policy allows the request and the other does not, the request is still allowed.',
          ['iam-cross-account-eval', 'iam-policy-eval-basics'],
          ['iam-cross-account-eval|To allow cross-account access, you attach a resource-based policy to the resource that you want to share. You must also attach an identity-based policy to the identity that acts as the principal in the request.',
           'iam-policy-eval-basics|If either the identity-based policy or the resource-based policy within the same account allows the request and the other doesn\'t, the request is still allowed.']),
        b('AWS services themselves can be principals. A service principal such as cloudfront.amazonaws.com lets a service act on a resource, which is how a CloudFront distribution is allowed to read a private S3 origin.',
          ['iam-el-principal', 'cf-oac'],
          ['iam-el-principal|You can specify any of the following principals in a policy: AWS account and root user IAM roles Role sessions IAM users Federated user principals AWS services All principals',
           'cf-oac|Use an S3 bucket policy to allow the CloudFront service principal (cloudfront.amazonaws.com) to access the bucket.']),
      ],
      services: ['IAM', 'Amazon S3'],
      design: [
        b('Pick a resource policy when a resource must be shared with a specific outside principal, or with an AWS service, and the resource supports it. Check the Principal element carefully: whenever the trusted entity is another AWS account, any IAM principal can be granted access to the resource.',
          'iam-cross-account', ['Whenever the trusted entity is another AWS account, any IAM principal can be granted access to your resource.']),
      ],
    },
  ],
  cues: [
    cue('across multiple AWS accounts, centrally', 'AWS Organizations (and SCPs for guardrails)',
      b('AWS Organizations helps you centrally manage and govern your environment as you grow, applying policies across accounts.', 'orgs-intro',
        ['AWS Organizations helps you centrally manage and govern your environment as you grow and scale your AWS resources.'])),
    cue('prevent any account in the OU from ... / maximum permissions', 'a service control policy',
      b('SCPs offer central control over the maximum available permissions for IAM users and roles in the organization.', 'orgs-scps',
        ['SCPs offer central control over the maximum available permissions for the IAM users and IAM roles in your organization.'])),
    cue('quickly set up a secure multi-account environment with best practices', 'AWS Control Tower',
      b('Control Tower offers a straightforward way to set up and govern a multi-account environment following prescriptive best practices.', 'control-tower',
        ['AWS Control Tower offers a straightforward way to set up and govern an AWS multi-account environment, following prescriptive best practices.'])),
    cue('grant access to users in another AWS account', 'a cross-account IAM role (or a resource-based policy)',
      b('To share across accounts, attach a resource policy to the resource or use a role as a proxy.', 'iam-cross-account',
        ['To do this, you can attach a resource policy directly to the resource that you want to share, or use a role as a proxy.'])),
    cue('share a resource such as a subnet or license with other accounts without copying it', 'AWS Resource Access Manager',
      b('With AWS RAM you create a resource once and make it usable by other accounts.', 'ram-what-is',
        ['you can create a resource once and use AWS RAM to make that resource usable by those other accounts.'])),
    cue('the CloudFront service needs to read a private S3 bucket', 'a bucket policy for the CloudFront service principal (origin access control)',
      b('An S3 bucket policy allows the CloudFront service principal to access the bucket.', 'cf-oac',
        ['Use an S3 bucket policy to allow the CloudFront service principal (cloudfront.amazonaws.com) to access the bucket.'])),
  ],
  examples: [
    example('Service control policy that denies leaving the organization', 'resource-policy',
      `
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyLeavingTheOrganization",
      "Effect": "Deny",
      "Action": "organizations:LeaveOrganization",
      "Resource": "*"
    }
  ]
}
`,
      [
        b('SCPs are similar to IAM permission policies and use almost the same syntax. This statement\'s Effect is Deny, so it blocks `organizations:LeaveOrganization` for the accounts it applies to.', ['orgs-scps', 'orgs-scp-eval'],
          ['orgs-scps|SCPs are similar to AWS Identity and Access Management permission policies and use almost the same syntax.',
           'orgs-scp-eval|any SCP from the root through each OU in the direct path to the account (including the target account itself) can deny that permission']),
        b('The Deny does not depend on an Allow SCP. What the allow side decides is everything else: SCPs do not grant permissions, and with no allowing SCP in the path every other action is denied. This is why the AWS examples use a deny list strategy and keep a FullAWSAccess policy (or another policy that allows access) attached to the organization entities.', ['orgs-scp-examples', 'orgs-scp-eval'],
          ['orgs-scp-examples|The SCP examples in this repository use a deny list strategy, which means that you also need a FullAWSAccess policy or other policy that allows access attached to your organization entities to allow actions.',
           'orgs-scp-eval|SCP evaluation follows a deny-by-default model, meaning that any permissions not explicitly allowed in the SCPs are denied.',
           'orgs-scp-eval|This is why when you enable SCPs, AWS Organizations attaches an AWS managed SCP policy named FullAWSAccess which allows all services and actions.']),
        b('An SCP can be attached to a root, an organizational unit (OU) or an account. It would have no effect on users or roles in the management account.', ['orgs-policies-attach', 'orgs-scps'],
          ['orgs-policies-attach|To attach an authorization policy (SCP or RCP) to a root, OU, or account', 'orgs-scps|They have no effect on users or roles in the management account.']),
        b('Illustrative only: pick the actions to deny from your own requirements. AWS strongly recommends not attaching SCPs to the root of your organization without thoroughly testing the impact on accounts.', 'orgs-scps',
          ['AWS strongly recommends that you don\'t attach SCPs to the root of your organization without thoroughly testing the impact that the policy has on accounts.']),
      ]),
    example('Bucket policy that lets one CloudFront distribution read an S3 bucket', 'bucket-policy',
      `
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipalReadOnly",
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::example-site-bucket/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::<ACCOUNT_ID>:distribution/<DISTRIBUTION_ID>"
        }
      }
    }
  ]
}
`,
      [
        b('This is a resource-based policy: it sits on the bucket, so it must name a `Principal`. Here the principal is an AWS service, the CloudFront service principal.', 'cf-oac',
          ['Use an S3 bucket policy to allow the CloudFront service principal (cloudfront.amazonaws.com) to access the bucket.']),
        b('`Action` lists only `s3:GetObject`, so the statement allows reading objects and nothing else.', 'iam-el-action',
          ['The Action element describes the specific action or actions that will be allowed or denied.']),
        b('The `Condition` element lets you specify conditions for when a policy is in effect. Here it matches on a distribution ARN, so the statement applies to requests from that distribution. The element is optional.', 'iam-el-condition',
          ['The Condition element (or Condition block) lets you specify conditions for when a policy is in effect.', 'The Condition element is optional.']),
        b('Illustrative only: `<ACCOUNT_ID>` and `<DISTRIBUTION_ID>` are placeholders, and the bucket name is made up. The CloudFront documentation on restricting access to an S3 origin publishes its own example of a read-only bucket policy for a distribution with OAC enabled.', 'cf-oac',
          ['Example S3 bucket policy that allows read-only access for a CloudFront distribution with OAC enabled']),
      ]),
    example('Trust policy for a role that another account may assume', 'iam-policy',
      `
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::<TRUSTED_ACCOUNT_ID>:root" },
      "Action": "sts:AssumeRole"
    }
  ]
}
`,
      [
        b('This is the role\'s trust policy. The `Principal` is another AWS account, which is how you name the account whose users may need access.', 'iam-account-switch',
          ["you specify the accounts by ID whose users need access in the Principal element of the role's trust policy."]),
        b('The action is `sts:AssumeRole`: the trusted account\'s administrator must also grant their users or groups permission for that action before they can use it.', 'iam-cross-account-role',
          ['To do this, the administrator attaches a policy to the user or a group that grants permission for the sts:AssumeRole action.']),
        b('When the trusted entity is another AWS account, any IAM principal in that account can be granted access, so the trusted account controls who gets it. AWS offers IAM Access Analyzer to check which principals outside your zone of trust can assume your roles.', 'iam-account-switch',
          ['To learn whether principals in accounts outside of your zone of trust (trusted organization or account) have access to assume your roles, see What is IAM Access Analyzer?.']),
      ]),
  ],
  confuse: ['iam-roles-vs-resource-policies', 'scp-boundary-identity'],
  azure: [
    {
      concept: 'Azure management groups',
      aws: 'AWS Organizations',
      mapping: b('Management groups are how you organise Azure subscriptions; the Learn comparison pairs them with AWS Organizations, which groups AWS accounts and applies policy to them.',
        ['learn-hub', 'orgs-intro'],
        ['learn-hub|Azure management groups help you organize your resources and subscriptions.',
         'orgs-intro|group accounts to organize your workflows, apply policies for governance, and simplify billing']),
      breaks: b('In AWS, accounts are a hard boundary, and SCPs set a ceiling on permissions for the accounts underneath. SCPs do not grant permissions and have no effect on users or roles in the management account. Learn describes the Organizations and management groups row as providing security policy and role management when you work with multiple accounts.',
        ['sec-account-separation', 'orgs-scps', 'learn-hub'],
        ['sec-account-separation|In AWS, accounts are a hard boundary.',
         'orgs-scps|SCPs do not grant permissions to the IAM users and IAM roles in your organization.',
         'orgs-scps|They have no effect on users or roles in the management account.',
         'learn-hub|These services provide security policy and role management when you work with multiple accounts.']),
    },
    {
      concept: 'Azure Lighthouse and Azure landing zone',
      aws: 'AWS Control Tower',
      mapping: b('The Learn comparison pairs Control Tower with Azure Lighthouse and an Azure landing zone: all of them are about setting up and governing multi-account or multi-subscription environments.',
        ['learn-hub', 'control-tower'],
        ['learn-hub|Set up and govern multiple-account or multiple-subscription environments.',
         'control-tower|AWS Control Tower offers a straightforward way to set up and govern an AWS multi-account environment, following prescriptive best practices.']),
      breaks: b('Control Tower is a single AWS service that builds a landing zone and applies controls on top of Organizations, Service Catalog and IAM Identity Center, whereas the Learn row lists two separate Azure offerings against it.',
        ['learn-hub', 'control-tower'],
        ['learn-hub|AWS Control Tower Azure LighthouseAzure landing zone', 'control-tower|AWS Control Tower orchestrates the capabilities of several other AWS services, including AWS Organizations, AWS Service Catalog, and AWS IAM Identity Center, to build a landing zone'],
        { allow: ['two'] }),
    },
  ],
};

export default notes;
