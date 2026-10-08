import type { BuildingNotes } from '../../../src/content/types.ts';
import { b, cue, example } from '../../helpers.ts';

const notes: BuildingNotes = {
  building: 'identity-keep',
  overview: [
    b('Every secure design starts with answering "who can do what to which resource?". In AWS that is {{term:iam}}: you create identities (users, groups and roles), attach policies to say what they may do, and keep the {{term:root-user}} out of daily use. The exam rewards the answer that grants only what is needed and uses temporary credentials wherever it can.',
      ['iam-intro', 'iam-best-practices'],
      ['iam-intro|With IAM, you can manage permissions that control which AWS resources users can access.',
       'iam-best-practices|Apply least-privilege permissions When you set permissions with IAM policies, grant only the permissions required to perform a task.']),
  ],
  beyondProject: [
    b('Your serverless visitor counter already depends on IAM, because a Lambda function runs with an execution role: an IAM role that grants the function permission to use other AWS services. What your project taught you is that a role exists. What SAA adds is the design judgement: scope that role to exactly the actions and resources the function needs (for example one DynamoDB table and the log group), and understand that Lambda assumes the role for you so the function never needs stored keys.',
      'lambda-exec-role',
      ["A Lambda function's execution role is an AWS Identity and Access Management (IAM) role",
       'Lambda automatically assumes your execution role when you invoke your function.']),
    b('Expect questions that offer a broad managed policy and a narrowly scoped custom policy for the same job. The best answer follows least privilege: define the actions that can be taken on specific resources under specific conditions.',
      'iam-best-practices', ['You do this by defining the actions that can be taken on specific resources under specific conditions, also known as least-privilege permissions.']),
  ],
  bullets: [
    {
      id: '1.1-K4',
      concepts: [
        b('{{term:least-privilege}} means granting only the permissions required to perform a task. AWS describes it as defining the actions that can be taken on specific resources under specific conditions, and says you can start from what the use case needs and work to reduce permissions as it matures.',
          'iam-best-practices',
          ['Apply least-privilege permissions When you set permissions with IAM policies, grant only the permissions required to perform a task.',
           'As your use case matures, you can work to reduce the permissions that you grant to work toward least privilege.']),
        b('AWS\'s IAM best practices push temporary credentials: require human users to use federation with an identity provider, and require workloads to use IAM roles. Both avoid long-lived access keys.',
          'iam-best-practices',
          ['Require your human users to use temporary credentials when accessing AWS.',
           'Require workloads to use temporary credentials with IAM roles to access AWS']),
        b('Other best practices in the same list include requiring {{term:mfa}} and updating access keys when long-term credentials are unavoidable.',
          'iam-best-practices', ['Require multi-factor authentication (MFA)', 'Update access keys when needed for use cases that require long-term credentials']),
      ],
      services: ['IAM'],
      design: [
        b('In a design question, the secure answer gives each workload its own role with a narrow policy, gives people federated sign-in or an identity provider instead of shared keys, and enables MFA for anything with console access.',
          ['iam-best-practices', 'iam-roles'],
          ['iam-best-practices|Require workloads to use temporary credentials with IAM roles to access AWS',
           'iam-roles|Also, a role does not have standard long-term credentials such as a password or access keys associated with it.']),
      ],
    },
    {
      id: '1.1-S1',
      concepts: [
        b('Root user: it has complete access to the account, so use it only for tasks that need root-level permissions. AWS lists those tasks on a dedicated page, and states that MFA is enforced for the root user of all account types.',
          ['iam-root-user', 'iam-mfa'],
          ['iam-root-user|Use the root user only to perform the tasks that require root-level permissions.',
           'iam-mfa|MFA is enforced for all account types for their root user.']),
        b('MFA: AWS recommends phishing-resistant MFA such as passkeys and security keys whenever possible. Those FIDO-based authenticators use public key cryptography and resist phishing, man-in-the-middle and replay attacks.',
          'iam-mfa', ['We recommend that you use phishing-resistant MFA such as passkeys and security keys whenever possible.',
            'These FIDO-based authenticators use public key cryptography and are resistant to phishing, man-in-the-middle, and replay attacks']),
        b('IAM users: an IAM user is an entity you create in your AWS account, and AWS\'s best practices say human users should use federation with an identity provider to get temporary credentials instead.',
          'iam-users', ['An IAM user is an entity that you create in your AWS account.',
            'IAM best practices recommend that you require human users to use federation with an identity provider to access AWS using temporary credentials']),
      ],
      services: ['IAM'],
      design: [
        b('Typical right answers: enable MFA on the root user and on any IAM user; do not create access keys for the root user for daily work; prefer federated or Identity Center users for people. If an option says to share the root credentials with the team, it is wrong.',
          ['iam-root-user', 'iam-mfa'],
          ['iam-root-user|Use the root user only to perform the tasks that require root-level permissions.', 'iam-mfa|MFA is enforced for all account types for their root user.']),
      ],
    },
    {
      id: '1.1-S2',
      concepts: [
        b('Building blocks: an {{term:iam-user}} is an entity you create in your account; an {{term:iam-group}} is a collection of IAM users; an {{term:iam-role}} is an identity with specific permissions that has no long-term password or access keys and gives temporary credentials when assumed.',
          ['iam-users', 'iam-groups', 'iam-roles'],
          ['iam-users|An IAM user is an entity that you create in your AWS account.',
           'iam-groups|An IAM user group is a collection of IAM users.',
           'iam-roles|Instead, when you assume a role, it provides you with temporary security credentials for your role session.']),
        b('A {{term:policy}} is an object that, when associated with an identity or resource, defines their permissions. AWS supports nine policy types, including identity-based policies, resource-based policies, permissions boundaries, SCPs and session policies; identity-based policies grant permissions to an identity.',
          'iam-policies',
          ['A policy is an object in AWS that, when associated with an identity or resource, defines their permissions.',
           'AWS supports nine types of policies: identity-based policies, resource-based policies, VPC endpoint policies, permissions boundaries, AWS Organizations service control policies (SCPs)',
           'Identity-based policies grant permissions to an identity.']),
        b('Identity-based policies can be managed (AWS managed or customer managed, reusable) or inline (tied one-to-one to a single identity).',
          'iam-managed-inline', ['AWS managed policies Standalone policy created and administered by AWS.',
            'Policy created for a single IAM identity (user, group, or role) that maintains a strict one-to-one relationship between a policy and an identity.']),
        b('When a request arrives, AWS evaluates all the policy types that apply, and an explicit deny in any of the relevant policies overrides an allow.',
          'iam-eval-logic', ['AWS evaluates all of the policy types and the order of the policies affects how they are evaluated.', 'An explicit deny in either of these policies overrides the allow.']),
      ],
      services: ['IAM'],
      design: [
        b('A flexible model attaches permissions to groups (for sets of people with the same job) or roles (for workloads and for cross-account access), and keeps individual user policies rare. Use customer managed policies for reuse, and inline policies only when a strict one-to-one relationship is intended.',
          ['iam-groups', 'iam-managed-inline'],
          ['iam-groups|An IAM user group is a collection of IAM users.',
           'iam-managed-inline|Policy created for a single IAM identity (user, group, or role) that maintains a strict one-to-one relationship between a policy and an identity.']),
        b('A group cannot be a principal in a policy, because groups relate to permissions, not authentication. If a question wants to grant a resource policy to "the team", it needs the users or a role, not the group.',
          'iam-el-principal', ['You cannot identify a user group as a principal in a policy (such as a resource-based policy) because groups relate to permissions, not authentication, and principals are authenticated IAM entities.']),
      ],
    },
  ],
  cues: [
    cue('grant only the permissions required', 'least-privilege policy scoped to specific actions and resources',
      b('IAM best practices define least privilege as granting only the permissions required to perform a task.', 'iam-best-practices',
        ['grant only the permissions required to perform a task'])),
    cue('application running on EC2 / Lambda needs access to another AWS service', 'an IAM role (temporary credentials), not stored access keys',
      b('AWS says to require workloads to use temporary credentials with IAM roles.', 'iam-best-practices',
        ['Require workloads to use temporary credentials with IAM roles to access AWS'])),
    cue('human users, a corporate identity provider', 'federation / IAM Identity Center rather than individual IAM users',
      b('AWS recommends requiring human users to use federation with an identity provider to access AWS with temporary credentials.', 'iam-users',
        ['IAM best practices recommend that you require human users to use federation with an identity provider to access AWS using temporary credentials'])),
    cue('explicitly deny / even if another policy allows it', 'an explicit deny always wins',
      b('An explicit deny in the relevant policies overrides an allow.', 'iam-eval-logic', ['An explicit deny in either of these policies overrides the allow.'])),
    cue('secure the account root user', 'enable MFA and avoid daily use',
      b('Use the root user only for tasks that require root-level permissions.', 'iam-root-user',
        ['Use the root user only to perform the tasks that require root-level permissions.'])),
  ],
  examples: [
    example('Least-privilege identity policy', 'iam-policy',
      `
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadReportsOnly",
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::example-reports-bucket/reports/*"
    }
  ]
}
`,
      [
        b('`Version` should always be set to `2012-10-17`, the current version of the policy language.', 'iam-el-version',
          ['This is the current version of the policy language, and you should always include a Version element and set it to 2012-10-17.']),
        b('`Sid` is an optional identifier for the statement; it is a label, and it does not change what the statement does.', 'iam-el-sid',
          ['You can provide a Sid (statement ID) as an optional identifier for the policy statement.']),
        b('`Effect` is required and says whether the statement results in an allow or an explicit deny. This statement allows.', 'iam-el-effect',
          ['The Effect element is required and specifies whether the statement results in an allow or an explicit deny.']),
        b('`Action` names the specific action allowed. Only `s3:GetObject` is listed, so the identity can read objects but not list, write or delete.', 'iam-el-action',
          ['The Action element describes the specific action or actions that will be allowed or denied.']),
        b('`Resource` identifies what the action applies to, always by Amazon Resource Name (ARN). Limiting it to one bucket prefix is the "specific resources" part of least privilege.', 'iam-el-resource',
          ['You specify a resource using an Amazon Resource Name (ARN).']),
        b('Illustrative only: the bucket name is a placeholder. There is no `Principal` because this is an identity-based policy, which is attached to a user, group or role and cannot use the Principal element.', 'iam-el-principal',
          ['You cannot use the Principal element in an identity-based policy.']),
      ]),
    example('Trust policy for a Lambda execution role', 'iam-policy',
      `
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
`,
      [
        b('This is a role trust policy: the `Principal` says who is allowed to assume the role. Here the trusted service is Lambda.', 'iam-el-principal',
          ['In IAM roles, use the Principal element in the role trust policy to specify who can assume the role.']),
        b('For Lambda to assume the execution role, the role\'s trust policy must specify the Lambda service principal, `lambda.amazonaws.com`, as a trusted service.', 'lambda-exec-role',
          ["the role's trust policy must specify the Lambda service principal (lambda.amazonaws.com) as a trusted service"]),
        b('A separate permissions policy (like the first example) says what the role can do once assumed. The trust policy and the permissions policy do different jobs.', 'iam-roles',
          ['An IAM role is similar to an IAM user, in that it is an AWS identity with permission policies that determine what the identity can and cannot do in AWS.']),
      ]),
  ],
  confuse: [],
  azure: [
    {
      concept: 'Azure role-based access control (Azure RBAC)',
      aws: 'AWS Identity and Access Management (IAM)',
      mapping: b('Azure RBAC is how you already decide who can do what to Azure resources. The Learn comparison pairs it with IAM: both control which identities can take which actions on which resources.',
        ['learn-hub', 'iam-intro'],
        ['learn-hub|Azure RBAC helps you manage who can access Azure resources, which resources they can access, and what they can do with those resources.',
         'iam-intro|With IAM, you can manage permissions that control which AWS resources users can access.']),
      breaks: b('IAM is built around JSON policy documents with an evaluation order where an explicit deny wins, and around roles that give temporary credentials when assumed. If you think in terms of Azure role assignments at a scope, translate carefully: in AWS the permissions live in policies that you attach to identities or resources.',
        ['learn-hub', 'iam-policies'],
        ['learn-hub|Azure RBAC helps you manage who can access Azure resources',
         'iam-policies|A policy is an object in AWS that, when associated with an identity or resource, defines their permissions.']),
    },
    {
      concept: 'Microsoft Entra ID (multi-factor authentication)',
      aws: 'MFA for IAM',
      mapping: b('Multi-factor authentication works the same way in spirit: a second proof beyond the password. The Learn comparison pairs Entra ID MFA with MFA for IAM.',
        ['learn-hub', 'iam-mfa'],
        ['learn-hub|Help safeguard access to data and applications while providing a straightforward sign-in process to users',
         'iam-mfa|we recommend that you configure multi-factor authentication (MFA) to help protect your AWS resources']),
      breaks: b('In AWS, MFA protects the root user and individual IAM users, and AWS states that it is enforced for the root user of all account types. Entra ID is a directory for your whole organisation; an AWS account root user is a separate identity that exists per account.',
        ['learn-hub', 'iam-mfa'],
        ['learn-hub|Microsoft Entra ID', 'iam-mfa|MFA is enforced for all account types for their root user.']),
    },
  ],
};

export default notes;
