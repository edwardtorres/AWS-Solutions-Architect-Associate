import type { BuildingNotes } from '../../../src/content/types.ts';
import { b, cue } from '../../helpers.ts';

const notes: BuildingNotes = {
  building: 'safe-harbor-account',
  overview: [
    b('Later steps use a real AWS account for hands-on labs. Before anything billable exists, the account needs three things: a protected {{term:root-user}}, a way to sign in day to day without it, and a {{term:budget}} that warns you when spending drifts. This building explains each and why the exam cares about them.',
      'iam-root-user', ['you begin with a single sign-in identity that has complete access to all AWS'],
      { allow: ['three'] }),
    b('The root user is the identity you get when you create the account. It has complete access, so AWS tells you to use it only for the few tasks that require root-level permissions, and to protect it with multi-factor authentication. AWS states that MFA is enforced for the root user of all account types.',
      ['iam-root-user', 'iam-mfa'],
      ['iam-root-user|Use the root user only to perform the tasks that require root-level permissions.', 'iam-mfa|MFA is enforced for all account types for their root user.']),
    b('For everyday work, AWS recommends that people do not share long-lived keys. Its IAM best practices say to require human users to use temporary credentials, for example through federation with an identity provider, and to require workloads to use IAM roles for temporary credentials.',
      'iam-best-practices',
      ['Require your human users to use temporary credentials when accessing AWS.',
       'Require workloads to use temporary credentials with IAM roles to access AWS']),
    b('AWS Budgets warns you about spending. You can be alerted on actual spend (after it accrues) and on forecasted spend (before it accrues), and a budget can be a cost budget, a usage budget or a reservation-utilization budget.',
      'budgets-managing',
      ['You can choose to be alerted for both actual (after accruing) and forecasted (before accruing) spends.',
       'Usage budgets: Establish usage limits for one or more services and get notified when usage approaches or exceeds your set threshold.',
       'RI utilization budgets: Define a utilization threshold for your RIs and receive alerts when usage falls below this level']),
  ],
  bullets: [],
  cues: [
    cue('the account root user', 'protect it with MFA and avoid using it',
      b('The root user has complete access to the account, and AWS says to use it only for tasks that need root-level permissions.',
        'iam-root-user', ['Use the root user only to perform the tasks that require root-level permissions.'])),
    cue('multi-factor authentication', 'enable MFA on the root user and on human users',
      b('AWS recommends configuring {{term:mfa}} to help protect your resources, including the root user.',
        'iam-mfa', ['You can enable MFA for the AWS account root user of all AWS accounts'])),
    cue('alert when costs approach a limit', 'AWS Budgets',
      b('A cost budget sets a spending limit for services and alerts you when costs approach or exceed the threshold you define.',
        'budgets-managing', ['Cost budgets: Set spending limits for services and receive alerts when costs approach or exceed your defined threshold.'])),
  ],
  examples: [],
  confuse: [],
};

export default notes;
