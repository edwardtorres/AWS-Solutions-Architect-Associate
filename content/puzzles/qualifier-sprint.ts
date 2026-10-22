import type { SprintData } from '../../src/puzzles/qualifier-sprint/def';
import type { Scenario } from '../../src/puzzles/types';

type S = Scenario<SprintData>;
const T = 'qualifier-sprint' as const;
const BUILDING = 'town-charter';

const sc = (n: number, difficulty: 1 | 2 | 3, title: string, story: string, data: SprintData): S => ({
  id: `puzzle-qualifier-sprint-${String(n).padStart(3, '0')}`,
  type: T,
  building: BUILDING,
  bullets: [],
  difficulty,
  title,
  story,
  data: { ...data, options: [...ORDER[n]!].map((id) => data.options.find((o) => o.id === id)!) },
});

/** Display order of the options per set (option ids), so the answers do not follow a pattern. */
const ORDER: Record<number, string> = {
  1: 'dbac', 2: 'cdab', 4: 'bdca', 6: 'dacb',
  8: 'ecabd', 9: 'dacb', 10: 'cadb', 11: 'bdac', 12: 'dbeac', 13: 'cdeab', 14: 'bcda',
};

const scenarios: S[] = [
  sc(
    1,
    2,
    'The steady internal API',
    'A ticketing company needs an HTTP API for its internal booking tools. Calls arrive at the same constant rate day and night, and the company will run the API for at least three years. Every design below serves the API correctly; they differ in what they optimise.',
    {
      options: [
        { id: 'a', text: 'Lambda functions behind an API Gateway REST API' },
        { id: 'b', text: 'The same Lambda functions behind API Gateway, with their constant usage covered by a Compute Savings Plan' },
        { id: 'c', text: 'Lambda functions behind an API Gateway private API, called only through an interface VPC endpoint' },
        { id: 'd', text: 'The Lambda and API Gateway stack deployed in two Regions, with Route 53 failover routing and health checks' },
      ],
      answers: { overhead: 'a', cost: 'b', secure: 'c', available: 'd' },
      facts: {
        overhead: {
          text: 'Lambda runs your code with no servers to provision or manage, so nothing needs patching or capacity planning.',
          src: 'lambda-welcome',
          quote: 'With Lambda, you can run code without provisioning or managing servers.',
        },
        cost: {
          text: 'A Compute Savings Plan trades a commitment to a steady amount of compute for rates below On-Demand, and it also covers Lambda usage, so a constant load costs less than the same functions without it.',
          src: 'savings-plans',
          quote: 'This also applies to AWS Fargate and AWS Lambda usage.',
        },
        secure: {
          text: 'A private API can be reached only from inside your VPC, so the API is never exposed to the public internet.',
          src: 'apigw-endpoint-types',
          quote: 'A private API endpoint is an API endpoint that can only be accessed from your Amazon Virtual Private Cloud (VPC) using an interface VPC endpoint, which is an endpoint network interface (ENI) that you create in your VPC.',
        },
        available: {
          text: 'A hot standby active/passive strategy can run the workload in multiple Regions, which lets a standby Region take over if the primary Region fails.',
          src: 'dr-options',
          quote: 'You can run your workload simultaneously in multiple Regions as part of a multi-site active/active or hot standby active/passive strategy.',
        },
      },
    },
  ),
  sc(
    2,
    1,
    'Transcoding uploaded videos',
    'A photo-sharing app creates one job for every uploaded video. Each job runs for several hours, far longer than a Lambda function may run, and can safely be retried if it is lost. Each design below runs the jobs.',
    {
      options: [
        { id: 'a', text: 'Worker instances pulling jobs from an SQS queue, in an On-Demand Auto Scaling group across three Availability Zones' },
        { id: 'b', text: 'An AWS Batch job queue with a managed compute environment in one subnet' },
        { id: 'c', text: 'Worker instances pulling jobs from an SQS queue, in private subnets that reach it through an interface VPC endpoint' },
        { id: 'd', text: 'Worker instances pulling jobs from an SQS queue, in an Auto Scaling group that uses Spot Instances' },
      ],
      answers: { overhead: 'b', cost: 'd', secure: 'c', available: 'a' },
      facts: {
        overhead: {
          text: 'Batch automatically provisions compute resources for the submitted jobs, so the team has no worker fleet to provision.',
          src: 'batch-what-is',
          quote: 'AWS Batch automatically provisions compute resources and optimizes the workload distribution based on the quantity and scale of the workloads.',
        },
        cost: {
          text: 'Spot Instances suit work that can be interrupted and retried, and a retryable job is exactly that.',
          src: 'ec2-spot',
          quote: 'Spot Instances are a cost-effective choice if you can be flexible about when your applications run and if your applications can be interrupted.',
        },
        secure: {
          text: 'An interface endpoint lets private subnets talk to the queue with no internet gateway, NAT device or public IP address.',
          src: 'privatelink-what-is',
          quote: 'You do not need to use an internet gateway, NAT device, public IP address, Direct Connect connection, or AWS Site-to-Site VPN connection to allow communication with the service or resource from your private subnets.',
        },
        available: {
          text: 'An Auto Scaling group that spans several Availability Zones replaces capacity elsewhere if one zone becomes unavailable.',
          src: 'asg-benefits',
          quote: 'If one Availability Zone becomes unavailable, Amazon EC2 Auto Scaling can launch instances in another one to compensate.',
        },
      },
    },
  ),
  sc(
    4,
    2,
    'A key-value session store',
    'A mobile game keeps player sessions in a key-value store that the backend reads and writes by key, and finished sessions pile up if nobody removes them. Every design below works for that access pattern.',
    {
      options: [
        { id: 'a', text: 'A DynamoDB table in provisioned mode whose throughput the team sets and reviews each month, with Time to Live to delete finished sessions' },
        { id: 'b', text: 'A DynamoDB global table that replicates to a second Region' },
        { id: 'c', text: 'A DynamoDB table in on-demand mode' },
        { id: 'd', text: 'A DynamoDB table reached from private subnets through a gateway VPC endpoint' },
      ],
      answers: { overhead: 'c', cost: 'a', secure: 'd', available: 'b' },
      facts: {
        overhead: {
          text: 'On-demand mode removes capacity planning and monitoring, so the team has no throughput numbers to manage.',
          src: 'dynamodb-ondemand',
          quote: 'On-demand simplifies the setup process, eliminates capacity management and monitoring, and provides fast, automatic scaling.',
        },
        cost: {
          text: 'Time to Live is the documented cost-effective way to remove items that are no longer relevant, such as finished sessions, and it deletes them without consuming write throughput.',
          src: 'dynamodb-ttl',
          quote: 'Time To Live (TTL) for DynamoDB is a cost-effective method for deleting items that are no longer relevant.',
        },
        secure: {
          text: 'A gateway endpoint lets the VPC reach DynamoDB with no internet gateway or NAT device, so session traffic never needs a public path.',
          src: 'vpce-gateway-ddb',
          quote: 'With a gateway endpoint, you can access DynamoDB from your VPC, without requiring an internet gateway or NAT device for your VPC, and with no additional cost.',
        },
        available: {
          text: 'A global table is a multi-Region, multi-active table, so the game keeps working if a whole Region is lost.',
          src: 'ddb-global-tables',
          quote: 'Global tables are ideal for applications requiring business continuity and high availability through multi-Region deployment.',
        },
      },
    },
  ),
  sc(
    6,
    3,
    'KMS keys for a bucket of reports',
    'A bank stores reports in S3 and its policy requires AWS KMS keys for server-side encryption. Millions of objects are read every day. Every design below encrypts the objects with KMS.',
    {
      options: [
        { id: 'a', text: 'SSE-KMS with a customer managed key whose key policy lists only the roles that need it' },
        { id: 'b', text: 'SSE-KMS with a customer managed key and S3 Bucket Keys turned on' },
        { id: 'c', text: 'SSE-KMS with the default AWS managed key' },
        { id: 'd', text: 'SSE-KMS with a multi-Region key and replication to a bucket in a second Region' },
      ],
      answers: { overhead: 'c', cost: 'b', secure: 'a', available: 'd' },
      facts: {
        overhead: {
          text: 'If no customer managed key is specified, S3 creates the AWS managed key itself, so nobody has to create the key.',
          src: 's3-sse-kms',
          quote: 'If you don\'t specify a customer managed key, Amazon S3 automatically creates an AWS managed key in your AWS account the first time that you add an object encrypted with SSE-KMS to a bucket.',
        },
        cost: {
          text: 'Bucket Keys cut the traffic from S3 to KMS, which is where the cost of reading many SSE-KMS objects comes from.',
          src: 's3-bucket-keys',
          quote: 'This reduces traffic from S3 to AWS KMS, allowing you to access AWS KMS-encrypted objects in Amazon S3 at a fraction of the previous cost.',
        },
        secure: {
          text: 'Restricting a customer managed key\'s policy to only the principals that need it applies least privilege to the key.',
          src: 's3-sse-kms',
          quote: 'Always restrict customer-managed KMS key policy permissions only to the IAM principals and AWS services that must access the relevant AWS KMS key action.',
        },
        available: {
          text: 'Related multi-Region keys let data encrypted in one Region be decrypted in another Region without a cross-Region call to KMS.',
          src: 'kms-multi-region',
          quote: 'Each set of related multi-Region keys has the same key material and key ID, so you can encrypt data in one AWS Region and decrypt it in a different AWS Region without re-encrypting or making a cross-Region call to AWS KMS.',
        },
      },
    },
  ),
  sc(
    8,
    1,
    'Shared files for web servers',
    'A group of Linux web servers must read and write the same set of uploaded files at the same time. Every design below gives all the servers one shared file system.',
    {
      options: [
        { id: 'a', text: 'An EFS file system with a lifecycle policy that moves idle files to Infrequent Access' },
        { id: 'b', text: 'An EFS file system with encryption at rest and in transit' },
        { id: 'c', text: 'An EFS file system with replication to a second Region' },
        { id: 'd', text: 'An EFS file system with default settings' },
        { id: 'e', text: 'An NFS server that your team runs on one EC2 instance' },
      ],
      answers: { overhead: 'd', cost: 'a', secure: 'b', available: 'c' },
      facts: {
        overhead: {
          text: 'EFS is serverless and elastic, so there is no storage capacity or performance to provision or manage.',
          src: 'efs-what-is',
          quote: 'provides serverless, fully elastic file storage so that you can share file data without provisioning or managing storage capacity and performance.',
        },
        cost: {
          text: 'Lifecycle management moves files that are not being used to a lower-cost class, so storage cost follows use.',
          src: 'efs-lifecycle',
          quote: 'You can manage your file systems so that they have cost-effective storage throughout their lifecycle.',
        },
        secure: {
          text: 'EFS can protect the data both while stored and while moving between servers and the file system.',
          src: 'efs-encryption',
          quote: 'Amazon EFS provides comprehensive encryption capabilities to protect your data both at rest and in transit.',
        },
        available: {
          text: 'A replica file system in another Region can take over in a disaster.',
          src: 'efs-replication',
          quote: 'In the event of a disaster or when performing game day exercises, you can fail over to your replica file system.',
        },
      },
    },
  ),
  sc(
    9,
    2,
    'A nightly risk simulation',
    'A bank runs a risk simulation on EC2 every night. The job saves its progress and restarts cleanly if an instance disappears. Starting on time is preferred, but if capacity is short the run may slip to the next night. The regulator prefers that no other customer\'s instances share the hardware. Every design below runs the job.',
    {
      options: [
        { id: 'a', text: 'On-Demand Instances launched when the job starts' },
        { id: 'b', text: 'Spot Instances launched when the job starts' },
        { id: 'c', text: 'Dedicated Instances launched when the job starts' },
        { id: 'd', text: 'On-Demand Instances that fill a Capacity Reservation made for the job\'s start time' },
      ],
      answers: { overhead: 'a', cost: 'b', secure: 'c', available: 'd' },
      facts: {
        overhead: {
          text: 'On-Demand Instances need no commitment, no reservation to create and no interruption to handle: you launch them when needed and keep full control.',
          src: 'ec2-on-demand',
          quote: 'With On-Demand Instances, you pay for compute capacity by the second with no long-term commitments.',
        },
        cost: {
          text: 'The job restarts cleanly, so it can accept interruption, which is the condition under which Spot Instances are cost-effective.',
          src: 'ec2-spot',
          quote: 'Spot Instances are a cost-effective choice if you can be flexible about when your applications run and if your applications can be interrupted.',
        },
        secure: {
          text: 'Dedicated Instances run on hardware used by one account, physically isolated from other accounts\' instances.',
          src: 'ec2-dedicated-instances',
          quote: 'This means that Dedicated Instances are physically isolated at the host hardware level from instances that belong to other AWS accounts, even if those accounts are linked to a single payer account.',
        },
        available: {
          text: 'A Capacity Reservation holds capacity for a future date, so the instances are there at the scheduled start even on a busy night, which none of the other designs guarantee.',
          src: 'ec2-capacity-reservations',
          quote: 'You can request a Capacity Reservation for immediate use or you can request a Capacity Reservation for a future date.',
        },
      },
    },
  ),
  sc(
    10,
    2,
    'Seven years of log files',
    'A retailer keeps application log files in S3. They are rarely read after the first weeks, and the company must keep them for years. Every design below stores the logs durably.',
    {
      options: [
        { id: 'a', text: 'S3 Intelligent-Tiering for the whole bucket' },
        { id: 'b', text: 'A bucket with Object Lock in compliance mode' },
        { id: 'c', text: 'A bucket with replication to a bucket in another Region' },
        { id: 'd', text: 'A lifecycle rule that moves logs to a Glacier storage class' },
      ],
      answers: { overhead: 'a', cost: 'd', secure: 'b', available: 'c' },
      facts: {
        overhead: {
          text: 'Intelligent-Tiering moves each object between tiers automatically, with no rules or operational work.',
          src: 's3-storage-classes',
          quote: 'S3 Intelligent-Tiering (INTELLIGENT_TIERING) is an Amazon S3 storage class that\'s designed to optimize storage costs by automatically moving data to the most cost-effective access tier, without performance impact or operational overhead.',
        },
        cost: {
          text: 'The Glacier classes keep the same durability as S3 Standard at lower storage costs, which suits rarely read logs.',
          src: 's3-glacier-classes',
          quote: 'Each of these storage classes offer the same durability and resiliency as the S3 Standard storage class, but at lower storage costs.',
        },
        secure: {
          text: 'In compliance mode, nobody, including the root user, can overwrite or delete a protected log version.',
          src: 's3-object-lock',
          quote: 'In compliance mode, a protected object version can\'t be overwritten or deleted by any user, including the root user in your AWS account.',
        },
        available: {
          text: 'Replication can place copies in a bucket in a different Region, so the logs survive the loss of the source Region.',
          src: 's3-replication',
          quote: 'The destination buckets can be in different AWS Regions or within the same Region as the source bucket.',
        },
      },
    },
  ),
  sc(
    11,
    3,
    'A stateless container service',
    'A logistics company runs a stateless web service as containers on Amazon ECS. Any task can be replaced at any time. Every design below runs the containers behind a load balancer.',
    {
      options: [
        { id: 'a', text: 'ECS tasks in one subnet on EC2 instances bought as Spot Instances' },
        { id: 'b', text: 'ECS on Fargate with tasks spread over subnets in three Availability Zones' },
        { id: 'c', text: 'ECS on Fargate in one subnet, where each task has its own IAM task role with only the permissions it needs' },
        { id: 'd', text: 'ECS on Fargate in one subnet with the default setup' },
      ],
      answers: { overhead: 'd', cost: 'a', secure: 'c', available: 'b' },
      facts: {
        overhead: {
          text: 'Fargate removes the cluster of virtual machines, so there are no servers to provision, configure or scale.',
          src: 'fargate-ecs',
          quote: 'With AWS Fargate, you no longer have to provision, configure, or scale clusters of virtual machines to run containers.',
        },
        cost: {
          text: 'Spot Instances are a cost-effective choice if the applications can be interrupted, and these tasks can be replaced at any time.',
          src: 'ec2-spot',
          quote: 'Spot Instances are a cost-effective choice if you can be flexible about when your applications run and if your applications can be interrupted.',
        },
        secure: {
          text: 'A separate role per task definition with only the permissions its tasks need limits what a compromised container can reach.',
          src: 'ecs-task-role',
          quote: 'If you have multiple task definitions or services that require IAM permissions, you should consider creating a role for each specific task definition or service with the minimum required permissions for the tasks to operate so that you can minimize the access that you provide for each task.',
        },
        available: {
          text: 'Zones do not share generators, cooling or power substations, so tasks spread over three zones keep serving when one zone has a failure that the one-subnet designs cannot survive.',
          src: 'fault-isolation-az',
          quote: 'Common points of failure, like generators and cooling equipment, are not shared across Availability Zones and are designed to be supplied by different power substations.',
        },
      },
    },
  ),
  sc(
    12,
    2,
    'A file share for Windows teams',
    'A design studio moves a Windows file share to AWS. The share holds home directories and departmental shares, and users open it with SMB from Windows machines joined to Active Directory. Every design below provides the share.',
    {
      options: [
        { id: 'a', text: 'FSx for Windows File Server, Multi-AZ deployment' },
        { id: 'b', text: 'FSx for Windows File Server on HDD storage, with storage and throughput sized to what is needed' },
        { id: 'c', text: 'FSx for Windows File Server joined to the company\'s Active Directory, encrypted with a KMS key you manage, with API activity recorded in CloudTrail' },
        { id: 'd', text: 'FSx for Windows File Server, Single-AZ deployment with default settings' },
        { id: 'e', text: 'A Windows Server on EC2 that your team installs, patches and backs up' },
      ],
      answers: { overhead: 'd', cost: 'b', secure: 'c', available: 'a' },
      facts: {
        overhead: {
          text: 'FSx for Windows File Server is fully managed, so there are no file servers and storage volumes to set up and provision.',
          src: 'fsx-windows',
          quote: 'As a fully managed service, FSx for Windows File Server eliminates the administrative overhead of setting up and provisioning file servers and storage volumes.',
        },
        cost: {
          text: 'HDD storage is the type FSx designs for home directories and departmental shares, the workload here, so the team does not buy SSD performance it does not need.',
          src: 'fsx-windows',
          quote: 'HDD storage is designed for a broad spectrum of workloads, including home directories, user and departmental shares, and content management systems.',
        },
        secure: {
          text: 'FSx encrypts data at rest with keys that you manage in AWS KMS, and design c is the only one that names such a key and a CloudTrail record of API activity.',
          src: 'fsx-windows',
          quote: 'It automatically encrypts data at rest (for both file systems and backups) using keys that you manage in AWS Key Management Service (AWS KMS).',
        },
        available: {
          text: 'A Multi-AZ file system keeps a standby file server in another zone and fails over to it.',
          src: 'fsx-windows',
          quote: 'In addition, Multi-AZ file systems provide high availability and failover support across multiple Availability Zones by provisioning and maintaining a standby file server in a separate Availability Zone within an AWS Region.',
        },
      },
    },
  ),
  sc(
    13,
    2,
    'A brochure site',
    'A bakery publishes a static brochure site. Traffic is low and nearly all visitors live in the same country as the AWS Region. Every design below serves the pages.',
    {
      options: [
        { id: 'a', text: 'An S3 bucket with static website hosting turned on' },
        { id: 'b', text: 'An S3 bucket behind a CloudFront distribution that allows both HTTP and HTTPS' },
        { id: 'c', text: 'An S3 bucket behind a CloudFront distribution that requires HTTPS from viewers' },
        { id: 'd', text: 'A CloudFront distribution with default settings and an origin group of two buckets in different Regions' },
        { id: 'e', text: 'A web server on one EC2 instance' },
      ],
      answers: { overhead: 'a', cost: 'a', secure: 'c', available: 'd' },
      facts: {
        overhead: {
          text: 'S3 can host a static website by itself, so design a needs no web server (design e) and no CloudFront distribution (designs b, c and d).',
          src: 's3-website',
          quote: 'You can use Amazon S3 to host a static website.',
        },
        cost: {
          text: 'CloudFront adds its own charges for data transfers out and for HTTP or HTTPS requests, and the S3-only design has no CloudFront charge.',
          src: 'cloudfront-what-is',
          quote: 'CloudFront charges for data transfers out from its edge locations, along with HTTP or HTTPS requests.',
        },
        secure: {
          text: 'S3 website endpoints do not support HTTPS at all, so design a cannot encrypt viewer traffic, while design c requires HTTPS from viewers through CloudFront.',
          src: 's3-website-endpoints',
          quote: 'Amazon S3 website endpoints do not support HTTPS or access points.',
        },
        available: {
          text: 'An origin group switches to the secondary origin when the primary origin is unavailable, so design d can keep serving from its second bucket.',
          src: 'cf-origin-failover',
          quote: 'If the primary origin is unavailable, or returns specific HTTP response status codes that indicate a failure, CloudFront automatically switches to the secondary origin.',
        },
      },
    },
  ),
  sc(
    14,
    2,
    'A public REST API on Lambda',
    'A weather start-up serves a public REST API from Lambda behind API Gateway. Many callers ask for the same forecasts again and again. Every design below serves the API.',
    {
      options: [
        { id: 'a', text: 'API Gateway REST API with stage caching turned on' },
        { id: 'b', text: 'The API deployed in two Regions, with Route 53 health checks and failover routing' },
        { id: 'c', text: 'API Gateway REST API with an Amazon Cognito user pool as the authorizer' },
        { id: 'd', text: 'API Gateway REST API with Lambda functions and default settings' },
      ],
      answers: { overhead: 'd', cost: 'a', secure: 'c', available: 'b' },
      facts: {
        overhead: {
          text: 'API Gateway is part of the AWS serverless infrastructure with Lambda, and the default-settings design adds no caching, second Region or authorizer to set up.',
          src: 'apigw-welcome',
          quote: 'Together with AWS Lambda, API Gateway forms the app-facing part of the AWS serverless infrastructure.',
        },
        cost: {
          text: 'Caching answers repeated requests without calling the backend again, which lowers the number of backend calls.',
          src: 'apigw-caching',
          quote: 'With caching, you can reduce the number of calls made to your endpoint and also improve the latency of requests to your API.',
        },
        secure: {
          text: 'A Cognito user pool authorizer controls who can call the API, so anonymous callers are turned away.',
          src: 'apigw-cognito-authorizer',
          quote: 'you can use an Amazon Cognito user pool to control who can access your API in Amazon API Gateway.',
        },
        available: {
          text: 'Route 53 health checking can run active-passive failover, sending users to the second Region if the first fails.',
          src: 'route53-failover-types',
          quote: 'You can use Route 53 health checking to configure active-active and active-passive failover configurations.',
        },
      },
    },
  ),
];

export default scenarios;
