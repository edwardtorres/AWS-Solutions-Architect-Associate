import type { BuildingNotes } from '../../../src/content/types.ts';
import { b, cue } from '../../helpers.ts';

const notes: BuildingNotes = {
  building: 'federation-bridge',
  overview: [
    b('Most organisations already have a place where their people are defined: a corporate directory or identity provider. {{term:federation}} lets those people sign in to AWS with that existing identity instead of getting a separate IAM user each. The SAA question is usually which AWS service connects the directory to AWS, and whether it should.',
      ['iam-saml', 'sso-what-is'],
      ['iam-saml|so users can log into the AWS Management Console or call AWS API operations without you having to create an IAM user for everyone in your organization.',
       'sso-what-is|You can connect your existing identity provider and synchronize users and groups from your directory, or create and manage your users directly in IAM Identity Center.']),
    b('For workforce access, {{rename:iam-identity-center}} is the AWS service built for connecting your workforce users to AWS accounts and applications. You federate once, and with a SAML 2.0 identity provider you manage a single certificate.',
      'sso-what-is',
      ['AWS IAM Identity Center is the AWS solution for connecting your workforce users to AWS managed applications',
       'With IAM Identity Center, you only federate once, and you have only one certificate to manage when using a SAML 2.0 identity provider.']),
  ],
  bullets: [
    {
      id: '1.1-K2',
      concepts: [
        b('IAM supports SAML 2.0 federation, which enables federated single sign-on: users from a SAML identity provider get console or API access through an IAM role instead of an IAM user.',
          'iam-saml', ['This feature enables federated single sign-on (SSO), so users can log into the AWS Management Console or call AWS API operations']),
        b('IAM Identity Center can use its own user store, an external identity provider, or Active Directory as the identity source. With Active Directory it can connect a self-managed directory or a directory in AWS Managed Microsoft AD through AWS Directory Service.',
          ['sso-what-is', 'sso-ad'],
          ['sso-what-is|You can connect your existing identity provider and synchronize users and groups from your directory, or create and manage your users directly in IAM Identity Center.',
           'sso-ad|you can connect a self-managed directory in Active Directory (AD) or a directory in AWS Managed Microsoft AD by using AWS Directory Service']),
        b('IAM roles are what federated users end up using: when you assume a role you get temporary security credentials for the role session.',
          'iam-roles', ['Instead, when you assume a role, it provides you with temporary security credentials for your role session.']),
      ],
      services: ['AWS IAM Identity Center', 'IAM', 'AWS Directory Service'],
      design: [
        b('Workforce users who need access to several AWS accounts and applications: use IAM Identity Center with the corporate identity provider as the source. Single application with its own end users: a different tool (Amazon Cognito, see Warden\'s Lodge).',
          ['sso-what-is'], ['AWS IAM Identity Center is the AWS solution for connecting your workforce users to AWS managed applications']),
      ],
    },
    {
      id: '1.1-S6',
      concepts: [
        b('{{term:aws-directory-service}} provides several ways to use Microsoft Active Directory (AD) with other AWS services. AWS Managed Microsoft AD is powered by an actual Windows Server Active Directory managed by AWS. AD Connector is a proxy that lets compatible AWS applications use your existing on-premises directory.',
          'ds-what-is',
          ['AWS Directory Service provides multiple ways to use Microsoft Active Directory (AD) with other AWS services.',
           'Also known as AWS Managed Microsoft AD, AWS Directory Service for Microsoft Active Directory is powered by an actual Microsoft Windows Server Active Directory (AD), managed by AWS in the AWS Cloud.',
           'AD Connector is a proxy service that provides an easy way to connect compatible AWS applications, such as Amazon WorkSpaces, Amazon Quick, and Amazon EC2 for Windows Server instances, to your existing on-premises Microsoft Active Directory.']),
        b('AD Connector also removes the need for directory synchronization or the cost and complexity of hosting a federation infrastructure.',
          'ds-what-is', ['AD Connector also eliminates the need of directory synchronization or the cost and complexity of hosting a federation infrastructure.']),
      ],
      services: ['AWS Directory Service', 'AWS IAM Identity Center', 'IAM'],
      design: [
        b('Decide to federate when the people already exist in a directory: the alternative, an IAM user per person, adds credentials to manage. Choose AWS Directory Service when applications on AWS need Active Directory itself (for example domain-joined Windows workloads), and IAM Identity Center or SAML federation when the goal is signing people in to AWS.',
          ['iam-users', 'ds-what-is'],
          ['iam-users|IAM best practices recommend that you require human users to use federation with an identity provider to access AWS using temporary credentials',
           'ds-what-is|AWS Directory Service provides multiple directory choices for customers who want to use existing Microsoft AD or Lightweight Directory Access Protocol (LDAP)–aware applications in the cloud.']),
      ],
    },
  ],
  cues: [
    cue('single sign-on for employees across multiple AWS accounts', 'AWS IAM Identity Center',
      b('IAM Identity Center is the AWS solution for connecting workforce users to AWS applications and resources.', 'sso-what-is',
        ['AWS IAM Identity Center is the AWS solution for connecting your workforce users to AWS managed applications'])),
    cue('without creating an IAM user for everyone', 'federation (SAML 2.0 or IAM Identity Center)',
      b('SAML federation lets users sign in without an IAM user for everyone in the organisation.', 'iam-saml',
        ['without you having to create an IAM user for everyone in your organization'])),
    cue('existing on-premises Active Directory', 'AD Connector, or AWS Managed Microsoft AD',
      b('AD Connector proxies compatible AWS applications to an existing on-premises Microsoft Active Directory.', 'ds-what-is',
        ['to your existing on-premises Microsoft Active Directory'])),
    cue('domain-joined Windows servers or LDAP-aware applications in AWS', 'AWS Directory Service',
      b('AWS Directory Service provides directory choices for customers using Microsoft AD or LDAP-aware applications in the cloud.', 'ds-what-is',
        ['AWS Directory Service provides multiple directory choices for customers who want to use existing Microsoft AD or Lightweight Directory Access Protocol (LDAP)–aware applications in the cloud.'])),
  ],
  examples: [],
  confuse: [],
  azure: [
    {
      concept: 'Microsoft Entra ID',
      aws: 'AWS IAM Identity Center and IAM',
      mapping: b('Entra ID is the identity service you know. The Learn comparison pairs it with both IAM Identity Center and IAM because together they control who can reach AWS services and resources.',
        ['learn-hub', 'sso-what-is'],
        ['learn-hub|Use these services to more securely control access to services and resources and improve data security and protection.',
         'sso-what-is|AWS IAM Identity Center is the AWS solution for connecting your workforce users to AWS managed applications']),
      breaks: b('Entra ID is both the directory of people and the sign-in service. In AWS those roles split: IAM Identity Center signs workforce users in and can take its users from your existing identity provider, from Active Directory, or from a store you create in Identity Center itself.',
        ['learn-hub', 'sso-what-is'],
        ['learn-hub|Microsoft Entra ID', 'sso-what-is|You can connect your existing identity provider and synchronize users and groups from your directory, or create and manage your users directly in IAM Identity Center.']),
    },
    {
      concept: 'Microsoft Entra Domain Services',
      aws: 'AWS Directory Service',
      mapping: b('Entra Domain Services provides managed domain services such as domain join, Group Policy, LDAP and Kerberos/NTLM authentication. AWS Directory Service offers managed Active Directory for the same kind of workload.',
        ['learn-hub', 'ds-what-is'],
        ['learn-hub|Domain Services provides managed domain services, such as domain join, Group Policy, LDAP, and Kerberos/NTLM authentication, which are fully compatible with Windows Server Active Directory.',
         'ds-what-is|AWS Directory Service provides multiple ways to use Microsoft Active Directory (AD) with other AWS services.']),
      breaks: b('AWS Directory Service is a family of options rather than one product: AWS Managed Microsoft AD, AD Connector (a proxy to your on-premises directory), and others. Part of the exam skill is choosing which one fits.',
        ['ds-what-is', 'learn-hub'],
        ['ds-what-is|AWS Directory Service includes several directory types to choose from.', 'learn-hub|AWS Directory Service Microsoft Entra Domain Services']),
    },
  ],
};

export default notes;
