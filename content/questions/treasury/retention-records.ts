import type { Question } from '../../../src/content/types.ts';
import { mc, mr } from '../helpers.ts';

const questions: Question[] = [
  mc({
    id: 'retention-records-001',
    building: 'retention-records',
    bullets: ['4.3-K4'],
    d: 1,
    stem: 'A development team runs an Amazon RDS for MySQL DB instance that is rebuilt from scripts every night. Nobody ever restores it, and the team wants to stop paying for backup storage for this instance. Which change meets this requirement with the LEAST effort?',
    correct: ['Set the backup retention period of the DB instance to 0', 'A backup retention period of 0 disables automated backups, so the instance no longer creates backup storage.'],
    wrong: [
      ['Set the backup retention period of the DB instance to one day', 'One day still creates automated backups every day, so backup storage continues.'],
      ['Take a manual snapshot of the DB instance every night and keep only the latest one', 'Manual snapshots are extra work and still occupy backup storage until someone deletes them.'],
      ['Create an AWS Backup plan that backs up the DB instance every night with a short lifecycle', 'This adds a second set of backups and storage instead of removing the backup storage the team is paying for.'],
    ],
    slot: 0,
    evidence: [
      'rds-backup-retention|You can set the backup retention period of a DB instance to between 0 and 35 days.',
      'rds-backup-retention|Setting the backup retention period to 0 disables automated backups.',
    ],
  }),
  mc({
    id: 'retention-records-002',
    building: 'retention-records',
    bullets: ['4.3-K4'],
    d: 2,
    stem: 'An Amazon RDS for PostgreSQL DB instance has a backup retention period of seven days, yet the backup storage cost keeps growing. The team finds three years of monthly manual snapshots that nobody needs. Which action reduces the cost with the LEAST effort?',
    correct: ['Delete the manual snapshots that are no longer needed', 'Manual snapshots are not subject to the backup retention period and do not expire, so they stay until someone deletes them.'],
    wrong: [
      ['Lower the backup retention period of the DB instance to one day', 'The retention period applies to automated backups, so the manual snapshots would stay and keep costing money.'],
      ['Wait for the snapshots to expire when they pass the retention period', 'Snapshots do not expire, so they would remain and continue to count toward backup storage.'],
      ['Turn off automated backups on the DB instance by setting the retention period to 0', 'This removes the automated backups the team still needs for point-in-time recovery and leaves the old manual snapshots in place.'],
    ],
    slot: 1,
    evidence: [
      'rds-snapshot-create|Unlike automated backups, manual snapshots aren\'t subject to the backup retention period.',
      'rds-snapshot-create|Snapshots don\'t expire.',
      'rds-automated-backups|Your Amazon RDS backup storage for each AWS Region is composed of the automated backups and manual DB snapshots for that Region.',
    ],
  }),
  mc({
    id: 'retention-records-003',
    building: 'retention-records',
    bullets: ['4.3-K4'],
    d: 2,
    stem: 'A regulation requires a company to keep daily backups of an Amazon RDS for MySQL database for 90 days. The company wants to meet the rule with the LEAST operational overhead and no custom scripts. Which solution meets these requirements?',
    correct: ['Create an AWS Backup plan with a daily rule that deletes each backup after 90 days and assign the DB instance to it', 'A backup plan retains backups for its resources according to the plan, and it is not limited to the retention range of the DB instance.'],
    wrong: [
      ['Set the backup retention period of the DB instance to 90 days', 'The retention period of a DB instance can be set only between 0 and 35 days, so 90 days is not possible.'],
      ['Set the backup retention period to 35 days and accept the shorter retention', 'This keeps backups for 35 days, which does not meet the 90 days the regulation requires.'],
      ['Run an AWS Lambda function every day that creates a manual snapshot and another that deletes old ones', 'This needs custom code to write and operate, which the company wants to avoid.'],
    ],
    slot: 2,
    evidence: [
      'rds-backup-retention|You can set the backup retention period of a DB instance to between 0 and 35 days.',
      'backup-plans|You can assign resources to backup plans, and AWS Backup automatically backs up and retains backups for those resources according to the backup plan.',
      'backup-what-is|Amazon Relational Database Service (Amazon RDS) Amazon RDS database instances (including all database engines); Multi-Availability Zone clusters',
    ],
  }),
  mc({
    id: 'retention-records-004',
    building: 'retention-records',
    bullets: ['4.3-K4'],
    d: 3,
    stem: 'A company is retiring an Amazon RDS for MariaDB DB instance that has a backup retention period of 14 days. If a problem with the final data is found, the company wants to restore the database to any point in time during the 14 days after the deletion, and it does not want to pay for backups for longer than 14 days. Which approach meets these requirements MOST cost-effectively?',
    correct: ['Delete the DB instance and choose to retain automated backups', 'Retained automated backups are saved for the full retention period, so restores are possible for 14 days and then the backups end.'],
    wrong: [
      ['Delete the DB instance without retaining automated backups and rely on the automated backups', 'All automated backups are deleted with the DB instance when Retain automated backups is not chosen.'],
      ['Take a manual snapshot, delete the DB instance, and keep the snapshot until someone remembers to delete it', 'A snapshot is a single point in time and does not expire, so it cannot restore any point in 14 days and keeps costing money.'],
      ['Raise the retention period to 35 days before deleting the DB instance and choose to retain automated backups', 'The backups would then be kept for 35 days, which is longer than the 14 days the company wants to pay for.'],
    ],
    slot: 3,
    evidence: [
      'rds-automated-backups|If you choose to retain automated backups when you delete a DB instance, the automated backups are saved for the full retention period.',
      'rds-automated-backups|If you don\'t choose Retain automated backups when you delete a DB instance, all automated backups are deleted with the DB instance.',
      'rds-automated-backups|If necessary, you can recover your DB instance to any point in time during the backup retention period.',
    ],
  }),
  mc({
    id: 'retention-records-005',
    building: 'retention-records',
    bullets: ['4.3-S1'],
    d: 1,
    stem: 'A company runs an Amazon RDS for PostgreSQL DB instance. After a bad deployment it must be able to restore the database to any moment during the last seven days, and it wants the LOWEST backup cost and effort. Which solution meets these requirements?',
    correct: ['Keep automated backups with a seven-day retention period and use point-in-time recovery', 'RDS uploads transaction logs to Amazon S3 every five minutes, so any moment in the retention period can be restored without extra snapshots.'],
    wrong: [
      ['Run a script that takes a manual snapshot every hour and deletes the ones older than seven days', 'Hourly snapshots only restore to the top of each hour, need a script to run, and store many more backups.'],
      ['Create an AWS Backup rule that takes one backup every day and keeps each for seven days', 'A daily backup restores only to the time of each backup, so up to a day of changes could be lost.'],
      ['Enable a Multi-AZ deployment so that the standby holds the earlier state of the database', 'A standby copies changes as they happen and protects availability; it does not keep earlier states for restoring to a past time.'],
    ],
    slot: 3,
    evidence: [
      'rds-pitr|RDS uploads transaction logs for DB instances to Amazon S3 every five minutes.',
      'rds-automated-backups|If necessary, you can recover your DB instance to any point in time during the backup retention period.',
    ],
  }),
  mc({
    id: 'retention-records-006',
    building: 'retention-records',
    bullets: ['4.3-S1'],
    d: 2,
    stem: 'A company uses an AWS Backup rule that backs up an Amazon DynamoDB table every hour and keeps each backup for 30 days. The business has confirmed that it can lose at most 24 hours of data, and the 30-day retention is required. The company wants to cut backup storage cost. Which change meets the requirements MOST cost-effectively?',
    correct: ['Change the backup frequency of the rule to once a day and keep the 30-day retention', 'A daily backup still meets the 24-hour data-loss limit and creates far fewer backups to store for 30 days.'],
    wrong: [
      ['Keep the hourly frequency and reduce the retention of each backup to one day', 'This breaks the required 30-day retention.'],
      ['Keep the hourly rule and lock the backup vault in compliance mode', 'A vault lock prevents deletion of backups and adds no savings; the number of stored backups stays the same.'],
      ['Change the backup frequency to once every 30 days so that only one backup is stored', 'A backup every 30 days could lose up to 30 days of data, which breaks the 24-hour limit.'],
    ],
    slot: 0,
    evidence: [
      'dr-options|How often you run your backup will determine your achievable recovery point (which should align to meet your RPO).',
      'backup-create-plan|In the backup frequency menu, choose how often you want this plan to create a backup.',
    ],
  }),
  mr({
    id: 'retention-records-007',
    building: 'retention-records',
    bullets: ['4.3-K4', '4.3-S1'],
    d: 3,
    stem: 'A company runs a production Amazon RDS for MariaDB DB instance. The company must be able to restore to any point in time in the last 14 days and must keep one copy of the database from each quarter-end for two years. The company wants the LOWEST backup storage cost. Which TWO actions meet these requirements? (Choose two.)',
    correct: [
      ['Set the backup retention period to 14 days and use point-in-time recovery for the recent restores', 'Automated backups with transaction logs cover any moment in the last 14 days without keeping backups for longer than needed.'],
      ['Take a manual snapshot at each quarter-end and delete each snapshot when it is two years old', 'Manual snapshots are not subject to the retention period, so they stay for the two years until they are deleted.'],
    ],
    wrong: [
      ['Set the backup retention period to 35 days so that the quarter-end copies are covered', 'This pays to store 21 more days of automated backups and still cannot keep copies for two years.'],
      ['Take a manual snapshot every hour and delete each one after 14 days', 'Hourly snapshots store many more backups than needed because point-in-time recovery already covers the last 14 days.'],
      ['Set the backup retention period to 0 and rely on the manual snapshots only', 'This disables automated backups, so restores to any point in time in the last 14 days are no longer possible.'],
    ],
    slots: [2, 4],
    evidence: [
      'rds-backup-retention|You can set the backup retention period of a DB instance to between 0 and 35 days.',
      'rds-snapshot-create|Unlike automated backups, manual snapshots aren\'t subject to the backup retention period.',
      'rds-pitr|RDS uploads transaction logs for DB instances to Amazon S3 every five minutes.',
    ],
  }),
  mc({
    id: 'retention-records-008',
    building: 'retention-records',
    bullets: ['4.3-K4', '4.3-S1'],
    d: 2,
    stem: 'A company stores Amazon RDS backups in an AWS Backup vault. Some recovery points have their retention set to "Always", but the policy requires keeping backups for one year. The company is about to lock the vault in compliance mode, as its policy requires, and wants to avoid unintended storage costs. What should the company do FIRST?',
    correct: ['Change the retention of those recovery points to one year before the grace time of the vault lock ends', 'During grace time the lock can still be changed, whereas after it expires recovery points set to Always are kept forever.'],
    wrong: [
      ['Lock the vault now and change the retention of the recovery points after the lock is active', 'After the grace time expires the lock is immutable, so the recovery points could no longer be altered or deleted.'],
      ['Lock the vault in governance mode instead and let administrators delete the backups later', 'The policy requires compliance mode, which governance mode does not provide, and switching modes would not correct the retention setting.'],
      ['Delete the backup plan after the vault is locked so that no new recovery points are created', 'Deleting the plan stops new backups but does not remove the existing recovery points or change their retention.'],
    ],
    slot: 1,
    evidence: [
      'backup-vault-lock|For example, ensure there are no recovery points with a retention period set to "Always"—once the grace time expires, these recovery points will be retained forever and cannot be altered or deleted.',
      'backup-vault-lock|During grace time, you can still remove the vault lock and change the lock configuration.',
    ],
  }),
  mc({
    id: 'retention-records-009',
    building: 'retention-records',
    bullets: ['4.3-K4'],
    d: 2,
    tags: ['mock-reserve'],
    stem: 'A team runs a short-lived test Amazon Aurora MySQL-Compatible cluster and wants to keep automated backup storage as low as possible. Which backup retention setting meets this requirement?',
    correct: ['Set the backup retention period of the DB cluster to the minimum of one day', 'Aurora accepts a backup retention period from 1 to 35 days, so one day is the shortest period it keeps.'],
    wrong: [
      ['Set the backup retention period of the DB cluster to 0 days', 'For an Aurora DB cluster the retention period is 1 to 35 days, so a value of 0 is not available.'],
      ['Set the backup retention period of the DB cluster to 35 days', 'This keeps the longest period of backups, which is the opposite of the lowest storage.'],
      ['Leave the retention as it is and delete the automated backups by hand each night', 'This relies on manual work and the automated backups are still created for the retention period.'],
    ],
    slot: 0,
    evidence: [
      'aurora-backups|You can specify a backup retention period from 1–35 days when you create or modify or restore a DB cluster.',
    ],
  }),
];

export default questions;
