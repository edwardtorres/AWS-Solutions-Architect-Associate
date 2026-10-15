import type { Question } from '../../../src/content/types.ts';
import { mc, mr } from '../helpers.ts';

const questions: Question[] = [
  mc({
    id: 'block-warehouse-001',
    building: 'block-warehouse',
    bullets: ['4.1-K6'],
    d: 1,
    stem: 'A company keeps 10 TB of infrequently accessed data on a non-boot data volume of an Amazon EC2 instance. The data is read sequentially a few times a year, and the company wants the LOWEST storage cost. Which Amazon EBS volume type should the company use?',
    correct: ['Cold HDD (sc1)', 'Cold HDD is throughput-oriented storage for infrequently accessed data where the lowest storage cost is important.'],
    wrong: [
      ['General Purpose SSD (gp3)', 'It is the lowest cost SSD type, but the data is rarely read and does not need SSD performance.'],
      ['Provisioned IOPS SSD (io2)', 'It targets I/O-intensive workloads that need sustained IOPS, which this rarely read data does not.'],
      ['Throughput Optimized HDD (st1)', 'It suits frequently accessed streaming workloads such as big data and logs, not data that is rarely read.'],
    ],
    slot: 0,
    evidence: [
      'ebs-volume-types|Throughput-oriented storage for data that is infrequently accessed Scenarios where the lowest storage cost is important',
    ],
  }),
  mc({
    id: 'block-warehouse-002',
    building: 'block-warehouse',
    bullets: ['4.1-K6'],
    d: 2,
    stem: 'A company launches a fleet of Amazon EC2 web servers. Each server needs a root volume for the operating system, and the company wants the LOWEST cost option that can serve as a boot volume. Which Amazon EBS volume type meets these requirements?',
    correct: ['General Purpose SSD (gp3)', 'gp3 is the lowest cost SSD volume type, is recommended for most workloads, and supports use as a boot volume.'],
    wrong: [
      ['Cold HDD (sc1), because it has the lowest storage cost of the volume types', 'HDD-backed volumes cannot be used as boot volumes.'],
      ['Throughput Optimized HDD (st1), because the operating system reads files sequentially', 'HDD-backed volumes cannot be used as boot volumes, whatever the access pattern.'],
      ['Provisioned IOPS SSD (io2) Block Express, because it has the most consistent latency', 'It can boot an instance, but it is built for I/O-intensive databases that need sub-millisecond latency, which web servers do not.'],
    ],
    slot: 1,
    evidence: [
      'ebs-volume-types|Amazon EBS Multi-attach Not supported Boot volume Not supported',
      'ebs-volume-types|Transactional workloadsVirtual desktopsMedium-sized, single-instance databasesLow-latency interactive applicationsBoot volumesDevelopment and test environments',
      'ebs-gp|General Purpose SSD (gp3) volumes are the latest generation of General Purpose SSD volumes, and the lowest cost SSD volume offered by Amazon EBS.',
    ],
  }),
  mc({
    id: 'block-warehouse-003',
    building: 'block-warehouse',
    bullets: ['4.1-K6'],
    d: 3,
    tags: ['trap:instance-store-vs-ebs'],
    stem: 'A video company runs batch jobs on Amazon EC2. Each job writes about 1 TB of intermediate scratch data that is deleted when the job ends and can be recreated by rerunning the job. The company wants the LOWEST storage cost for this scratch data and does not need it to survive a stop or termination. Which solution meets these requirements?',
    correct: ['Use the instance store volumes that come with an instance type that includes local disks', 'Instance store suits temporary scratch data and its volumes are included in the usage cost of the instance, with no extra charge.'],
    wrong: [
      ['Attach a Provisioned IOPS SSD (io2) volume to each instance and delete it after the job', 'Each volume is a separately provisioned and billed resource, and the scratch data needs no persistence beyond the job.'],
      ['Attach a General Purpose SSD (gp3) volume and take a snapshot every hour during each job', 'This adds a billed volume and snapshot storage to protect data that can simply be recreated.'],
      ['Mount an Amazon EFS file system on every instance and remove the files after each job', 'EFS adds a billed shared file system for data that only one instance uses and that does not need to be shared or kept.'],
    ],
    slot: 2,
    evidence: [
      'instance-store|Instance store is ideal for temporary storage of information that changes frequently, such as buffers, caches, scratch data, and other temporary content.',
      'instance-store|Instance store volumes are included as part of the usage cost of the instance.',
      'instance-store-lifetime|However, the data does not persist if the instance is stopped, hibernated, or terminated.',
    ],
  }),
  mc({
    id: 'block-warehouse-004',
    building: 'block-warehouse',
    bullets: ['4.1-S2'],
    d: 1,
    stem: 'A Linux Amazon EC2 instance supports an application that cannot be stopped. Its Amazon EBS data volume is almost full, and the company wants to add capacity with the LEAST downtime. Which solution meets these requirements?',
    correct: ['Increase the volume size with Amazon EBS Elastic Volumes and then extend the file system', 'Elastic Volumes can grow a volume without detaching it or restarting the instance, and the file system is then extended to use the new size.'],
    wrong: [
      ['Stop the instance, detach the volume, and attach a larger volume created from a snapshot', 'Stopping the instance and detaching the volume causes the downtime the company wants to avoid.'],
      ['Take a snapshot, delete the volume, and create a larger volume from the snapshot', 'Deleting the volume while the application is running interrupts it, and the application cannot be stopped.'],
      ['Shut down the application during the weekend and run a restore from a backup onto larger storage', 'A planned shutdown is still downtime, and the application cannot be stopped.'],
    ],
    slot: 3,
    evidence: [
      'ebs-modify|If your instance supports Elastic Volumes, you can do so without detaching the volume or restarting the instance.',
      'ebs-extend-fs|After you increase the size of an EBS volume, you must extend the partition and file system to the new, larger size.',
    ],
  }),
  mc({
    id: 'block-warehouse-005',
    building: 'block-warehouse',
    bullets: ['4.1-S2'],
    d: 2,
    stem: 'A company provisioned a 4 TiB Amazon EBS data volume for a database, but only 300 GiB is used and growth is slow. The company wants to reduce the provisioned size to cut storage cost. Which solution meets this requirement?',
    correct: ['Create a smaller volume, copy the data to it with an application-level tool, and delete the large volume', 'The volume size cannot be decreased, but you can create a smaller volume and migrate the data to it with a tool such as rsync.'],
    wrong: [
      ['Use Amazon EBS Elastic Volumes to reduce the size of the volume while it stays attached', 'Elastic Volumes can increase the size, but you cannot decrease the volume size.'],
      ['Change the volume type to Cold HDD (sc1) so that the provisioned size shrinks to fit the data', 'Changing the type does not reduce the provisioned size of the volume.'],
      ['Take a snapshot of the volume and delete the unused space from the snapshot to shrink the volume', 'Deleting data does not reduce the size of a volume, so the provisioned size and its charge stay the same.'],
    ],
    slot: 0,
    evidence: [
      'ebs-modify|You can\'t decrease the volume size.',
      'ebs-modify|However, you can create a smaller volume and then migrate your data to it using an application-level tool such as rsync (Linux instances) or robocopy (Windows instances).',
    ],
  }),
  mr({
    id: 'block-warehouse-006',
    building: 'block-warehouse',
    bullets: ['4.1-S2', '4.1-S4'],
    d: 3,
    stem: 'A company is moving a relational database to Amazon RDS. It needs 200 GiB today, and growth is unpredictable. A forecast says that it could reach several terabytes within two years. The company wants to avoid an outage from running out of space and does not want to pay for capacity it does not yet use, with the LEAST operational overhead. Which TWO actions meet these requirements? (Choose two.)',
    correct: [
      ['Provision the storage that the database needs now instead of the forecast maximum', 'Sizing for the current need avoids paying for capacity that is unused for a long time.'],
      ['Enable RDS storage autoscaling and set a maximum storage threshold', 'RDS scales storage up automatically when free space runs low, up to the limit that you set, so no one has to react.'],
    ],
    wrong: [
      ['Provision the several terabytes forecast for two years from now on the first day', 'This pays for capacity that is unused for a long time, which the company does not want.'],
      ['Create a CloudWatch alarm that pages an engineer to resize the storage by hand', 'This relies on a manual response and risks an outage, where autoscaling acts on its own.'],
      ['Move to a larger DB instance class whenever free space becomes low', 'The instance class sets compute and memory capacity and is not how database storage is increased.'],
    ],
    slots: [0, 3],
    evidence: [
      'rds-storage-autoscaling|If your workload is unpredictable, you can enable storage autoscaling for an Amazon RDS DB instance.',
      'rds-storage-autoscaling|With storage autoscaling enabled, when Amazon RDS detects that you are running out of free database space it automatically scales up your storage.',
      'rds-storage-autoscaling|The maximum storage threshold is the limit that you set for autoscaling the DB instance.',
    ],
  }),
  mc({
    id: 'block-warehouse-007',
    building: 'block-warehouse',
    bullets: ['4.1-S4'],
    d: 2,
    stem: 'A company runs a fleet of Linux Amazon EC2 instances in several Availability Zones that must share the same files. The total size of the files is unpredictable and can both grow and shrink. The company does not want to provision or resize storage and wants the LEAST operational overhead. Which solution meets these requirements?',
    correct: ['Store the files in an Amazon EFS file system mounted on all of the instances', 'EFS grows and shrinks automatically as files are added and removed, and the instances in all of the zones can share it without provisioning capacity.'],
    wrong: [
      ['Attach one large General Purpose SSD (gp3) volume to every instance and synchronize them', 'Each volume has a provisioned size to manage and the copies must be kept in sync, which adds overhead.'],
      ['Attach a Provisioned IOPS SSD (io2) volume with Multi-Attach to all of the instances', 'Multi-Attach works only for instances in the same Availability Zone, and the size is still provisioned.'],
      ['Create a Throughput Optimized HDD (st1) volume sized for the largest expected data set', 'It is attached to one instance in one zone, and capacity still has to be provisioned and resized.'],
    ],
    slot: 1,
    evidence: [
      'efs-what-is|Amazon EFS is built to scale on demand to petabytes without disrupting applications, growing and shrinking automatically as you add and remove files.',
      'efs-what-is|Amazon Elastic File System (Amazon EFS) provides serverless, fully elastic file storage so that you can share file data without provisioning or managing storage capacity and performance.',
      'ebs-multi-attach|Multi-Attach enabled volumes can be attached to up to 16 instances built on the Nitro System that are in the same Availability Zone.',
    ],
  }),
  mc({
    id: 'block-warehouse-008',
    building: 'block-warehouse',
    bullets: ['4.1-S4'],
    d: 2,
    stem: 'A photo application on Amazon EC2 keeps user uploads on a 2 TiB General Purpose SSD (gp3) volume. Uploads grow unpredictably, and engineers resize the volume by hand every few weeks. The developers can change the application to call an object storage API, and the company wants to stop managing capacity with the LEAST operational overhead. Which solution meets these requirements?',
    correct: ['Store the uploads in Amazon S3, which holds any amount of data without capacity to provision', 'S3 stores any amount of data, so there is no volume size to forecast or increase as uploads grow.'],
    wrong: [
      ['Provision a single 16 TiB gp3 volume so that resizing is not needed for a long time', 'This pays for capacity that is not used yet, and the volume still has a fixed size that will eventually need to be changed.'],
      ['Replace the volume with a Cold HDD (sc1) volume of the same size to lower the cost', 'A different volume type still has a provisioned size that engineers have to monitor and increase.'],
      ['Attach an additional gp3 volume each time the current one fills and spread the uploads across them', 'This keeps manual capacity management and makes the application track which volume holds each upload.'],
    ],
    slot: 2,
    evidence: [
      's3-what-is|Customers of all sizes and industries can use Amazon S3 to store and protect any amount of data for a range of use cases, such as data lakes, websites, mobile applications, backup and restore, archive, enterprise applications, IoT devices, and big data analytics.',
      'ebs-modify|You can\'t decrease the volume size.',
    ],
  }),
  mr({
    id: 'block-warehouse-009',
    building: 'block-warehouse',
    bullets: ['4.1-K6'],
    d: 3,
    tags: ['mock-reserve'],
    stem: 'A company attaches two non-boot data volumes to Amazon EC2 instances. Volume one holds 12 TB of log data that is scanned sequentially every day and must deliver 400 MiB/s of throughput per volume. Volume two holds 10 TB of compliance data that is read a few times a year. Which TWO volume choices meet these requirements at the LOWEST storage cost? (Choose two.)',
    correct: [
      ['Use Throughput Optimized HDD (st1) for the log data', 'st1 suits log processing and large streaming workloads, and its maximum throughput per volume covers 400 MiB/s.'],
      ['Use Cold HDD (sc1) for the compliance data', 'sc1 is for infrequently accessed data where the lowest storage cost is important.'],
    ],
    wrong: [
      ['Use Cold HDD (sc1) for the log data', 'sc1 has a lower maximum throughput per volume than st1, so it cannot deliver the required 400 MiB/s.'],
      ['Use Provisioned IOPS SSD (io2) Block Express for the compliance data', 'It is built for I/O-intensive databases, and paying for it for rarely read data is not the lowest cost.'],
      ['Use General Purpose SSD (gp3) for both volumes to keep one volume type', 'Using SSD for the rarely read compliance data does not give the lowest storage cost.'],
    ],
    slots: [1, 4],
    evidence: [
      'ebs-volume-types|Big data Data warehouses Log processing',
      'ebs-volume-types|Throughput-oriented storage for data that is infrequently accessed Scenarios where the lowest storage cost is important',
      'ebs-volume-types|Volume size 125 GiB - 16 TiB Max IOPS per volume (1 MiB I/O) 500 250 Max throughput per volume 500 MiB/s 250 MiB/s',
    ],
  }),
];

export default questions;
