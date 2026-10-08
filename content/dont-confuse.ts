import type { ConfusePair } from '../src/content/types.ts';
import { b } from './helpers.ts';

/**
 * Look-alike services and options. Each pair has a home building whose notes show it in full.
 * Pairs the brief requires are marked `required`; scripts/lib/notesChecks.ts lists them.
 */
const pairs: ConfusePair[] = [
  {
    id: 'kms-vs-cloudhsm',
    title: 'AWS KMS vs AWS CloudHSM',
    required: true,
    home: 'key-vault',
    items: [
      {
        name: 'AWS KMS',
        points: [
          b('An AWS managed service that makes it easy to create and control the keys used to encrypt and sign your data.', 'kms-overview',
            ['AWS Key Management Service (AWS KMS) is an AWS managed service that makes it easy for you to create and control the keys used to encrypt and sign your data.']),
          b('KMS keys are protected by FIPS-validated hardware security modules and never leave AWS KMS unencrypted.', 'kms-overview',
            ['The AWS KMS keys that you create in AWS KMS are protected by FIPS 140-3 Security Level 3 validated hardware security modules (HSM).', 'They never leave AWS KMS unencrypted.']),
          b('Access is controlled through the key policy, which AWS says is sufficient for many compliance requirements.', 'kms-key-stores',
            ['For many compliance requirements, the control you have over key access through the KMS key policy is sufficient.']),
        ],
      },
      {
        name: 'AWS CloudHSM',
        points: [
          b('Hardware security modules in the AWS Cloud that give you complete control: you manage keys and algorithms yourself.', 'cloudhsm',
            ['With AWS CloudHSM, you have complete control over high availability HSMs that are in the AWS Cloud',
             'Full control of your keys, algorithms, and application development AWS CloudHSM gives you full control of the algorithms and keys you use.']),
          b('The HSMs are standards-compliant and single-tenant.', 'cloudhsm', ['We offer HSMs that are standards-compliant, single-tenant']),
          b('KMS can also use CloudHSM: a custom key store is backed by a dedicated, customer-owned CloudHSM cluster.', 'kms-key-stores',
            ['There are two types: AWS CloudHSM key stores, backed by a dedicated, customer-owned AWS CloudHSM cluster, and external key stores, backed by an HSM or key management system outside the AWS Cloud.'],
            { allow: ['two'] }),
        ],
      },
    ],
    choose: [
      b('Default answer for "encrypt data and manage the keys" in AWS services: AWS KMS, with a key policy controlling who can use the key.', 'kms-key-policies',
        ['Key policies are the primary way to control access to KMS keys.']),
      b('When the requirement is single-tenant HSMs you control exclusively, or full control of the algorithms and keys, choose CloudHSM.', 'cloudhsm',
        ['Full control of your keys, algorithms, and application development AWS CloudHSM gives you full control of the algorithms and keys you use.']),
    ],
    trap: b('Both use HSMs, so "hardware-protected keys" does not decide it. The deciding words are "single-tenant" and "full control of the keys and algorithms", which point to CloudHSM.', ['kms-overview', 'cloudhsm'],
      ['kms-overview|protected by FIPS 140-3 Security Level 3 validated hardware security modules (HSM)', 'cloudhsm|standards-compliant, single-tenant']),
  },
  {
    id: 'sse-s3-kms-c',
    title: 'SSE-S3 vs SSE-KMS vs SSE-C (S3 server-side encryption)',
    required: true,
    home: 'key-vault',
    items: [
      {
        name: 'SSE-S3',
        points: [
          b('Server-side encryption with Amazon S3 managed keys is the default encryption configuration for every bucket, and all new objects are encrypted at rest automatically.', 's3-sse-s3-specify',
            ['Server-side encryption with Amazon S3 managed keys (SSE-S3) is the default encryption configuration for every bucket in Amazon S3.',
             'all new objects that are uploaded to an S3 bucket are automatically encrypted at rest.']),
          b('There are no additional fees for using SSE-S3.', 's3-sse-s3', ['There are no additional fees for using server-side encryption with Amazon S3 managed keys (SSE-S3).']),
        ],
      },
      {
        name: 'SSE-KMS',
        points: [
          b('Server-side encryption with AWS KMS keys; you can configure buckets to use it instead of the default, and the key policy and KMS permissions then govern who can read the objects.', ['s3-sse-kms', 'kms-key-policies'],
            ['s3-sse-kms|However, you can choose to configure buckets to use server-side encryption with AWS Key Management Service (AWS KMS) keys (SSE-KMS) instead.',
             'kms-key-policies|The statements in the key policy determine who has permission to use the KMS key and how they can use it.']),
        ],
      },
      {
        name: 'SSE-C',
        points: [
          b('You provide the encryption key as part of your request; S3 manages encryption and decryption as it writes and reads, and you manage the keys you provide.', 's3-sse-c',
            ['With the encryption key that you provide as part of your request, Amazon S3 manages data encryption as it writes to disks and data decryption when you access your objects.',
             'The only thing that you need to do is manage the encryption keys that you provide.']),
          b('AWS documents that new general purpose buckets now have SSE-C disabled for new write requests, so applications that need it must deliberately enable it after creating a bucket.', 's3-sse',
            ['In April 2026, Amazon S3 deployed an update so all new general purpose buckets have SSE-C encryption disabled for all new write requests.',
             'applications that need SSE-C encryption must deliberately enable SSE-C by using the PutBucketEncryption API operation after creating a new bucket.']),
        ],
      },
    ],
    choose: [
      b('Nothing specified: SSE-S3 already applies to every new object.', 's3-sse-s3', ['All new object uploads to Amazon S3 buckets are encrypted by default with server-side encryption with Amazon S3 managed keys (SSE-S3).']),
      b('Need to control or audit key use with key policies (for example separate key administrators and users)? SSE-KMS.', 'kms-key-policies', ['Key policies are the primary way to control access to KMS keys.']),
      b('Need to keep the key outside AWS and supply it on every request? SSE-C.', 's3-sse-c', ['The only thing that you need to do is manage the encryption keys that you provide.']),
    ],
    trap: b('Encryption at rest is already on by default with SSE-S3. A question that says "ensure objects are encrypted" is not asking for SSE-S3; it is asking you to choose between key-management models.', 's3-sse-s3-specify',
      ['all new objects that are uploaded to an S3 bucket are automatically encrypted at rest.']),
  },
  {
    id: 'gateway-vs-interface-endpoints',
    title: 'Gateway endpoints vs interface endpoints (VPC endpoints)',
    required: true,
    home: 'customs-house',
    items: [
      {
        name: 'Gateway endpoint',
        points: [
          b('Provides reliable connectivity to Amazon S3 and DynamoDB without an internet gateway or NAT device for your VPC.', 'vpce-gateway',
            ['Gateway VPC endpoints provide reliable connectivity to Amazon S3 and DynamoDB without requiring an internet gateway or a NAT device for your VPC.']),
          b('Works by adding the endpoint as a target in your route table for traffic destined to the service.', 'vpce-gateway-s3',
            ['After you create the gateway endpoint, you can add it as a target in your route table for traffic destined from your VPC to Amazon S3.']),
          b('There is no additional charge for gateway endpoints.', 'vpce-gateway', ['There is no additional charge for using gateway endpoints.']),
          b('Does not allow access from on-premises networks, from peered VPCs in other Regions, or through a transit gateway.', 'vpce-gateway-s3',
            ['However, gateway endpoints do not allow access from on-premises networks, from peered VPCs in other AWS Regions, or through a transit gateway.']),
        ],
      },
      {
        name: 'Interface endpoint',
        points: [
          b('Powered by AWS PrivateLink: for each subnet you specify, an endpoint network interface is created with a private IP address from the subnet address range.', ['privatelink-what-is', 'vpce-interface'],
            ['privatelink-what-is|AWS PrivateLink is a highly available, scalable technology that you can use to privately connect your VPC to services and resources as if they were in your VPC.',
             'vpce-interface|For each subnet that you specify from your VPC, we create an endpoint network interface in the subnet and assign it a private IP address from the subnet address range.']),
          b('Billed for hourly usage and data processing, unlike gateway endpoints.', 'vpce-interface', ['You are billed for hourly usage and data processing charges.']),
          b('Amazon S3 and DynamoDB support both gateway endpoints and interface endpoints; many other AWS services and services hosted by other providers use interface endpoints.', ['vpce-gateway', 'privatelink-concepts'],
            ['vpce-gateway|Amazon S3 and DynamoDB support both gateway endpoints and interface endpoints.', 'privatelink-concepts|Consumers create VPC endpoints to connect to endpoint services and resources that are hosted by providers.']),
        ],
      },
    ],
    choose: [
      b('Private access to S3 or DynamoDB from inside the VPC, at no extra charge, with no need for on-premises access? A gateway endpoint plus a route-table entry.', 'vpce-gateway-s3',
        ['With a gateway endpoint, you can access Amazon S3 from your VPC, without requiring an internet gateway or NAT device for your VPC, and with no additional cost.']),
      b('Private access to any other service, or to S3 from on-premises or another Region, or to a partner service? An interface endpoint (PrivateLink).', 'vpce-gateway-s3',
        ['However, gateway endpoints do not allow access from on-premises networks, from peered VPCs in other AWS Regions, or through a transit gateway.']),
    ],
    trap: b('"Keep traffic to S3 off the internet" has two valid answers; "at the lowest cost" picks the gateway endpoint, "from on-premises" or "through a transit gateway" picks an interface endpoint.', ['vpce-gateway-s3', 'vpce-interface'],
      ['vpce-gateway-s3|There is no additional charge for using gateway endpoints.', 'vpce-interface|You are billed for hourly usage and data processing charges.'],
      { allow: ['two'] }),
  },
  {
    id: 'direct-connect-vs-vpn',
    title: 'AWS Direct Connect vs AWS Site-to-Site VPN',
    required: true,
    home: 'transit-tariff',
    items: [
      {
        name: 'AWS Direct Connect',
        points: [
          b('Links your internal network to a Direct Connect location over a standard Ethernet fiber-optic cable, so you can create virtual interfaces to public AWS services or to Amazon VPC, bypassing internet service providers in your network path.', 'dx-what-is',
            ['Direct Connect links your internal network to a Direct Connect location over a standard Ethernet fiber-optic cable.',
             'you can create virtual interfaces directly to public AWS services (for example, to Amazon S3) or to Amazon VPC, bypassing internet service providers in your network path.']),
          b('Can reduce network costs, increase bandwidth throughput and provide a more consistent network experience than internet-based connections.', 'connectivity-dx',
            ['Direct Connect can reduce network costs, increase bandwidth throughput, and provide a more consistent network experience than internet-based connections.']),
        ],
      },
      {
        name: 'AWS Site-to-Site VPN',
        points: [
          b('Creates an IPsec VPN connection between your remote network and Amazon VPC over the internet.', 'connectivity-vpn',
            ['Amazon VPC provides the option of creating an IPsec VPN connection between your remote networks and Amazon VPC over the internet']),
          b('Each VPN connection includes two VPN tunnels that you can use simultaneously for high availability.', 's2s-vpn',
            ['Each VPN connection includes two VPN tunnels which you can simultaneously use for high availability.']),
        ],
      },
    ],
    choose: [
      b('Need a dedicated, consistent, high-bandwidth path and can wait for the physical connection to a Direct Connect location? Direct Connect.', 'connectivity-dx',
        ['Direct Connect can reduce network costs, increase bandwidth throughput, and provide a more consistent network experience than internet-based connections.']),
      b('Need encrypted connectivity quickly, over the existing internet connection? Site-to-Site VPN.', 'connectivity-vpn',
        ['Amazon VPC provides the option of creating an IPsec VPN connection between your remote networks and Amazon VPC over the internet']),
    ],
    trap: b('Direct Connect bypasses internet service providers, while Site-to-Site VPN runs over the internet; "must not traverse the public internet" points to Direct Connect, and "set up today" points to VPN.', ['dx-what-is', 'connectivity-vpn'],
      ['dx-what-is|bypassing internet service providers in your network path.', 'connectivity-vpn|over the internet']),
  },
  {
    id: 'shield-vs-waf',
    title: 'Shield Standard vs Shield Advanced vs AWS WAF',
    required: true,
    home: 'watchtower',
    items: [
      {
        name: 'AWS Shield Standard',
        points: [
          b('Automatic protection for all AWS customers at no additional charge.', 'shield-standard', ['All AWS customers benefit from the automatic protection of Shield Standard, at no additional charge.']),
          b('Defends against the most common, frequently occurring network and transport layer DDoS attacks against your website or applications.', 'shield-standard',
            ['Shield Standard defends against the most common, frequently occurring network and transport layer DDoS attacks that target your website or applications.']),
        ],
      },
      {
        name: 'AWS Shield Advanced',
        points: [
          b('A subscription for higher levels of protection: a managed service that helps protect your application against external threats like DDoS attacks, volumetric bots and vulnerability exploitation attempts.', 'shield-advanced',
            ['For higher levels of protection against attacks, you can subscribe to AWS Shield Advanced.',
             'AWS Shield Advanced is a managed service that helps you protect your application against external threats, like DDoS attacks, volumetric bots, and vulnerability exploitation attempts.']),
          b('Provides expanded DDoS attack protection for the resources you add protection to, and your subscription covers the costs of standard AWS WAF capabilities for resources protected with Shield Advanced.', 'shield-advanced',
            ['When you subscribe to Shield Advanced and add protection to your resources, Shield Advanced provides expanded DDoS attack protection for those resources.',
             'Your Shield Advanced subscription covers the costs of using standard AWS WAF capabilities for resources that you protect with Shield Advanced.']),
        ],
      },
      {
        name: 'AWS WAF',
        points: [
          b('A web application firewall that lets you monitor the HTTP(S) requests forwarded to protected resources and control access with a web ACL of rules.', 'waf-what-is',
            ['AWS WAF is a web application firewall that lets you monitor the HTTP(S) requests that are forwarded to your protected web application resources.']),
          b('Protects resource types including Amazon CloudFront distributions, Amazon API Gateway REST APIs and Application Load Balancers.', 'waf-what-is',
            ['You can protect the following resource types: Amazon CloudFront distributionAmazon API Gateway REST APIApplication Load Balancer']),
          b('Includes rule statements that inspect for malicious SQL code, one way attackers try to modify or extract data from your database.', 'waf-sqli',
            ['An SQL injection rule statement inspects for malicious SQL code.', 'Attackers insert malicious SQL code into web requests in order to do things like modify your database or extract data from it.']),
        ],
      },
    ],
    choose: [
      b('Flood of traffic overwhelming the application, no extra spend wanted? Shield Standard already protects every customer at the network and transport layers.', 'shield-standard',
        ['All AWS customers benefit from the automatic protection of Shield Standard, at no additional charge.']),
      b('Need expanded DDoS protection for specific resources? Subscribe to Shield Advanced and add protection to those resources.', 'shield-advanced',
        ['When you subscribe to Shield Advanced and add protection to your resources, Shield Advanced provides expanded DDoS attack protection for those resources.']),
      b('Need to filter individual web requests (SQL injection, specific IP addresses, query-string values)? That is AWS WAF, not Shield.', 'waf-what-is',
        ['Based on criteria that you specify, such as the IP addresses that requests originate from or the values of query strings']),
    ],
    trap: b('Shield protects against DDoS attacks at the network, transport and application layers; WAF inspects HTTP(S) requests. "Block SQL injection" is a WAF answer, even though both products sit in the same documentation set.', ['shield-overview', 'waf-sqli'],
      ['shield-overview|provide protections against Distributed Denial of Service (DDoS) attacks for AWS resources at the network and transport layers (layer 3 and 4) and the application layer (layer 7).', 'waf-sqli|An SQL injection rule statement inspects for malicious SQL code.']),
  },
  {
    id: 'secrets-manager-vs-parameter-store',
    title: 'AWS Secrets Manager vs Systems Manager Parameter Store',
    required: true,
    home: 'wardens-lodge',
    items: [
      {
        name: 'AWS Secrets Manager',
        points: [
          b('Helps you manage, retrieve and rotate database credentials, application credentials, OAuth tokens, API keys and other secrets throughout their lifecycles.', 'secrets-intro',
            ['AWS Secrets Manager helps you manage, retrieve, and rotate database credentials, application credentials, OAuth tokens, API keys, and other secrets throughout their lifecycles.']),
          b('Supports an automatic rotation schedule, and replaces hard-coded credentials with a runtime call to retrieve them.', 'secrets-intro',
            ['With Secrets Manager, you can configure an automatic rotation schedule for your secrets.', 'You replace hard-coded credentials with a runtime call to the Secrets Manager service to retrieve credentials dynamically when you need them.']),
        ],
      },
      {
        name: 'Parameter Store (Systems Manager)',
        points: [
          b('A centralized store for configuration data held as named values called parameters.', 'ssm-parameter-store', ['Parameter Store is a centralized configuration data store for named values called parameters.']),
          b('Parameter types include String (plain text), StringList and SecureString, which is for configuration values that require encryption.', 'ssm-parameter-store',
            ['String Use this type for plain text values, such as environment names, endpoint URLs, or resource identifiers.', 'SecureString Use SecureString for configuration values that require encryption, such as service endpoints and account identifiers.']),
          b('For secrets such as database credentials, API keys or tokens, AWS itself recommends Secrets Manager, which provides purpose-built security controls including automatic rotation.', 'ssm-parameter-store',
            ['For secrets such as database credentials, API keys, or tokens, we recommend AWS Secrets Manager, which provides purpose built security controls including automatic rotation and cross-region replication.']),
        ],
      },
    ],
    choose: [
      b('Credentials that must rotate automatically (a database password, an API key)? Secrets Manager.', 'secrets-rotation', ['In Secrets Manager, you can set up automatic rotation for your secrets.']),
      b('General configuration values (an endpoint URL, a feature flag, an environment name)? Parameter Store, using SecureString when the value needs encryption.', 'ssm-parameter-store',
        ['With Parameter Store, you can securely store, organize, and retrieve configuration data at scale.']),
    ],
    trap: b('Both can hold encrypted values, so "store a secret securely" does not decide it. The deciding words are rotation and lifecycle management of credentials: that points to Secrets Manager.', ['ssm-parameter-store', 'secrets-intro'],
      ['ssm-parameter-store|If you manage credentials such as usernames, passwords, or any other secrets, we recommend using AWS Secrets Manager.', 'secrets-intro|With Secrets Manager, you can configure an automatic rotation schedule for your secrets.']),
  },
  {
    id: 'sg-vs-nacl',
    title: 'Security groups vs network ACLs',
    required: true,
    home: 'gatehouse',
    items: [
      {
        name: 'Security group',
        points: [
          b('Controls the traffic allowed to reach and leave the resources it is associated with, such as an EC2 instance.', 'vpc-security-groups',
            ['A security group controls the traffic that is allowed to reach and leave the resources that it is associated with.']),
          b('Stateful.', 'vpc-security-groups', ['Security groups are stateful.']),
          b('Allow rules only: you can specify allow rules, but not deny rules.', 'vpc-sg-rules', ['You can specify allow rules, but not deny rules.']),
          b('A rule can name another security group as its source or destination.', 'vpc-sg-rules',
            ['When you specify a security group as the source or destination for a rule, the rule affects all instances that are associated with the security groups.']),
        ],
      },
      {
        name: 'Network ACL',
        points: [
          b('Allows or denies specific inbound or outbound traffic at the subnet level.', 'vpc-nacls',
            ['A network access control list (ACL) allows or denies specific inbound or outbound traffic at the subnet level.']),
          b('Stateless: information about previously sent or received traffic is not saved, so responses to allowed inbound traffic are not automatically allowed.', 'vpc-nacls',
            ['NACLs are stateless, which means that information about previously sent or received traffic is not saved.',
             'If, for example, you create a NACL rule to allow specific inbound traffic to a subnet, responses to that traffic are not automatically allowed.']),
          b('Rules are numbered (1 to 32766) and evaluated in order from the lowest number; the first matching rule applies.', 'vpc-nacls',
            ['Each rule has a number from 1 to 32766.', 'We evaluate the rules in order, starting with the lowest numbered rule, when deciding whether allow or deny traffic.',
             'If the traffic matches a rule, the rule is applied and we do not evaluate any additional rules.']),
          b('A subnet can be associated with only one network ACL at a time.', 'vpc-nacls', ['However, a subnet can be associated with only one network ACL at a time.']),
        ],
      },
    ],
    choose: [
      b('Need to explicitly block an IP address or range? Only a network ACL can deny, because security groups have allow rules only.', 'vpc-sg-rules',
        ['You can specify allow rules, but not deny rules.']),
      b('Need per-instance control that follows return traffic automatically, or a rule that refers to another group? Use security groups.', 'vpc-security-groups',
        ['Security groups are stateful.']),
      b('Use both for defence in depth: the network ACL is an additional layer at the subnet edge, and the security group is the per-resource layer.', 'vpc-nacls',
        ['Custom network ACLs add an additional layer of security to your VPC.']),
    ],
    trap: b('A default network ACL allows all traffic in and out, so "block traffic" scenarios need a custom network ACL with a deny rule. And because NACLs are stateless, an inbound allow does not allow the reply.',
      ['vpc-default-nacl', 'vpc-nacls'],
      ['vpc-default-nacl|A default network ACL is configured to allow all traffic to flow in and out of the subnets with which it is associated.',
       'vpc-nacls|responses to that traffic are not automatically allowed.']),
  },
  {
    id: 'iam-roles-vs-resource-policies',
    title: 'IAM roles vs resource-based policies (cross-account access)',
    required: true,
    home: 'embassy-row',
    items: [
      {
        name: 'IAM role',
        points: [
          b('An identity in your account with specific permissions and no long-term credentials. Assuming it gives temporary security credentials for the role session.',
            'iam-roles', ['a role does not have standard long-term credentials such as a password or access keys associated with it.', 'when you assume a role, it provides you with temporary security credentials for your role session.']),
          b('Use a role as a proxy when you need to reach resources in another account that do not support resource-based policies.',
            'iam-cross-account', ['Use a role as a proxy when you want to access resources in another account that do not support resource-based policies.']),
          b('The role\'s trust policy names who may assume it, using the Principal element.',
            'iam-el-principal', ['In IAM roles, use the Principal element in the role trust policy to specify who can assume the role.']),
        ],
      },
      {
        name: 'Resource-based policy',
        points: [
          b('A policy attached to the resource itself. Unlike an identity-based policy, it specifies who (which principal) can access that resource.',
            ['iam-identity-vs-resource', 'iam-cross-account'],
            ['iam-identity-vs-resource|Resource-based policies are attached to a resource.',
             'iam-cross-account|a resource-based policy specifies who (which principal) can access that resource.']),
          b('When a principal in another account uses a resource-based policy, the principal keeps working in its own account and does not have to give up its permissions to use the resource.',
            'iam-cross-account', ['the principal still works in the trusted account and does not have to give up their permissions to receive the role permissions.']),
          b('Examples of resources that take them include S3 buckets, SQS queues, VPC endpoints, KMS keys and DynamoDB tables.',
            'iam-identity-vs-resource', ['you can attach resource-based policies to Amazon S3 buckets, Amazon SQS queues, VPC endpoints, AWS Key Management Service encryption keys, Amazon DynamoDB tables and streams']),
        ],
      },
    ],
    choose: [
      b('Choose a resource-based policy when the resource supports one and the caller should keep acting from its own account (for example, reading from a shared bucket while still using its own resources).',
        'iam-cross-account', ['In other words, the principal continues to have access to resources in the trusted account while having access to the resource in the trusting account.']),
      b('Choose a role when the target resource has no resource-based policy, or when you want callers to take on a defined set of permissions for a session.',
        'iam-cross-account', ['Use a role as a proxy when you want to access resources in another account that do not support resource-based policies.']),
    ],
    trap: b('A resource-based policy needs a Principal, and an identity-based policy cannot have one. A user group cannot be a principal at all, because groups relate to permissions, not authentication.',
      'iam-el-principal', ['You cannot use the Principal element in an identity-based policy.', 'You cannot identify a user group as a principal in a policy']),
  },
  {
    id: 'scp-boundary-identity',
    title: 'SCPs vs permission boundaries vs identity-based policies',
    required: true,
    home: 'embassy-row',
    items: [
      {
        name: 'Service control policy (SCP)',
        points: [
          b('Offers central control over the maximum available permissions for the IAM users and roles in your organization.', 'orgs-scps',
            ['SCPs offer central control over the maximum available permissions for the IAM users and IAM roles in your organization.']),
          b('Does not grant permissions on its own.', 'orgs-scps', ['SCPs do not grant permissions to the IAM users and IAM roles in your organization.']),
          b('Has no effect on users or roles in the management account, and is available only in an organization with all features enabled.', 'orgs-scps',
            ['They have no effect on users or roles in the management account.', 'SCPs are available only in an organization that has all features enabled.']),
        ],
      },
      {
        name: 'Permissions boundary',
        points: [
          b('Uses a managed policy to set the maximum permissions that an identity-based policy can grant to an IAM entity.', 'iam-boundaries',
            ['A permissions boundary is an advanced feature for using a managed policy to set the maximum permissions that an identity-based policy can grant to an IAM entity.']),
          b('An entity can perform only the actions allowed by both its identity-based policies and its boundary.', 'iam-boundaries',
            ['An entity\'s permissions boundary allows it to perform only the actions that are allowed by both its identity-based policies and its permissions boundaries.']),
        ],
      },
      {
        name: 'Identity-based policy',
        points: [
          b('Attached to an IAM user, group or role, and grants permissions to that identity. It can be managed or inline.', 'iam-identity-vs-resource',
            ['Identity-based policies are attached to an IAM user, group, or role.', 'Identity-based policies can be managed or inline.']),
          b('Effective permissions are the intersection of what the identity policy allows and what any boundary or SCP allows; an explicit deny overrides an allow.',
            ['iam-boundaries', 'iam-eval-logic'],
            ['iam-boundaries|The effective permissions are the intersection of both policy types.', 'iam-eval-logic|An explicit deny in either of these policies overrides the allow.']),
        ],
      },
    ],
    choose: [
      b('Need a guardrail across many accounts, such as "no account in this OU may do X"? Use an SCP attached to the organization root, an OU or an account.', 'orgs-scps',
        ['SCPs offer central control over the maximum available permissions for the IAM users and IAM roles in your organization.']),
      b('Need to let developers create roles without letting them create something more powerful than themselves? Use a permissions boundary on the roles they create.', 'iam-boundaries',
        ['set the maximum permissions that an identity-based policy can grant to an IAM entity.']),
      b('Need to actually give an identity permission to do something? That is an identity-based (or resource-based) policy. Nothing else grants.', 'iam-policies',
        ['Identity-based policies grant permissions to an identity.']),
    ],
    trap: b('Neither an SCP nor a permissions boundary grants permissions; each only limits what other policies can grant. Seeing "allowed by the SCP" in an answer is not enough if no identity-based policy allows the action.',
      ['orgs-scps', 'iam-boundaries'],
      ['orgs-scps|SCPs do not grant permissions to the IAM users and IAM roles in your organization.',
       'iam-boundaries|set the maximum permissions that an identity-based policy can grant to an IAM entity.']),
  },
];

export default pairs;
