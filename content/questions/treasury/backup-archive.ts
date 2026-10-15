import type { Question } from '../../../src/content/types.ts';
import { mc, mr } from '../helpers.ts';

const questions: Question[] = [
  mc({
    id: 'backup-archive-001',
    building: 'backup-archive',
    bullets: ['4.1-K5'],
    d: 1,
    stem: 'A company takes a nightly snapshot of the Amazon EBS volume that holds its order database. The business now says it can tolerate losing at most one hour of data after a failure. Which change meets this requirement at the LOWEST cost?',
    correct: ['Schedule hourly snapshots by using AWS Backup or Amazon Data Lifecycle Manager', 'How often backups run determines the achievable recovery point, and both services can automate snapshot creation on a schedule.'],
    wrong: [
      ['Keep the nightly snapshots and extend their retention period to 90 days', 'Retention changes how long snapshots are kept and not how often they are taken, so up to a day of data could still be lost.'],
      ['Keep the nightly snapshots and copy each one to a second AWS Region', 'A copy protects against a Regional failure and does not shorten the interval between snapshots, so the recovery point stays at one day.'],
      ['Keep the nightly snapshots and add a full copy of the volume to Amazon S3 each week', 'A weekly copy adds a restore point only once a week, which is further from the one-hour target than the nightly snapshot.'],
    ],
    slot: 0,
    evidence: [
      'dr-options|How often you run your backup will determine your achievable recovery point (which should align to meet your RPO).',
      'ebs-snapshots|For data resiliency and disaster recovery, it is your responsibility to create EBS snapshots on a regular basis, or to set up automatic snapshot creation by using Automate backups with Amazon Data Lifecycle Manager or AWS Backup.',
    ],
  }),
  mc({
    id: 'backup-archive-002',
    building: 'backup-archive',
    bullets: ['4.1-K5'],
    d: 2,
    stem: 'A company runs a database on Amazon EC2 with a 2 TB Amazon EBS volume, and about 2 percent of the blocks change each day. The company needs a restore point for each of the last 30 days. Which backup design has the LOWEST storage cost?',
    correct: ['Take a snapshot of the volume every day and keep each one for 30 days', 'EBS snapshots are incremental, so after the first one each snapshot stores only the blocks that changed since the previous snapshot.'],
    wrong: [
      ['Copy the entire volume contents to a new Amazon S3 object each night with a script and keep 30 copies', 'Every copy is a full 2 TB image, so storage grows by the whole volume each day instead of by the changed blocks.'],
      ['Move each snapshot to the EBS Snapshots Archive tier right after it is created and keep it for 30 days', 'Archived snapshots are always full snapshots, and the archive tier has a 90-day minimum period that is billed even if a snapshot is deleted earlier.'],
      ['Take a snapshot every day and delete the previous snapshot after each new one completes', 'Only one restore point would exist at a time, so the requirement for a restore point for each of the last 30 days is not met.'],
    ],
    slot: 1,
    evidence: [
      'ebs-snapshots|incremental backup, which means that we save only the blocks on the volume that have changed since the most recent snapshot.',
      'ebs-archive-considerations|Archived snapshots are always full snapshots.',
      'ebs-archive-considerations|If you delete or permanently restore an archived snapshot before the minimum archive period of 90 days, you are billed for remaining days in the archive tier, rounded to the nearest hour.',
    ],
  }),
  mr({
    id: 'backup-archive-003',
    building: 'backup-archive',
    bullets: ['4.1-K5'],
    d: 2,
    stem: 'A company runs an Amazon RDS database that it will retire at the end of the month. Auditors want the company to be able to restore the data to any point in time within a 7-day window, including for the 7 days after the DB instance is deleted. The company wants to avoid paying for a running DB instance or for custom scripts. Which TWO actions meet these requirements MOST cost-effectively? (Choose two.)',
    correct: [
      ['Set the backup retention period of the DB instance to 7 days', 'RDS keeps automated backups for the retention period you specify and lets you recover to any point in time within it.'],
      ['Choose to retain automated backups when deleting the DB instance', 'Retained automated backups are saved for the full retention period after the instance is deleted.'],
    ],
    wrong: [
      ['Take only a final DB snapshot when deleting the DB instance', 'A final snapshot restores the data as it was at one moment, not to any point in time in the 7-day window.'],
      ['Keep the DB instance running for 7 more days after the retirement date', 'The company would keep paying for a running DB instance, which the requirements say to avoid.'],
      ['Run a script that takes a manual DB snapshot every day until the end of the month', 'It needs custom scripts and gives one restore point per day rather than any point in time.'],
    ],
    slots: [1, 3],
    evidence: [
      'rds-automated-backups|RDS saves the automated backups of your DB instance according to the backup retention period that you specify.',
      'rds-automated-backups|If necessary, you can recover your DB instance to any point in time during the backup retention period.',
      'rds-automated-backups|If you choose to retain automated backups when you delete a DB instance, the automated backups are saved for the full retention period.',
    ],
  }),
  mc({
    id: 'backup-archive-004',
    building: 'backup-archive',
    bullets: ['4.1-S6'],
    d: 3,
    stem: 'A company takes a daily snapshot of a 1 TB Amazon EBS volume and keeps each snapshot for 30 days. About 5 percent of the blocks change each day, and restores must be possible within a few hours. An engineer wants to move every snapshot older than 7 days to the EBS Snapshots Archive tier to save cost. Which approach is MOST cost-effective?',
    correct: ['Keep all snapshots in the standard tier and let the retention setting delete them after 30 days', 'Standard-tier snapshots are incremental and restore quickly, while archiving would add a 90-day minimum period and full-size snapshots.'],
    wrong: [
      ['Archive each snapshot manually 7 days after it is created and delete it on day 30', 'Deleting an archived snapshot before the 90-day minimum archive period is billed for the remaining days, and archived snapshots are full snapshots that are larger.'],
      ['Use an AWS Backup plan that moves backups to cold storage after 8 days and deletes them after 30 days in total', 'Cold storage requires a total retention period of at least 90 days, so a 30-day plan cannot use it.'],
      ['Archive every snapshot right after it is created and restore one only when needed', 'Restoring an archived snapshot can take up to 72 hours, which does not meet the requirement for restores within a few hours.'],
    ],
    slot: 3,
    evidence: [
      'ebs-archive-considerations|The minimum archive period is 90 days.',
      'ebs-archive-considerations|If you delete or permanently restore an archived snapshot before the minimum archive period of 90 days, you are billed for remaining days in the archive tier, rounded to the nearest hour.',
      'ebs-archive-considerations|It can take up to 72 hours to restore an archived snapshot from the archive tier to the standard tier, depending on the size of the snapshot.',
      'backup-create-plan|To use cold storage, you must have a total retention period of 90 days or greater.',
    ],
  }),
  mc({
    id: 'backup-archive-005',
    building: 'backup-archive',
    bullets: ['4.1-K5', '4.1-S6'],
    d: 2,
    stem: 'A company uses an AWS Backup plan to take a monthly backup of its Amazon EBS volumes. Each backup must be kept for two years and is rarely restored. The company wants the LOWEST storage cost for the long retention with the LEAST operational overhead. Which lifecycle setting meets these requirements?',
    correct: ['Move backups to cold storage after 30 days and set the total retention period to 730 days', 'Cold storage for EBS is the Snapshots Archive tier, it needs monthly or less frequent backups and a total retention of at least 90 days.'],
    wrong: [
      ['Move backups to cold storage after 1 day and set the total retention period to 730 days', 'Moving a full backup to cold storage this early makes AWS Backup create another warm full backup, which adds cost; at least 8 days in warm storage is recommended.'],
      ['Keep every backup in warm storage for the full 730 days and do not use cold storage', 'EBS backups taken monthly can use the cheaper cold tier, so leaving two years of backups warm pays more than needed.'],
      ['Run a script on an instance that copies each backup to Amazon S3 Glacier Deep Archive', 'The script must be written and maintained, which conflicts with the least operational overhead, and it bypasses the central backup plan.'],
    ],
    slot: 2,
    evidence: [
      'backup-create-plan|Cold storage for Amazon EBS is Amazon EBS Snapshots Archive.',
      'aws-backup-plan-options|If Amazon EBS is one of the resources you back up and your backup frequency is monthly or less frequent, you can transition them to cold tier using EBS snapshot archival.',
      'backup-create-plan|If the full backup is transitioned to cold storage too soon (for example, a transition to cold storage after 1 day), AWS Backup will create another warm full backup.',
    ],
  }),
  mc({
    id: 'backup-archive-006',
    building: 'backup-archive',
    bullets: ['4.1-S6'],
    d: 2,
    stem: 'An application stores closed-account statements as files on an Amazon EBS volume attached to an Amazon EC2 instance. The statements must be kept for seven years, are almost never read, and auditors request individual files with a day or two of notice. The EBS volume is growing and the company wants the LOWEST cost. Which solution meets these requirements?',
    correct: ['Move the statement files to Amazon S3 and store them in S3 Glacier Deep Archive', 'Deep Archive is designed for archive data accessed less than once a year, and individual files can be restored in 9 to 48 hours.'],
    wrong: [
      ['Take daily snapshots of the EBS volume and keep them for seven years', 'Snapshots protect the live volume, but the statements would stay on the growing volume, and retrieving one file means restoring a whole snapshot.'],
      ['Archive an EBS snapshot of the volume in the Snapshots Archive tier and keep the volume running', 'The statements would still occupy the growing volume, and a single file requires a restore of the whole snapshot that can take up to 72 hours.'],
      ['Move the statement files to S3 Glacier Instant Retrieval', 'It is designed for archive data accessed about once a quarter with millisecond access, which the auditors with a day of notice do not need.'],
    ],
    slot: 0,
    evidence: [
      's3-storage-classes|S3 Glacier Deep Archive (DEEP_ARCHIVE) Long-lived archive data accessed less than once a year with retrieval times of hours',
      's3-glacier-classes|S3 Glacier Instant Retrieval 90 days Quarterly Milliseconds No S3 Glacier Flexible Retrieval 90 days Semi-annually Minutes to 12 hours Yes S3 Glacier Deep Archive 180 days Annually 9 to 48 hours Yes',
      'ebs-archive-considerations|It can take up to 72 hours to restore an archived snapshot from the archive tier to the standard tier, depending on the size of the snapshot.',
    ],
  }),
  mr({
    id: 'backup-archive-007',
    building: 'backup-archive',
    bullets: ['4.1-S6'],
    d: 3,
    stem: 'A company has two needs. First, daily backups of its Amazon EBS volumes, Amazon RDS databases and Amazon EFS file systems must follow one policy. Second, monthly statement PDFs in Amazon S3 must be kept for ten years, are read less than once a year, and can wait up to three days for retrieval. Which TWO solutions meet these needs MOST cost-effectively? (Choose two.)',
    correct: [
      ['An AWS Backup plan that is applied to the EBS, RDS and EFS resources', 'Backup plans define the requirements once and apply them to resources across the AWS services that the company uses.'],
      ['An S3 Lifecycle rule that transitions the statement PDFs to S3 Glacier Deep Archive', 'Deep Archive is designed for archive data accessed less than once a year, with 9 to 48 hours retrieval that fits three days.'],
    ],
    wrong: [
      ['A separate native backup setup for each service, with scripts for the EBS volumes and EFS file systems', 'The company would manage three configurations and scripts rather than one policy.'],
      ['AWS Storage Gateway as a Tape Gateway with virtual tapes for the statement PDFs', 'The statements are objects in Amazon S3 and no backup application writes to tape, so a gateway adds components without a benefit.'],
      ['An S3 Lifecycle rule that transitions the statement PDFs to S3 Glacier Instant Retrieval', 'It is designed for archive data accessed about once a quarter with millisecond access, which is more than the statements need.'],
    ],
    slots: [2, 4],
    evidence: [
      'backup-what-is|Use these backup plans to define your backup requirements and then apply them to the AWS resources that you want to protect across the AWS services that you use.',
      's3-storage-classes|S3 Glacier Deep Archive (DEEP_ARCHIVE) Long-lived archive data accessed less than once a year with retrieval times of hours',
      'sgw-tape|Tape Gateway provides cloud-backed virtual tape storage.',
    ],
  }),
  mc({
    id: 'backup-archive-008',
    building: 'backup-archive',
    bullets: ['4.1-S6'],
    d: 1,
    stem: 'A company is closing a project. It must keep one final point-in-time copy of a 500 GB Amazon EBS volume for three years for compliance, expects to restore it rarely if ever, and can wait days for a restore. After the copy is stored, the volume will be deleted. Which solution has the LOWEST cost?',
    correct: ['Archive a snapshot of the volume in the Amazon EBS Snapshots Archive tier', 'The archive tier is for low-cost, long-term storage of rarely accessed snapshots, such as the only snapshot of a volume at the end of a project.'],
    wrong: [
      ['Keep the volume detached and keep a snapshot in the standard tier', 'The company would keep paying for the volume as well as the standard-tier snapshot, which is not needed once a snapshot is stored.'],
      ['Keep a snapshot of the volume in the EBS Snapshot standard tier only', 'It works, but the archive tier exists for snapshots kept 90 days or longer and rarely accessed, so the standard tier costs more.'],
      ['Copy the snapshot to an S3 Glacier Deep Archive bucket by using the Amazon S3 console', 'Snapshots are stored in S3 buckets that the company cannot access, so they cannot be copied with the Amazon S3 console or API.'],
    ],
    slot: 1,
    evidence: [
      'ebs-snapshot-archive|Archiving the only snapshot of a volume, such as end-of-project snapshots',
      'ebs-snapshot-archive|for snapshots that you plan to store for 90 days or longer and that you rarely need to access.',
      'ebs-snapshots|You can\'t access your snapshots using the Amazon S3 console or the Amazon S3 API.',
    ],
  }),
  mc({
    id: 'backup-archive-009',
    building: 'backup-archive',
    bullets: ['4.1-S6'],
    d: 2,
    tags: ['mock-reserve'],
    stem: 'A company\'s backup software writes nightly backups to virtual tapes by using the iSCSI tape protocol. The company must keep the backups for ten years and rarely restores them. It wants cost-effective archival in AWS without changing the backup software. Which solution meets these requirements?',
    correct: ['Use AWS Storage Gateway as a Tape Gateway, with the virtual tapes in S3 Glacier Deep Archive', 'Tape Gateway lets the existing tape-based software write to cloud-backed virtual tapes, which can be archived in Deep Archive.'],
    wrong: [
      ['Change the backup software to write to an Amazon EBS volume and snapshot it nightly', 'The software would have to change, and ten years of nightly snapshots of a growing volume is not a low-cost archive.'],
      ['Change the backup software to write to an Amazon EFS file system with the Standard storage class', 'The software would have to change, and keeping ten years of backups in a file system is costlier than archive storage.'],
      ['Use an AWS Backup plan that backs up the backup server\'s EBS volume and keeps it for ten years', 'It protects the server\'s volume and does not archive the tape-based backups that the software produces.'],
    ],
    slot: 3,
    evidence: [
      'sgw-tape|With Tape Gateway, you can cost-effectively and durably archive backup data in S3 Glacier Flexible Retrieval or S3 Glacier Deep Archive.',
      'sgw-tape|Tape Gateway provides cloud-backed virtual tape storage.',
    ],
  }),
];

export default questions;
