import { dedupeTrace, type Evaluation, type Exhibit, type Field, type PuzzleDef, type Rule } from '../types';

/**
 * Disaster Bunker drill. The player picks the cheapest DR strategy whose documented RPO and RTO classes meet both
 * targets, then the building blocks the guidance lists for that strategy. Everything is encoded from the AWS DR pages:
 * the class of each strategy, the cost ordering and the building blocks. No numbers beyond the page wording.
 */

export type StrategyId = 'backup-restore' | 'pilot-light' | 'warm-standby' | 'active-active';

/** Strategies in the order the Well-Architected page lists them: increasing cost and complexity, decreasing RTO and RPO. */
export const STRATEGY_ORDER: readonly StrategyId[] = ['backup-restore', 'pilot-light', 'warm-standby', 'active-active'];

export const STRATEGY_LABEL: Record<StrategyId, string> = {
  'backup-restore': 'Backup and restore',
  'pilot-light': 'Pilot light',
  'warm-standby': 'Warm standby',
  'active-active': 'Multi-site active/active',
};

/** Documented classes, as the page words them. Index in each list = index of the strategy that has that class. */
export const RPO_CLASSES = ['hours', 'minutes', 'seconds', 'near zero'] as const;
export const RTO_CLASSES = ['24 hours or less', 'tens of minutes', 'minutes', 'potentially zero'] as const;

export type BlockId =
  | 'pit-backups'
  | 'backup-copy'
  | 'iac-redeploy'
  | 'ami-copy'
  | 'cont-replication'
  | 'data-tier-on'
  | 'app-servers-off'
  | 'scaled-down-stack'
  | 'scale-up-failover'
  | 'reduced-capacity-traffic'
  | 'all-regions-serve'
  | 'user-routing-policies'
  | 'multi-region-writes';

/** `cheapest`, `at-most` or `cheaper-than` (with a strategy id) are supported; any other kind is refused. */
export interface CostConstraint {
  kind: string;
  strategy?: string;
}

export interface BunkerData {
  workload: string;
  /** Required recovery point, in the documented class wording (a string so a scenario can state an undocumented one). */
  rpo: string;
  /** Required recovery time, in the documented class wording. */
  rto: string;
  cost: CostConstraint;
  /** True when the workload already uses automated or continuous backups with point-in-time recovery. */
  continuousBackups?: boolean;
  /** Building blocks offered in the second question (ids of BLOCKS). */
  pool: string[];
  /** Which order the four strategies are listed in (0 to 3, see PERMS). */
  order: 0 | 1 | 2 | 3;
}

interface Block {
  id: BlockId;
  label: string;
  /** The first strategy (in cost order) whose building blocks include it. */
  addedBy: StrategyId;
  src: string;
  quote: string;
}

const DRO = 'dr-options';
const REL = 'dr-reliability-strategies';

export const BLOCKS: readonly Block[] = [
  {
    id: 'pit-backups',
    label: 'Point-in-time backups of data (for example Amazon EBS or Amazon RDS snapshots)',
    addedBy: 'backup-restore',
    src: DRO,
    quote: 'Backup with point-in-time recovery is available through the following services and resources:',
  },
  {
    id: 'backup-copy',
    label: 'AWS Backup copies of the backups sent to the recovery Region',
    addedBy: 'backup-restore',
    src: DRO,
    quote: 'AWS Backup supports copying backups across Regions, such as to a disaster recovery Region.',
  },
  {
    id: 'iac-redeploy',
    label: 'AWS CloudFormation templates that redeploy the infrastructure at recovery time',
    addedBy: 'backup-restore',
    src: DRO,
    quote:
      'AWS CloudFormation provides Infrastructure as Code (IaC), and enables you to define all of the AWS resources in your workload so you can reliably deploy and redeploy to multiple AWS accounts and AWS Regions.',
  },
  {
    id: 'ami-copy',
    label: 'Amazon Machine Images (AMIs) copied to the recovery Region',
    addedBy: 'backup-restore',
    src: DRO,
    quote: 'An AMI can be copied within or across Regions.',
  },
  {
    id: 'cont-replication',
    label: 'Continuous cross-Region data replication (for example Aurora global database or DynamoDB global tables)',
    addedBy: 'pilot-light',
    src: DRO,
    quote: 'AWS provides continuous, cross-region, asynchronous data replication for data using the following services and resources:',
  },
  {
    id: 'data-tier-on',
    label: 'Databases and object storage always on in the recovery Region',
    addedBy: 'pilot-light',
    src: DRO,
    quote: 'Resources required to support data replication and backup, such as databases and object storage, are always on.',
  },
  {
    id: 'app-servers-off',
    label: 'Application servers prepared but switched off until failover',
    addedBy: 'pilot-light',
    src: DRO,
    quote:
      'Unlike the backup and restore approach, your core infrastructure is always available and you always have the option to quickly provision a full scale production environment by switching on and scaling out your application servers.',
  },
  {
    id: 'scaled-down-stack',
    label: 'A scaled-down but fully functional copy of production, always running in the recovery Region',
    addedBy: 'warm-standby',
    src: DRO,
    quote: 'The warm standby approach involves ensuring that there is a scaled down, but fully functional, copy of your production environment in another Region.',
  },
  {
    id: 'scale-up-failover',
    label: 'A failover that only needs scaling up, because everything is already deployed and running',
    addedBy: 'warm-standby',
    src: REL,
    quote:
      'Pilot light will require you to turn on servers, possibly deploy additional (non-core) infrastructure, and scale up, while warm standby only requires you to scale up (everything is already deployed and running).',
  },
  {
    id: 'reduced-capacity-traffic',
    label: 'A recovery Region that can serve traffic at reduced capacity immediately',
    addedBy: 'warm-standby',
    src: DRO,
    quote: 'The distinction is that pilot light cannot process requests without additional action taken first, whereas warm standby can handle traffic (at reduced capacity levels) immediately.',
  },
  {
    id: 'all-regions-serve',
    label: 'The workload running and serving traffic in every Region it is deployed to',
    addedBy: 'active-active',
    src: DRO,
    quote: 'Multi-site active/active serves traffic from all regions to which it is deployed, whereas hot standby serves traffic only from a single region, and the other Region(s) are only used for disaster recovery.',
  },
  {
    id: 'user-routing-policies',
    label: 'Routing policies (Route 53 or Global Accelerator) that decide which users reach which active Region',
    addedBy: 'active-active',
    src: DRO,
    quote: 'For the active/active strategy here, both of these services also enable the definition of policies that determine which users go to which active regional endpoint.',
  },
  {
    id: 'multi-region-writes',
    label: 'A design for data consistency when writes can land in each active Region',
    addedBy: 'active-active',
    src: DRO,
    quote: 'The difference with active/active is designing how data consistency with writes to each active Region are handled.',
  },
];

const BLOCK_BY_ID = new Map<string, Block>(BLOCKS.map((b) => [b.id, b]));

export const rules: Rule[] = [
  {
    id: 'cost-order',
    text: 'The four strategies are listed in increasing order of cost and complexity, and decreasing order of RTO and RPO: backup and restore, pilot light, warm standby, multi-site active/active.',
    src: REL,
    quote: 'They are listed in increasing order of cost and complexity, and decreasing order of RTO and RPO.',
  },
  {
    id: 'class-backup-restore',
    text: 'Backup and restore: RPO in hours, RTO in 24 hours or less.',
    src: REL,
    quote: 'Backup and restore (RPO in hours, RTO in 24 hours or less): Back up your data and applications into the recovery Region.',
  },
  {
    id: 'class-pilot-light',
    text: 'Pilot light: RPO in minutes, RTO in tens of minutes.',
    src: REL,
    quote: 'Pilot light (RPO in minutes, RTO in tens of minutes): Provision a copy of your core workload infrastructure in the recovery Region.',
  },
  {
    id: 'class-warm-standby',
    text: 'Warm standby: RPO in seconds, RTO in minutes.',
    src: REL,
    quote: 'Warm standby (RPO in seconds, RTO in minutes): Maintain a scaled-down but fully functional version of your workload always running in the recovery Region.',
  },
  {
    id: 'class-active-active',
    text: 'Multi-site active/active: RPO near zero, RTO potentially zero.',
    src: REL,
    quote: 'Multi-Region (multi-site) active-active (RPO near zero, RTO potentially zero): Your workload is deployed to, and actively serving traffic from, multiple AWS Regions.',
  },
  {
    id: 'tradeoff',
    text: 'A strategy more stringent than it needs to be incurs unnecessary costs, so the pick is the least costly strategy whose RPO and RTO classes both meet the targets.',
    src: REL,
    quote: 'You should avoid implementing a strategy that is more stringent than it needs to be, as this incurs unnecessary costs.',
  },
  {
    id: 'pitr-backups',
    text: 'Automated or continuous backups with point-in-time recovery can lower the backup-and-restore RPO to as low as 5 minutes in some cases, so an RPO in minutes with such backups is not settled by the class table (refused).',
    src: REL,
    quote: 'Using automated or continuous backups will permit point in time recovery (PITR), which can lower RPO to as low as 5 minutes in some cases.',
  },
  {
    id: 'blocks-cumulative-warm',
    text: 'Warm standby also uses the services of backup and restore and pilot light, so the blocks of cheaper strategies are already in place and are not what a strategy adds.',
    src: DRO,
    quote: 'All of the AWS services covered under backup and restore and pilot light are also used in warm standby for data backup, data replication, active/passive traffic routing, and deployment of infrastructure including EC2 instances.',
  },
  {
    id: 'blocks-cumulative-active',
    text: 'Active/active also uses the services of the three cheaper strategies, so each strategy is asked for what it adds.',
    src: DRO,
    quote:
      'All of the AWS services covered under backup and restore, pilot light, and warm standby also are used here for point-in-time data backup, data replication, active/active traffic routing, and deployment and scaling of infrastructure including EC2 instances.',
  },
  ...BLOCKS.map<Rule>((b) => ({
    id: `block-${b.id}`,
    text: `${STRATEGY_LABEL[b.addedBy]} adds: ${b.label}.`,
    src: b.src,
    quote: b.quote,
  })),
];

export const PERMS: readonly (readonly number[])[] = [
  [0, 1, 2, 3],
  [2, 0, 3, 1],
  [3, 2, 1, 0],
  [1, 3, 0, 2],
];

const costRank = (name: string | undefined): number => STRATEGY_ORDER.indexOf(name as StrategyId);

function fields(s: BunkerData): Field[] {
  const perm = PERMS[s.order] ?? PERMS[0]!;
  return [
    {
      id: 'strategy',
      prompt: 'Which is the least costly DR strategy that meets both targets and the cost constraint?',
      multi: false,
      options: perm.map((i) => {
        const id = STRATEGY_ORDER[i]!;
        return { id, label: STRATEGY_LABEL[id] };
      }),
    },
    {
      id: 'blocks',
      prompt: 'Which building blocks does your chosen strategy add to those of the cheaper strategies? Select all that apply.',
      multi: true,
      options: s.pool.map((id) => ({ id, label: BLOCK_BY_ID.get(id)?.label ?? id })),
    },
  ];
}

function exhibit(s: BunkerData): Exhibit {
  const cost =
    s.cost.kind === 'cheapest'
      ? 'The least costly strategy that meets both targets.'
      : s.cost.kind === 'at-most'
        ? `Spend no more than a ${STRATEGY_LABEL[s.cost.strategy as StrategyId] ?? s.cost.strategy} strategy costs.`
        : s.cost.kind === 'cheaper-than'
          ? `Must cost less than a ${STRATEGY_LABEL[s.cost.strategy as StrategyId] ?? s.cost.strategy} strategy.`
          : `${s.cost.kind}${s.cost.strategy ? `: ${s.cost.strategy}` : ''}`;
  return [
    { title: 'Workload', kind: 'text', text: s.workload },
    {
      title: 'Targets',
      kind: 'table',
      head: ['Measure', 'Requirement'],
      rows: [
        ['Recovery point objective (RPO)', `In ${s.rpo === 'near zero' ? 'the near-zero class' : s.rpo}`],
        ['Recovery time objective (RTO)', s.rto],
        ['Cost constraint', cost],
        ...(s.continuousBackups ? [['Backups', 'Automated, continuous, point-in-time']] : []),
      ],
    },
    {
      title: 'Documented classes (increasing cost)',
      kind: 'table',
      head: ['Strategy', 'RPO', 'RTO'],
      rows: STRATEGY_ORDER.map((id, i) => [STRATEGY_LABEL[id], RPO_CLASSES[i]!, RTO_CLASSES[i]!]),
    },
  ];
}

function evaluate(s: BunkerData): Evaluation | null {
  const rpoRank = (RPO_CLASSES as readonly string[]).indexOf(s.rpo);
  const rtoRank = (RTO_CLASSES as readonly string[]).indexOf(s.rto);
  // A target outside the documented classes falls between them: the rules do not settle it.
  if (rpoRank < 0 || rtoRank < 0) return null;
  // Point-in-time backups can reach an RPO in minutes in some cases, which the class table does not settle.
  if (s.continuousBackups && s.rpo === 'minutes') return null;

  const need = Math.max(rpoRank, rtoRank);
  const strategy = STRATEGY_ORDER[need]!;

  // Cost constraint: only constraints that can be ordered by the documented relative cost are supported.
  if (s.cost.kind === 'at-most' || s.cost.kind === 'cheaper-than') {
    const limit = costRank(s.cost.strategy);
    if (limit < 0) return null;
    const ceiling = s.cost.kind === 'at-most' ? limit : limit - 1;
    if (need > ceiling) return null; // the targets cannot be met within the constraint
  } else if (s.cost.kind !== 'cheapest') {
    return null;
  }

  // Building blocks: every offered id must be known, and the pool must hold the strategy's blocks and distractors.
  const pool: Block[] = [];
  for (const id of s.pool) {
    const b = BLOCK_BY_ID.get(id);
    if (!b) return null;
    pool.push(b);
  }
  if (new Set(s.pool).size !== s.pool.length) return null;
  const right = pool.filter((b) => b.addedBy === strategy);
  if (right.length < 2 || pool.length - right.length < 2) return null;

  const trace: Evaluation['trace'] = [
    { rule: 'cost-order', note: 'Cost and complexity rise in the order backup and restore, pilot light, warm standby, multi-site active/active.' },
    { rule: `class-${STRATEGY_ORDER[rpoRank]}`, note: `An RPO in ${s.rpo} is first met by ${STRATEGY_LABEL[STRATEGY_ORDER[rpoRank]!]}.` },
    { rule: `class-${STRATEGY_ORDER[rtoRank]}`, note: `An RTO of ${s.rto} is first met by ${STRATEGY_LABEL[STRATEGY_ORDER[rtoRank]!]}.` },
    { rule: 'tradeoff', note: `The stricter target decides, and the least costly strategy meeting both is ${STRATEGY_LABEL[strategy]}.` },
  ];
  if (strategy === 'warm-standby') trace.push({ rule: 'blocks-cumulative-warm', note: 'Warm standby also uses the blocks of the two cheaper strategies; only what it adds is selected.' });
  if (strategy === 'active-active') trace.push({ rule: 'blocks-cumulative-active', note: 'Active/active also uses the blocks of the three cheaper strategies; only what it adds is selected.' });
  for (const b of right) trace.push({ rule: `block-${b.id}`, note: `${STRATEGY_LABEL[strategy]} adds: ${b.label}.` });

  return { answer: { strategy: [strategy], blocks: right.map((b) => b.id) }, trace };
}

export const def: PuzzleDef<BunkerData> = { type: 'disaster-bunker', rules, fields, exhibit, evaluate: (s) => dedupeTrace(evaluate(s)) };
