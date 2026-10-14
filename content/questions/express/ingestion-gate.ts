import type { Question } from '../../../src/content/types.ts';
import { mc, mr } from '../helpers.ts';

const questions: Question[] = [
  mc({
    id: 'ingestion-gate-001',
    building: 'ingestion-gate',
    bullets: ['3.5-K5'],
    d: 1,
    tags: ['trap:gateway-vs-interface-endpoints'],
    stem: 'Producers run on Amazon EC2 instances in private subnets that have no route to an internet gateway or NAT device. They must send records to an Amazon Kinesis data stream without the traffic leaving the Amazon network. Which solution BEST meets these requirements?',
    correct: ['Create an interface VPC endpoint for Kinesis Data Streams in the VPC', 'An interface endpoint is powered by AWS PrivateLink and keeps traffic on the Amazon network, with no internet gateway or NAT device needed.'],
    wrong: [
      ['Create a gateway VPC endpoint and add it as a target in the private subnets\' route tables', 'The gateway endpoint is the route table target described for Amazon S3 traffic, not the endpoint type that Kinesis Data Streams uses.'],
      ['Place a NAT gateway in a public subnet and route the private subnets\' traffic to the stream through it', 'This sends the traffic out through an internet gateway, and the instances have no route to one.'],
      ['Assign Elastic IP addresses to the instances and let them reach the stream\'s public endpoint', 'This requires an internet gateway route and sends the traffic over the public internet.'],
    ],
    slot: 0,
    evidence: [
      'kinesis-vpc|You can use an interface VPC endpoint to prevent traffic between your Amazon VPC and Kinesis Data Streams from leaving the Amazon network.',
      'kinesis-vpc|Interface VPC endpoints don\'t require an internet gateway, NAT device, VPN connection, or Direct Connect connection.',
      'vpce-gateway-s3|After you create the gateway endpoint, you can add it as a target in your route table for traffic destined from your VPC to Amazon S3.',
    ],
  }),
  mc({
    id: 'ingestion-gate-002',
    building: 'ingestion-gate',
    bullets: ['3.5-K5'],
    d: 3,
    stem: 'A company reaches an Amazon Kinesis data stream through an interface VPC endpoint. The security team wants the payments stream to be writable only through that endpoint, even if a producer role\'s credentials are used from elsewhere. Which solution BEST meets these requirements?',
    correct: ['Attach an IAM policy to the producer roles that restricts access to occur only through the specified VPC endpoint', 'Policies can use additional fields to restrict access to occur only through a specified VPC endpoint, so credentials used elsewhere are denied.'],
    wrong: [
      ['Add an outbound rule to the producers\' security group that allows HTTPS only to the stream', 'A security group filters by protocol and address, and it cannot name one stream or stop the credentials being used elsewhere.'],
      ['Add a network ACL rule on the producers\' subnet that denies all traffic that is not HTTPS', 'The network ACL applies only to traffic in that subnet, so credentials used from another network are not restricted.'],
      ['Encrypt the stream with an AWS KMS key whose key policy allows only the producer roles', 'The key policy controls use of the key for encryption, not the network path that API calls to the stream arrive through.'],
    ],
    slot: 1,
    evidence: [
      'kinesis-vpc|VPC endpoint policies let you control access by either attaching a policy to a VPC endpoint or by using additional fields in a policy that is attached to an IAM user, group, or role to restrict access to occur only through the specified VPC endpoint.',
      'kinesis-vpc|Use these policies to restrict access to specific streams to a specified VPC endpoint when using them together with the IAM policies to grant only access to Kinesis data stream actions through the specified VPC endpoint.',
    ],
  }),
  mc({
    id: 'ingestion-gate-003',
    building: 'ingestion-gate',
    bullets: ['3.5-K5'],
    d: 2,
    stem: 'Java producers on Amazon EC2 instances send data to an Amazon MSK cluster. The company wants to authenticate each producer with its instance role and to allow or deny Apache Kafka actions with IAM policies, without issuing and rotating client certificates. Which solution meets these requirements with the LEAST operational overhead?',
    correct: ['Enable IAM access control on the MSK cluster and give each producer an IAM role with Kafka permissions', 'IAM can authenticate clients and allow or deny Apache Kafka actions, so no client certificates are issued.'],
    wrong: [
      ['Enable mutual TLS client authentication and issue a client certificate to each producer', 'Mutual TLS needs an AWS Private CA and per-client certificates, which the company does not want to issue and rotate.'],
      ['Enable SASL/SCRAM client authentication and manage the user credentials for each producer', 'SASL/SCRAM authenticates clients with credentials and uses Kafka ACLs, so the actions are not allowed or denied by IAM policies.'],
      ['Leave client authentication off and restrict the brokers to the producers\' security group', 'Producers would not be authenticated, so IAM policies could not allow or deny Kafka actions per role.'],
    ],
    slot: 2,
    evidence: [
      'msk-clientauth|You can use IAM to authenticate clients and to allow or deny Apache Kafka actions.',
      'msk-clientauth|Alternatively, you can use TLS or SASL/SCRAM to authenticate clients, and Apache Kafka ACLs to allow or deny actions.',
      'msk-mtls|To use client authentication, you need an AWS Private CA.',
    ],
  }),
  mr({
    id: 'ingestion-gate-004',
    building: 'ingestion-gate',
    bullets: ['3.5-K5'],
    d: 3,
    stem: 'A company creates an Amazon MSK cluster for payment events. Data must be encrypted at rest with an AWS KMS key that the company specifies, and all client-to-broker communication must be encrypted in transit. Which TWO actions BEST meet these requirements? (Choose two.)',
    correct: [
      ['Specify the AWS KMS key for MSK to use for encryption at rest when creating the cluster', 'MSK integrates with AWS KMS, and you can specify the key to encrypt data at rest when you create the cluster.'],
      ['Set client-broker encryption to allow only TLS encrypted data', 'This setting rejects plaintext communication between clients and brokers, so all of it is encrypted in transit.'],
    ],
    wrong: [
      ['Set client-broker encryption to allow both plaintext and TLS encrypted data', 'Clients could still connect over plaintext, so not all client-to-broker traffic is encrypted.'],
      ['Set client-broker encryption to allow only plaintext data and encrypt the payload in each producer', 'Plaintext communication between clients and brokers is allowed, so the connection is not encrypted in transit.'],
      ['Configure Apache Kafka ACLs so that only the payment producers may write to the topics', 'ACLs allow or deny Kafka actions and do not encrypt the data in transit or at rest.'],
    ],
    slots: [0, 4],
    evidence: [
      'msk-encryption|When you create an MSK cluster, you can specify the AWS KMS key that you want Amazon MSK to use to encrypt your data at rest.',
      'msk-encryption|For communication between clients and brokers, you must specify one of the following three settings: Only allow TLS encrypted data.',
      'msk-encryption|Allow both plaintext, as well as TLS encrypted data.Only allow plaintext data.',
    ],
  }),
  mr({
    id: 'ingestion-gate-005',
    building: 'ingestion-gate',
    bullets: ['3.5-K5', '3.5-S6'],
    d: 2,
    stem: 'A company runs an AWS Transfer Family SFTP server for partners who connect over the internet from known office networks. Partners need fixed server IP addresses for their firewalls, and the company must accept requests only from the partners\' allowed addresses. Which TWO actions meet these requirements? (Choose two.)',
    correct: [
      ['Host the endpoint in a VPC, make it internet-facing, and associate Elastic IP addresses with it', 'An internet-facing VPC endpoint can have Elastic IP addresses, which gives the partners fixed addresses.'],
      ['Attach VPC security groups that allow only the partners\' address ranges', 'VPC security groups control access to authenticated users whose requests originate only from allowed addresses.'],
    ],
    wrong: [
      ['Configure the endpoint for internal access so that it is reachable only by clients using its private IP addresses', 'Internal access makes the endpoint available only through its private IP addresses, so partners on the internet cannot reach it.'],
      ['Place a Network Load Balancer in front of the server to filter the partners\' source addresses', 'AWS advises avoiding Network Load Balancers in front of Transfer Family servers, and they add a component to operate.'],
      ['Leave the endpoint open to all addresses and rely on SFTP credentials alone for access', 'Requests from addresses outside the partners\' networks would still reach the server, which breaks the address restriction.'],
    ],
    slots: [1, 2],
    evidence: [
      'transfer-vpc|In addition, if you choose to make your server\'s endpoint internet-facing, you can associate Elastic IP addresses with your endpoint.',
      'transfer-vpc|You can use VPC security groups to control access to authenticated users whose requests originate only from allowed addresses.',
      'transfer-vpc|For Access, choose Internal to make your endpoint only accessible to clients using the endpoint\'s private IP addresses.',
      'transfer-ftp|For important considerations about Network Load Balancers, see Avoid placing NLBs and NATs in front of AWS Transfer Family servers.',
    ],
  }),
  mc({
    id: 'ingestion-gate-006',
    building: 'ingestion-gate',
    bullets: ['3.5-S6'],
    d: 2,
    stem: 'A mobile game sends event data to Amazon Kinesis Data Streams. Traffic is unpredictable, with sudden launch-day spikes, and the company does not want to estimate or adjust shard counts. Which configuration meets these requirements with the LEAST operational overhead?',
    correct: ['Create the data stream in on-demand capacity mode', 'In on-demand mode, Kinesis Data Streams automatically manages the shards to provide the necessary throughput.'],
    wrong: [
      ['Create the data stream in provisioned mode with a shard count sized for the launch-day peak', 'In provisioned mode you must specify the number of shards, so the company would estimate and adjust them.'],
      ['Create the data stream in provisioned mode with a low shard count and raise it after each spike', 'The company would still specify and change the shard count by hand, which it wants to avoid.'],
      ['Create an Amazon MSK Provisioned cluster and choose the broker count for the expected load', 'MSK Provisioned has the company choose instance types, storage and the number of brokers, which is capacity to estimate.'],
    ],
    slot: 3,
    evidence: [
      'kinesis-concepts|With the on-demand mode, Kinesis Data Streams automatically manages the shards in order to provide the necessary throughput.',
      'kinesis-concepts|With the provisioned mode, you must specify the number of shards for the data stream.',
      'msk-provisioned|With MSK Provisioned, you can choose the instance types, storage volumes (Standard brokers), and number of broker nodes that make up your Kafka clusters.',
    ],
  }),
  mc({
    id: 'ingestion-gate-007',
    building: 'ingestion-gate',
    bullets: ['3.5-S6'],
    d: 1,
    stem: 'An Amazon Data Firehose stream delivers application logs to Amazon S3 and creates a very large number of tiny objects. The company wants fewer, larger objects with the LEAST change to the pipeline. What should the company do?',
    correct: ['Increase the buffer size and buffer interval of the Firehose stream', 'Firehose buffers incoming data to a certain size or for a certain period of time before delivering it, so larger buffers produce larger objects.'],
    wrong: [
      ['Decrease the buffer interval of the Firehose stream to a few seconds', 'A shorter interval delivers data more often, which produces more and smaller objects.'],
      ['Replace Firehose with a Kinesis data stream and a custom consumer that writes to S3', 'The consumer would be new code to build and run, which is more than the LEAST change to the pipeline.'],
      ['Enable Amazon S3 Versioning on the destination bucket so that objects are combined', 'Versioning keeps multiple versions of objects and does not combine objects.'],
    ],
    slot: 0,
    evidence: [
      'firehose|Amazon Data Firehose buffers incoming streaming data to a certain size or for a certain period of time before delivering it to destinations.',
      'firehose|Buffer Size is in MBs and Buffer Interval is in seconds.',
    ],
  }),
  mc({
    id: 'ingestion-gate-008',
    building: 'ingestion-gate',
    bullets: ['3.5-S6'],
    d: 2,
    stem: 'A company is moving existing Apache Kafka producers and consumers to AWS and wants to keep the Kafka APIs. It has no staff to size or scale cluster capacity and wants the service to manage the brokers. Which configuration BEST meets these requirements?',
    correct: ['Amazon MSK Serverless', 'MSK Serverless runs Apache Kafka without having to manage and scale cluster capacity, and MSK manages the broker nodes.'],
    wrong: [
      ['Amazon MSK Provisioned with broker instance types and storage chosen by the team', 'With MSK Provisioned the team chooses instance types, storage and the number of brokers, which is the sizing it has no staff for.'],
      ['Apache Kafka brokers installed on Amazon EC2 instances that the team patches and scales', 'The team would size, patch and scale the brokers itself, which it has no staff to do.'],
      ['Amazon Kinesis Data Streams in provisioned mode with a shard count chosen by the team', 'Kinesis Data Streams does not expose the Apache Kafka APIs, and provisioned mode needs a shard count chosen by the team.'],
    ],
    slot: 1,
    evidence: [
      'msk-what-is|Run Apache Kafka without having to manage and scale cluster capacity with MSK Serverless.',
      'msk-what-is|In MSK Serverless, MSK manages the broker nodes used to handle your traffic and you only provision your Kafka server resources at a cluster level.',
      'msk-provisioned|With MSK Provisioned, you can choose the instance types, storage volumes (Standard brokers), and number of broker nodes that make up your Kafka clusters.',
    ],
  }),
  mc({
    id: 'ingestion-gate-009',
    building: 'ingestion-gate',
    bullets: ['3.5-K5'],
    d: 2,
    tags: ['mock-reserve'],
    stem: 'A healthcare company sends patient events to an Amazon Kinesis data stream. Compliance requires that the data be encrypted at rest inside the stream with AWS KMS keys, and the company wants the LEAST operational overhead. Which solution meets these requirements?',
    correct: ['Enable server-side encryption on the Kinesis data stream and select an AWS KMS key', 'Server-side encryption with AWS KMS keys encrypts the data at rest within Kinesis Data Streams, with no application changes.'],
    wrong: [
      ['Encrypt each record in the producers with a custom library and store the keys in the application', 'This adds code and key handling to every producer, which is more overhead than a built-in server-side option.'],
      ['Enable default encryption on the Amazon S3 bucket that receives the data from the stream', 'This encrypts the objects in S3 after delivery and does not encrypt the data at rest inside the stream.'],
      ['Place the producers in private subnets and use an interface VPC endpoint for the stream', 'The endpoint protects the network path, but it does not encrypt the data at rest within the stream.'],
    ],
    slot: 2,
    evidence: [
      'kinesis-sse|Server-side encryption using AWS Key Management Service (AWS KMS) keys makes it easy for you to meet strict data management requirements by encrypting your data at rest within Amazon Kinesis Data Streams.',
      'kinesis-vpc|You can use an interface VPC endpoint to prevent traffic between your Amazon VPC and Kinesis Data Streams from leaving the Amazon network.',
    ],
  }),
];

export default questions;
