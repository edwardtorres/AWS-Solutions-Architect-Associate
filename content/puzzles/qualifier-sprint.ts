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
  1: 'dbac', 2: 'cdab', 3: 'edbac', 4: 'bdca', 5: 'cbeda', 6: 'dacb', 7: 'bdac',
  8: 'ecabd', 9: 'dacbe', 10: 'cadb', 11: 'bdac', 12: 'dbeac', 13: 'cdab', 14: 'bcda',
};

const scenarios: S[] = [
  sc(
    1,
    2,
    'The steady internal API',
    'A ticketing company needs an HTTP API for its internal booking tools. Calls arrive all day at a steady, forecastable rate. Every design below serves the API correctly; they differ in what they optimise.',
    {
      options: [
        { id: 'a', text: 'Lambda functions behind an API Gateway REST API' },
        { id: 'b', text: 'EC2 instances in an Auto Scaling group, with the steady usage covered by a Compute Savings Plan' },
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
          text: 'A Savings Plan lowers the cost of usage that is committed to at a steady rate, which fits an always-on, forecastable load.',
          src: 'savings-plans',
          quote: 'Savings Plans provide savings beyond On-Demand rates in exchange for a commitment of using a specified amount of compute power (measured per hour) for a one or three year period.',
        },
        secure: {
          text: 'A private API can be reached only from inside your VPC, so the API is never exposed to the public internet.',
          src: 'apigw-endpoint-types',
          quote: 'A private API endpoint is an API endpoint that can only be accessed from your Amazon Virtual Private Cloud (VPC) using an interface VPC endpoint, which is an endpoint network interface (ENI) that you create in your VPC.',
        },
        available: {
          text: 'Active-passive failover keeps a second copy of the whole stack on standby and sends users there when every primary resource is unavailable, which survives the loss of a Region.',
          src: 'route53-failover-types',
          quote: 'Use an active-passive failover configuration when you want a primary resource or group of resources to be available the majority of the time and you want a secondary resource or group of resources to be on standby in case all the primary resources become unavailable.',
        },
      },
    },
  ),
  sc(
    2,
    1,
    'Resizing uploaded photos',
    'A photo-sharing app puts one message on a queue for every uploaded picture. Workers resize the picture and can safely retry if a job is lost. Each design below reads the queue and finishes the job.',
    {
      options: [
        { id: 'a', text: 'Worker instances in an Auto Scaling group across three Availability Zones, On-Demand' },
        { id: 'b', text: 'A Lambda function that is triggered by the queue' },
        { id: 'c', text: 'Worker instances in private subnets that reach the queue through an interface VPC endpoint' },
        { id: 'd', text: 'Worker instances in an Auto Scaling group using Spot Instances' },
      ],
      answers: { overhead: 'b', cost: 'd', secure: 'c', available: 'a' },
      facts: {
        overhead: {
          text: 'With Lambda reading the queue, Lambda itself adds and removes pollers as the message volume changes, so there is no fleet to size.',
          src: 'lambda-sqs-scaling',
          quote: 'By default, Lambda automatically scales event pollers based on message volume.',
        },
        cost: {
          text: 'Spot Instances suit work that can be interrupted and retried, and a retryable queue job is exactly that.',
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
    3,
    2,
    'The orders database',
    'A small online shop needs a MySQL-compatible relational database for its orders. Traffic is spiky, and the team does not want to choose or resize instance sizes. Every design below stores the orders correctly; read the qualifier to see which one fits.',
    {
      options: [
        { id: 'a', text: 'RDS for MySQL, Multi-AZ DB instance deployment' },
        { id: 'b', text: 'An Aurora Serverless v2 DB cluster' },
        { id: 'c', text: 'RDS for MySQL, single instance, with a reserved DB instance for its steady use' },
        { id: 'd', text: 'RDS for MySQL, single instance, in private subnets with storage encrypted using a KMS key' },
        { id: 'e', text: 'MySQL installed on an EC2 instance that your team patches and backs up' },
      ],
      answers: { overhead: 'b', cost: 'c', secure: 'd', available: 'a' },
      facts: {
        overhead: {
          text: 'Aurora Serverless watches the workload and adjusts capacity for you, which removes sizing work that other options leave to the team.',
          src: 'aurora-serverless',
          quote: 'Aurora serverless helps to automate the processes of monitoring the workload and adjusting the capacity for your databases.',
        },
        cost: {
          text: 'Reserving a DB instance for steady use gives a billing discount compared with on-demand instance pricing.',
          src: 'rds-reserved',
          quote: 'Reserved DB instances provide you with a significant discount compared to on-demand DB instance pricing.',
        },
        secure: {
          text: 'An encrypted DB instance protects its storage, logs, backups, replicas and snapshots at rest.',
          src: 'rds-encryption',
          quote: 'Data that is encrypted at rest includes the underlying storage for DB instances, its logs, automated backups, read replicas, and snapshots.',
        },
        available: {
          text: 'A Multi-AZ DB instance deployment keeps a standby in another zone that takes over if the primary fails.',
          src: 'rds-multi-az',
          quote: 'A Multi-AZ DB instance deployment has one standby DB instance that provides failover support, but doesn\'t serve read traffic.',
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
        { id: 'a', text: 'A DynamoDB table with Time to Live turned on, so finished sessions are deleted automatically' },
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
    5,
    2,
    'Server backups that last for years',
    'A clinic backs up the EBS volumes of its servers nightly and must keep the backups for many years. Every design below creates the backups on schedule.',
    {
      options: [
        { id: 'a', text: 'A backup plan that copies each backup to a second Region' },
        { id: 'b', text: 'A cron job on each server that calls the CLI to create snapshots' },
        { id: 'c', text: 'A backup plan that stores backups in a vault protected by Vault Lock' },
        { id: 'd', text: 'A backup plan with a schedule and a retention rule' },
        { id: 'e', text: 'EBS snapshots that are moved to the Snapshots Archive tier' },
      ],
      answers: { overhead: 'd', cost: 'e', secure: 'c', available: 'a' },
      facts: {
        overhead: {
          text: 'The backup service replaces service-by-service backup tasks and the custom scripts that go with them with one policy.',
          src: 'backup-what-is',
          quote: 'It allows you to automate and consolidate backup tasks that were previously performed service-by-service, and removes the need to create custom scripts and manual processes.',
        },
        cost: {
          text: 'The snapshot archive tier is a low-cost tier meant for rarely accessed snapshots that are kept for a long time.',
          src: 'ebs-snapshot-archive',
          quote: 'Amazon EBS Snapshots Archive is a storage tier that you can use for low-cost, long-term storage of your rarely-accessed snapshots that do not need frequent or fast retrieval.',
        },
        secure: {
          text: 'Vault Lock makes the backups write-once and protects them from inadvertent or malicious deletion, even by privileged users.',
          src: 'backup-vault-lock',
          quote: 'An additional layer of defense that protects backups (recovery points) in your backup vaults from inadvertent or malicious deletions.',
        },
        available: {
          text: 'A backup plan can copy each backup to another Region, so the backups stay available if a whole Region is lost.',
          src: 'aws-backup-plan-options',
          quote: 'As part of your backup plan, you can optionally create a backup copy in the same or another AWS Region.',
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
          text: 'The AWS managed key is the default choice, so nobody has to create the key or write its policy.',
          src: 's3-sse-kms',
          quote: 'you can use the default AWS managed key, or you can specify a customer managed key that you have already created.',
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
    7,
    2,
    'A database password for a function',
    'A Lambda function needs the password of its database. The team does not want the password in the function code. Every design below keeps it out of the code.',
    {
      options: [
        { id: 'a', text: 'A Secrets Manager secret that is replicated to a second Region' },
        { id: 'b', text: 'A Systems Manager Parameter Store standard parameter holding the password as a SecureString' },
        { id: 'c', text: 'A Secrets Manager secret with automatic rotation turned on, read by a function that runs outside any VPC' },
        { id: 'd', text: 'A Secrets Manager secret read through an interface VPC endpoint from a function inside the VPC' },
      ],
      answers: { overhead: 'c', cost: 'b', secure: 'd', available: 'a' },
      facts: {
        overhead: {
          text: 'Secrets Manager can rotate the secret on a schedule, so nobody has to change the password by hand.',
          src: 'secrets-rotation',
          quote: 'In Secrets Manager, you can set up automatic rotation for your secrets.',
        },
        cost: {
          text: 'Standard parameters in Parameter Store carry no charge, while advanced parameters do.',
          src: 'ssm-parameter-tiers',
          quote: 'If you no longer need an advanced parameter, or if you no longer want to incur charges for an advanced parameter, delete it and recreate it as a new standard parameter.',
        },
        secure: {
          text: 'An interface VPC endpoint gives a private connection to Secrets Manager, so the secret is fetched without crossing the public internet.',
          src: 'secrets-vpc-endpoint',
          quote: 'You can establish a private connection between your VPC and Secrets Manager by creating an interface VPC endpoint.',
        },
        available: {
          text: 'A secret replicated to other Regions stays readable by applications in those Regions.',
          src: 'secrets-replicate',
          quote: 'You can replicate your secrets in multiple AWS Regions to support applications spread across those Regions to meet Regional access and low latency requirements.',
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
    'Private servers that need updates and S3',
    'Application servers in private subnets in two Availability Zones must download operating system updates from the internet and read a heavy flow of objects from S3. Every design below gives them both.',
    {
      options: [
        { id: 'a', text: 'A NAT gateway in each Availability Zone, with each private subnet routed to the one in its own zone' },
        { id: 'b', text: 'One NAT gateway for the whole VPC' },
        { id: 'c', text: 'A NAT gateway for updates plus an S3 gateway endpoint, so S3 traffic skips the NAT gateway' },
        { id: 'd', text: 'A NAT gateway for updates plus an S3 interface endpoint with an endpoint policy, and a bucket policy that allows only that endpoint' },
        { id: 'e', text: 'A NAT instance that your team patches and fails over by hand' },
      ],
      answers: { overhead: 'b', cost: 'c', secure: 'd', available: 'a' },
      facts: {
        overhead: {
          text: 'Each subnet\'s route table decides where its traffic goes, so one shared NAT gateway needs one route target, while a gateway per zone, or an added endpoint, means more routes to build and keep correct.',
          src: 'vpc-nat-scenarios',
          quote: 'The route table for each subnet determines how traffic is routed.',
        },
        cost: {
          text: 'Gateway endpoints carry no additional charge, and they let S3 traffic leave the NAT gateway\'s path.',
          src: 'vpce-gateway-s3',
          quote: 'There is no additional charge for using gateway endpoints.',
        },
        secure: {
          text: 'A bucket policy can limit access to specific endpoints or VPCs, so the objects can only be read through that endpoint.',
          src: 'vpce-policies',
          quote: 'For example, if you\'re using an interface endpoint to connect to Amazon S3, you can also use Amazon S3 bucket policies to control access to buckets from specific endpoints or specific VPCs.',
        },
        available: {
          text: 'If servers in several zones share one NAT gateway and its zone fails, the other zones lose internet access, so each zone needs its own.',
          src: 'vpc-nat-basics',
          quote: 'If you have resources in multiple Availability Zones and they share one NAT gateway, and if the NAT gateway\'s Availability Zone is down, resources in the other Availability Zones lose internet access.',
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
          text: 'Object Lock stores objects write-once-read-many, so nobody can change or delete a log during its retention period.',
          src: 's3-object-lock',
          quote: 'Object Lock uses a write-once-read-many (WORM) model to store objects.',
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
        { id: 'a', text: 'ECS tasks on EC2 instances bought as Spot Instances' },
        { id: 'b', text: 'ECS on Fargate across three Availability Zones, with the load balancer health-checking each task' },
        { id: 'c', text: 'ECS on Fargate, where each task has its own IAM task role with only the permissions it needs' },
        { id: 'd', text: 'ECS on Fargate with the default setup' },
      ],
      answers: { overhead: 'd', cost: 'a', secure: 'c', available: 'b' },
      facts: {
        overhead: {
          text: 'Fargate removes the cluster of virtual machines, so there are no servers to provision, configure or scale.',
          src: 'fargate-ecs',
          quote: 'With AWS Fargate, you no longer have to provision, configure, or scale clusters of virtual machines to run containers.',
        },
        cost: {
          text: 'Spot Instances offer unused EC2 capacity that can reduce EC2 costs, which suits tasks that may be replaced at any time.',
          src: 'ec2-purchasing',
          quote: 'Spot Instances – Request unused EC2 instances, which can reduce your Amazon EC2 costs significantly.',
        },
        secure: {
          text: 'A separate role per task definition with only the permissions its tasks need limits what a compromised container can reach.',
          src: 'ecs-task-role',
          quote: 'If you have multiple task definitions or services that require IAM permissions, you should consider creating a role for each specific task definition or service with the minimum required permissions for the tasks to operate so that you can minimize the access that you provide for each task.',
        },
        available: {
          text: 'The load balancer sends traffic only to healthy targets, and tasks spread over several zones keep serving if one fails.',
          src: 'elb-what-is',
          quote: 'It monitors the health of its registered targets, and routes traffic only to the healthy targets.',
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
          text: 'FSx integrates with Active Directory for user access control, KMS for the keys and CloudTrail for an audit record, which the other designs leave at defaults.',
          src: 'fsx-windows',
          quote: 'It also provides rich integration with other AWS services like AWS IAM, AWS Directory Service for Microsoft Active Directory, Amazon WorkSpaces, AWS Key Management Service, and AWS CloudTrail.',
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
    3,
    'Linking an office to six VPCs',
    'A manufacturer links its office network to six VPCs in one Region. It has no Direct Connect circuit yet and the link must run this week. It will send many terabytes of data a month to AWS, steadily. Every design below connects the office to the VPCs.',
    {
      options: [
        { id: 'a', text: 'A Site-to-Site VPN connection to a transit gateway that the six VPCs attach to' },
        { id: 'b', text: 'One Direct Connect connection to a transit gateway' },
        { id: 'c', text: 'Two Direct Connect connections at separate locations, ending on different devices' },
        { id: 'd', text: 'A Direct Connect connection with an IPsec VPN running over it' },
      ],
      answers: { overhead: 'a', cost: 'b', secure: 'd', available: 'c' },
      facts: {
        overhead: {
          text: 'A Direct Connect circuit has to be requested and cabled at a location, with a Letter of Authorization step, before it can carry traffic; a VPN to the transit gateway needs none of that physical work.',
          src: 'dx-dedicated',
          quote: 'After you request the connection, we make a Letter of Authorization and Connecting Facility Assignment (LOA-CFA) available to you to download or email you with a request for more information.',
        },
        cost: {
          text: 'Direct Connect can reduce network costs for a large, steady flow compared with internet-based connections.',
          src: 'connectivity-dx',
          quote: 'Direct Connect can reduce network costs, increase bandwidth throughput, and provide a more consistent network experience than internet-based connections.',
        },
        secure: {
          text: 'Direct Connect does not encrypt traffic by default, so combining it with a VPN gives an IPsec-encrypted private connection.',
          src: 'dx-encryption',
          quote: 'This combination provides an IPsec-encrypted private connection that also reduces network costs, increases bandwidth throughput, and provides a more consistent network experience than internet-based VPN connections.',
        },
        available: {
          text: 'The resiliency toolkit stops you from ending redundant connections on the same Direct Connect device, so one device failing does not cut the office off.',
          src: 'dx-resiliency',
          quote: 'Prevents you from terminating the dedicated connections on the same Direct Connect device.',
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
          text: 'API Gateway is a managed service for creating, publishing and securing APIs at any scale, with no API servers to run.',
          src: 'apigw-welcome',
          quote: 'Amazon API Gateway is an AWS service for creating, publishing, maintaining, monitoring, and securing REST, HTTP, and WebSocket APIs at any scale.',
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
