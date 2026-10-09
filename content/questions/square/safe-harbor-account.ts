import type { Question } from '../../../src/content/types.ts';
import { mc, mr } from '../helpers.ts';

const questions: Question[] = [
  mc({
    id: 'safe-harbor-account-001',
    building: 'safe-harbor-account',
    d: 1,
    stem: 'A founder has just created a new AWS account and signs in with the email address and password used to create it for all daily administration. A security reviewer asks for the MOST secure way to handle daily work. Which solution meets this requirement?',
    correct: ['Create an administrative user in AWS IAM Identity Center and reserve root for tasks that need it', 'The root user has complete access and should be used only for tasks that require root-level permissions, while an administrative user handles daily work.'],
    wrong: [
      ['Keep using the root user for everything, because it already has every permission needed', 'The root user has complete access to the account, so daily use exposes the most powerful credentials to everyday risk.'],
      ['Share the root user password with the whole team so any administrator can sign in', 'Sharing the most privileged credentials widens exposure and makes it unclear who acted.'],
      ['Create access keys for the root user and give them to administrators for the CLI', 'AWS strongly recommends not creating root access keys because the root user has full access, including billing information.'],
    ],
    slot: 0,
    evidence: [
      'iam-root-user|We recommend that you configure an administrative user in AWS IAM Identity Center to perform daily tasks and access AWS resources.',
      'iam-root-user|Use the root user only to perform the tasks that require root-level permissions.',
    ],
  }),
  mc({
    id: 'safe-harbor-account-002',
    building: 'safe-harbor-account',
    d: 2,
    stem: 'A company wants to add MFA to the root user of a new account. The security team wants the MOST phishing-resistant option. Which MFA type should it choose?',
    correct: ['A passkey or security key', 'Passkeys and security keys are FIDO-based, use public key cryptography and resist phishing, man-in-the-middle and replay attacks.'],
    wrong: [
      ['A virtual authenticator application generating one-time codes', 'This is a TOTP-based option, which AWS describes as a weaker level of security than FIDO-based authenticators.'],
      ['A hardware TOTP token', 'It is a TOTP-based option, which is not the phishing-resistant choice that AWS recommends first.'],
      ['A longer root user password and no second factor', 'A password alone is a single factor and does not add the second authentication factor that MFA provides.'],
    ],
    slot: 1,
    evidence: [
      'iam-mfa|We recommend that you use phishing-resistant MFA such as passkeys and security keys whenever possible.',
      'iam-mfa|These FIDO-based authenticators use public key cryptography and are resistant to phishing, man-in-the-middle, and replay attacks, providing a stronger level of security than TOTP-based options.',
    ],
  }),
  mc({
    id: 'safe-harbor-account-003',
    building: 'safe-harbor-account',
    d: 2,
    stem: 'A team sets a monthly cost limit for its practice account and wants an email warning BEFORE the money is actually spent, as soon as AWS expects the limit to be exceeded. Which solution meets this requirement?',
    correct: ['An AWS Budgets cost budget with a notification on forecasted spend', 'A budget can alert on forecasted spend before it accrues, and a cost budget tracks spending against the limit.'],
    wrong: [
      ['An AWS Budgets cost budget that notifies only when actual spend reaches the limit', 'An actual-spend alert fires after the cost has accrued, so it is not a warning before the money is spent.'],
      ['An AWS Budgets usage budget on one service\'s usage amount', 'A usage budget tracks usage against a threshold rather than the monthly cost limit.'],
      ['An AWS Budgets RI utilization budget', 'This alerts when Reserved Instance utilization falls below a threshold and says nothing about total spend.'],
    ],
    slot: 2,
    evidence: [
      'budgets-managing|You can choose to be alerted for both actual (after accruing) and forecasted (before accruing) spends.',
      'budgets-managing|Cost budgets: Set spending limits for services and receive alerts when costs approach or exceed your defined threshold.',
    ],
  }),
  mr({
    id: 'safe-harbor-account-004',
    building: 'safe-harbor-account',
    d: 3,
    stem: 'A training company gives students a sandbox AWS account. It needs an email warning when spend reaches 80 percent of the monthly budget and an automatic way to stop students from provisioning more resources, with the LEAST manual effort. Which TWO actions meet these requirements? (Choose two.)',
    correct: [
      ['Create a cost budget with a notification at 80 percent of the budgeted amount', 'A cost budget alerts when costs approach a threshold, and the notification can be set at 80 percent.'],
      ['Configure a budget action that applies a custom IAM policy denying the ability to provision additional resources', 'A budget can apply an action automatically, such as an IAM policy that denies provisioning more resources.'],
    ],
    wrong: [
      ['Create an RI utilization budget for the account', 'It alerts on Reserved Instance utilization, which does not track spend against the monthly budget.'],
      ['Review the monthly invoice after the month closes', 'This happens after the spend and requires manual effort, so it does not warn at 80 percent or block provisioning.'],
      ['Create a usage budget for a single service', 'It covers one service\'s usage and does not warn on the account\'s total spend.'],
      ['Ask an administrator to check spending weekly and remove permissions by hand', 'This is manual and can miss the threshold, which fails the least-manual-effort requirement.'],
    ],
    slots: [3, 1],
    evidence: [
      'budgets-managing|Then, you can configure your notifications for 80 percent of your budgeted amount and apply an action.',
      'budgets-managing|For example, you could automatically apply a custom IAM policy that denies you the ability to provision additional resources within an account.',
    ],
  }),
  mc({
    id: 'safe-harbor-account-005',
    building: 'safe-harbor-account',
    d: 3,
    stem: 'In a standalone AWS account, a misconfigured bucket policy on an Amazon S3 bucket denies all principals access to the bucket, including every administrator. The company must regain access with the LEAST workaround. Which action should it take?',
    correct: ['Sign in as the root user and remove the bucket policy', 'Removing a misconfigured bucket policy that denies all principals is a task that requires root user credentials.'],
    wrong: [
      ['Sign in as an AWS IAM Identity Center administrator and delete the bucket policy', 'The policy denies all principals, so an administrative user cannot remove it.'],
      ['Create a new IAM user with administrator permissions and delete the bucket policy', 'The new user is still a principal that the policy denies, so the delete is blocked.'],
      ['Attach an IAM policy that allows the delete action to the administrator role', 'An allow in an IAM policy does not override the bucket policy\'s deny for all principals.'],
    ],
    slot: 3,
    evidence: [
      'iam-root-user|Remove a misconfigured bucket policy that denies all principals from accessing an Amazon S3 bucket.',
      'iam-root-user|Some tasks can only be performed when you sign in as the root user of an account.',
    ],
  }),
  mc({
    id: 'safe-harbor-account-006',
    building: 'safe-harbor-account',
    d: 2,
    stem: 'A team wants a budget alert when total usage hours of a single service go above a limit, regardless of what that usage costs. Which type of AWS Budgets budget is the BEST fit?',
    correct: ['A usage budget', 'A usage budget sets usage limits for one or more services and notifies when usage approaches or exceeds the threshold.'],
    wrong: [
      ['A cost budget', 'A cost budget sets spending limits, so it follows the price of the usage instead of the usage itself.'],
      ['An RI utilization budget', 'This alerts when Reserved Instance utilization falls below a threshold, which is a different measurement.'],
      ['A Savings Plans coverage budget', 'This alerts when the share of eligible usage covered by Savings Plans falls below a level, not when usage grows past a limit.'],
    ],
    slot: 0,
    evidence: [
      'budgets-managing|Usage budgets: Establish usage limits for one or more services and get notified when usage approaches or exceeds your set threshold.',
      'budgets-managing|Cost budgets: Set spending limits for services and receive alerts when costs approach or exceed your defined threshold.',
    ],
  }),
  mc({
    id: 'safe-harbor-account-007',
    building: 'safe-harbor-account',
    d: 2,
    stem: 'The root user of a company\'s AWS account is tied to the personal mailbox of the founder, who is about to leave. If AWS must contact the account owner, replies could be delayed. What is the BEST change to the root user credentials?',
    correct: ['Use an email address managed by the business that forwards to a group of users', 'A group address reduces the risk of delays when individuals are away or have left the business.'],
    wrong: [
      ['Keep the founder\'s mailbox and ask the founder to share its password with the team', 'Sharing a mailbox password spreads access to the root user recovery path and keeps the dependence on one person.'],
      ['Create access keys for the root user and give them to the new account owner', 'Root access keys are discouraged because the root user has full access, and they do not change who receives account email.'],
      ['Keep the personal email and set a mail rule to forward to a colleague', 'The root email would still be tied to the departing person\'s mailbox, which stays a single point of failure.'],
    ],
    slot: 1,
    evidence: [
      'iam-root-best-practices|Use an email address that is managed by your business and forwards received messages directly to a group of users.',
      'iam-root-best-practices|If AWS must contact the owner of the account, this approach reduces the risk of delays in responding, even if individuals are on vacation, out sick, or have left the business.',
    ],
  }),
  mr({
    id: 'safe-harbor-account-008',
    building: 'safe-harbor-account',
    d: 2,
    stem: 'A company is hardening the root user of a new account. Which TWO actions BEST follow AWS recommendations for the root user? (Choose two.)',
    correct: [
      ['Register multi-factor authentication for the root user', 'Because the root user can perform privileged actions, MFA is added as a second authentication factor in addition to the email address and password.'],
      ['Do not create access keys for the root user', 'AWS strongly recommends against root access keys because the root user has full access, including billing information.'],
    ],
    wrong: [
      ['Share the root password in a team chat so any engineer can sign in', 'Sharing the password widens exposure of the most privileged credential.'],
      ['Store the root password only in a tool that runs inside the same account', 'AWS advises against storing the root password with tools that depend on services in an account accessed with that same password, because losing the password locks you out of the tool.'],
      ['Use the root user for daily deployments to avoid role switching', 'The root user should be used only for tasks that require it, not for everyday work.'],
    ],
    slots: [2, 4],
    evidence: [
      'iam-root-best-practices|Because a root user can perform privileged actions, it\'s crucial to add MFA for the root user as a second authentication factor in addition to the email address and password as sign-in credentials.',
      'iam-root-best-practices|We strongly recommend that you do not create access keys for your root user because the root user has full access to all AWS services and resources in the account, including billing information.',
    ],
  }),
  mc({
    id: 'safe-harbor-account-009',
    building: 'safe-harbor-account',
    d: 1,
    stem: 'A startup creates a standalone AWS account, not part of an organization, and a colleague says MFA for the root user is optional for standalone accounts. Which statement from the AWS documentation BEST describes the situation?',
    correct: ['MFA is enforced for the root user of all account types', 'AWS states that MFA is enforced for all account types for their root user, and standalone accounts are included.'],
    wrong: [
      ['MFA is enforced only for the root user of management accounts', 'AWS states that root user MFA covers all account types, not only management accounts.'],
      ['MFA is enforced only for the root user of member accounts', 'AWS states that root user MFA covers all account types, not only member accounts.'],
      ['MFA for the root user is optional for standalone accounts', 'AWS lists standalone accounts among the account types where root user MFA is enforced.'],
    ],
    slot: 2,
    evidence: [
      'iam-mfa|MFA is enforced for all account types for their root user.',
      'iam-mfa|You can enable MFA for the AWS account root user of all AWS accounts, including standalone accounts, management accounts, and member accounts, as well as for your IAM users.',
    ],
  }),
  mc({
    id: 'safe-harbor-account-010',
    building: 'safe-harbor-account',
    d: 3,
    stem: 'A company is about to let an engineer create billable resources in a new practice account. It wants the root user protected, daily access that avoids long-term credentials, and an early warning if spend drifts. Which combination meets these requirements MOST effectively?',
    correct: ['Enable root user MFA, use an IAM Identity Center administrative user daily, and set a forecasted-spend cost budget', 'It protects the root user with a second factor, uses temporary credentials for daily work and warns before spend accrues.'],
    wrong: [
      ['Create root user access keys, share one IAM user\'s keys for daily work, and read the invoice monthly after it arrives', 'Root and shared long-term keys expose the most powerful access, and a monthly invoice review is not an early warning.'],
      ['Use the root user daily with a very long password, and create a usage budget for one single service', 'Daily use of the root user is discouraged, and a usage budget on one service does not warn about overall spend.'],
      ['Enable root user MFA, give the engineer long-term IAM user keys, and rely on RI utilization budget alerts', 'Long-term keys are not temporary credentials, and RI utilization alerts do not warn about drifting spend.'],
    ],
    slot: 0,
    evidence: [
      'iam-root-user|We recommend that you configure an administrative user in AWS IAM Identity Center to perform daily tasks and access AWS resources.',
      'iam-best-practices|Require human users to use federation with an identity provider to access AWS using temporary credentials',
      'budgets-managing|You can choose to be alerted for both actual (after accruing) and forecasted (before accruing) spends.',
    ],
  }),
];

export default questions;
