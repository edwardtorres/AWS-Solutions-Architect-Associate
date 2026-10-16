import type { Scenario } from '../../src/puzzles/types';
import type { BunkerData } from '../../src/puzzles/disaster-bunker/def';

type Opts = Pick<BunkerData, 'rpo' | 'rto' | 'cost' | 'pool' | 'order'> & { continuousBackups?: boolean };

const sc = (
  n: number,
  building: 'disaster-bunker' | 'backup-archive',
  bullets: string[],
  difficulty: 1 | 2 | 3,
  title: string,
  story: string,
  workload: string,
  o: Opts,
): Scenario<BunkerData> => ({
  id: `disaster-bunker-${String(n).padStart(3, '0')}`,
  type: 'disaster-bunker',
  building,
  bullets,
  difficulty,
  title,
  story,
  data: { workload, ...o },
});

const DB = 'disaster-bunker' as const;
const BA = 'backup-archive' as const;
const K = ['2.2-K4', '2.2-S6'];
const CHEAP = { kind: 'cheapest' } as const;

const scenarios: Scenario<BunkerData>[] = [
  sc(1, DB, K, 1, 'Nightly ledger', 'An internal reporting site is rebuilt from data each day. Losing a few hours of data is fine and a day to rebuild is acceptable. Pick the least costly strategy.',
    'Internal reporting site in one Region; data changes once a day.',
    { rpo: 'hours', rto: '24 hours or less', cost: CHEAP, order: 0, pool: ['pit-backups', 'backup-copy', 'iac-redeploy', 'cont-replication', 'scaled-down-stack', 'all-regions-serve'] }),
  sc(2, DB, K, 1, 'Recipe vault', 'A recipe website must come back in tens of minutes and may lose only minutes of data. Pick the least costly strategy.',
    'Recipe website with a database and an object store.',
    { rpo: 'minutes', rto: 'tens of minutes', cost: CHEAP, order: 1, pool: ['cont-replication', 'data-tier-on', 'app-servers-off', 'pit-backups', 'scaled-down-stack', 'user-routing-policies'] }),
  sc(3, DB, K, 1, 'Ferry tickets', 'A ticketing service needs data loss measured in seconds and recovery in minutes. Pick the least costly strategy.',
    'Ticketing service with web, application and database tiers.',
    { rpo: 'seconds', rto: 'minutes', cost: CHEAP, order: 2, pool: ['scaled-down-stack', 'scale-up-failover', 'reduced-capacity-traffic', 'iac-redeploy', 'app-servers-off', 'multi-region-writes'] }),
  sc(4, DB, K, 1, 'Harbor exchange', 'A trading exchange cannot accept more than near-zero data loss and needs recovery that can be potentially zero. Pick the least costly strategy.',
    'Order-matching platform for customers in several continents.',
    { rpo: 'near zero', rto: 'potentially zero', cost: CHEAP, order: 3, pool: ['all-regions-serve', 'user-routing-policies', 'multi-region-writes', 'pit-backups', 'data-tier-on', 'scale-up-failover'] }),
  sc(5, DB, K, 2, 'Slow data, fast return', 'A booking site can lose hours of data, but customers must be served again within minutes. The team assumes the loose data target means the cheapest strategy.',
    'Booking site where bookings are re-entered from email if needed.',
    { rpo: 'hours', rto: 'minutes', cost: CHEAP, order: 2, pool: ['scaled-down-stack', 'reduced-capacity-traffic', 'scale-up-failover', 'ami-copy', 'dns-failover', 'user-routing-policies'] }),
  sc(6, DB, K, 2, 'No lost entries, no hurry', 'A records service can take a full day to come back but cannot lose data beyond the near-zero class. The relaxed RTO does not lower the strategy.',
    'Records service that audits every entry.',
    { rpo: 'near zero', rto: '24 hours or less', cost: CHEAP, order: 0, pool: ['all-regions-serve', 'multi-region-writes', 'user-routing-policies', 'iac-redeploy', 'app-servers-off', 'scale-up-failover'] }),
  sc(7, DB, K, 2, 'Seconds of loss, day to return', 'A messaging archive may be down for up to 24 hours but may lose only seconds of messages.',
    'Messaging archive with a replicated database.',
    { rpo: 'seconds', rto: '24 hours or less', cost: CHEAP, order: 1, pool: ['scaled-down-stack', 'reduced-capacity-traffic', 'scale-up-failover', 'backup-copy', 'cont-replication', 'all-regions-serve'] }),
  sc(8, DB, K, 2, 'Minutes and minutes', 'A support portal tolerates losing minutes of data and must be back within minutes. Pilot light matches the RPO class, but not the RTO class.',
    'Customer support portal.',
    { rpo: 'minutes', rto: 'minutes', cost: CHEAP, order: 3, pool: ['scaled-down-stack', 'scale-up-failover', 'reduced-capacity-traffic', 'data-tier-on', 'app-servers-off', 'multi-region-writes'] }),
  sc(9, DB, K, 2, 'Data can lag, service cannot', 'A catalog site can lose hours of data but must return within tens of minutes. Backup and restore is too slow for the RTO.',
    'Product catalog with a database that is rebuilt from source feeds.',
    { rpo: 'hours', rto: 'tens of minutes', cost: CHEAP, order: 0, pool: ['data-tier-on', 'app-servers-off', 'dns-failover', 'pit-backups', 'iac-redeploy', 'all-regions-serve', 'scaled-down-stack'] }),
  sc(10, DB, ['2.2-S6', '2.2-K6'], 2, 'Capped at pilot light', 'A payroll service needs minutes of data loss and tens of minutes of recovery. Finance will pay no more than a pilot light costs.',
    'Payroll service with a managed database.',
    { rpo: 'minutes', rto: 'tens of minutes', cost: { kind: 'at-most', strategy: 'pilot-light' }, order: 2, pool: ['cont-replication', 'data-tier-on', 'dns-failover', 'ami-copy', 'scaled-down-stack', 'reduced-capacity-traffic'] }),
  sc(11, DB, ['2.2-S6', '2.2-K6'], 3, 'Cheaper than warm', 'A learning site needs minutes of data loss and tens of minutes of recovery. The budget owner insists on a strategy that costs less than warm standby.',
    'Learning platform with videos in object storage and a database.',
    { rpo: 'minutes', rto: 'tens of minutes', cost: { kind: 'cheaper-than', strategy: 'warm-standby' }, order: 3, pool: ['cont-replication', 'app-servers-off', 'dns-failover', 'scaled-down-stack', 'scale-up-failover', 'pit-backups', 'iac-redeploy'] }),
  sc(12, DB, ['2.2-S6', '2.2-K6'], 3, 'Right on the ceiling', 'A claims system needs data loss in seconds and recovery in minutes. Spend may reach, but not pass, the cost of warm standby.',
    'Claims processing system with web and database tiers.',
    { rpo: 'seconds', rto: 'minutes', cost: { kind: 'at-most', strategy: 'warm-standby' }, order: 1, pool: ['scaled-down-stack', 'reduced-capacity-traffic', 'scale-up-failover', 'all-regions-serve', 'data-tier-on', 'ami-copy'] }),
  sc(13, DB, ['2.2-S6', '2.2-K6'], 3, 'Not worth the complexity', 'A reservations service needs data loss in seconds and recovery in minutes. Leadership wants to avoid the most complex strategy, which must cost less than multi-site active/active.',
    'Reservations service for a single country.',
    { rpo: 'seconds', rto: 'minutes', cost: { kind: 'cheaper-than', strategy: 'active-active' }, order: 0, pool: ['scaled-down-stack', 'scale-up-failover', 'reduced-capacity-traffic', 'user-routing-policies', 'multi-region-writes', 'backup-copy'] }),
  sc(14, DB, K, 3, 'Minutes of loss, zero downtime', 'A checkout service may lose minutes of data, which suggests pilot light, but it can never be down: the RTO class is potentially zero.',
    'Checkout service for a global audience.',
    { rpo: 'minutes', rto: 'potentially zero', cost: CHEAP, order: 2, pool: ['all-regions-serve', 'user-routing-policies', 'multi-region-writes', 'cont-replication', 'app-servers-off', 'scaled-down-stack'] }),
  sc(15, BA, ['4.1-K5', '4.1-S6'], 1, 'Archive with a spending cap', 'A document archive may lose hours of data and may take up to 24 hours to restore. Spend may not pass the cost of backup and restore.',
    'Document archive that is copied to storage each night.',
    { rpo: 'hours', rto: '24 hours or less', cost: { kind: 'at-most', strategy: 'backup-restore' }, order: 1, pool: ['pit-backups', 'backup-copy', 'ami-copy', 'data-tier-on', 'app-servers-off', 'cont-replication'] }),
  sc(16, BA, ['4.1-K5', '4.1-S6'], 2, 'Backups are already continuous', 'A file service already takes automated, continuous point-in-time backups. The business accepts an RPO in hours and an RTO of 24 hours or less. Pick the backup-focused strategy it needs.',
    'File service in one Region with backups copied to a second Region.',
    { rpo: 'hours', rto: '24 hours or less', cost: CHEAP, continuousBackups: true, order: 3, pool: ['pit-backups', 'backup-copy', 'iac-redeploy', 'dns-failover', 'scaled-down-stack', 'user-routing-policies'] }),
];

export default scenarios;
