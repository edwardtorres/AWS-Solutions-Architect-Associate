import { dedupeTrace, type Evaluation, type Exhibit, type Field, type PuzzleDef, type Rule } from '../types';

export type Term = 'short' | 'unknown' | 'long';
export type Interruption = 'cannot' | 'tolerates';
export type Commit = 'none' | 'usd-per-hour' | 'instance-config' | 'either';
export type Change = 'family' | 'size' | 'os' | 'tenancy' | 'region' | 'fargate' | 'lambda';
export type Capacity = 'none' | 'az';
export type Exchanges = 'accept' | 'avoid';
export type Goal = 'none' | 'largest-saving' | 'most-flexible';

/** A workload profile. Only documented properties are encoded; `extras` holds any other stated requirement and always causes a refusal. */
export interface PurchaseScenario {
  /** How long the workload will run: weeks (short), not known, or at least a year of steady use (long). */
  term: Term;
  interruption: Interruption;
  /** What the owner is willing to commit to: nothing, an amount of usage in USD per hour, a specific instance configuration, or either. */
  commit: Commit;
  /** What will vary over the term (instance family, size, operating system, tenancy, Region, or use of AWS Fargate / AWS Lambda). */
  changes: Change[];
  /** A need to reserve capacity in one Availability Zone. */
  capacity: Capacity;
  /** Whether the team accepts exchanging or modifying commitments by hand. */
  exchanges: Exchanges;
  /** What the team asks of the plan when several fit: no stated preference, the largest saving for a commitment that stays in one family and Region, or the most flexibility. */
  goal: Goal;
  /** Anything else the profile states; no rule covers it, so the case is refused. */
  extras: string[];
}

export type Model = 'on-demand' | 'spot' | 'ri' | 'compute-sp' | 'ec2-sp';

const MODEL_LABEL: Record<Model, string> = {
  'on-demand': 'On-Demand Instances',
  spot: 'Spot Instances',
  ri: 'Reserved Instances',
  'compute-sp': 'Compute Savings Plans',
  'ec2-sp': 'EC2 Instance Savings Plans',
};

const rules: Rule[] = [
  {
    id: 'od-no-commitment',
    text: 'On-Demand Instances are paid for by the second with no long-term commitment.',
    src: 'ec2-on-demand',
    quote: 'With On-Demand Instances, you pay for compute capacity by the second with no long-term commitments.',
  },
  {
    id: 'od-short-term',
    text: 'On-Demand Instances suit short-term, irregular workloads that cannot be interrupted.',
    src: 'ec2-on-demand',
    quote: 'We recommend that you use On-Demand Instances for applications with short-term, irregular workloads that cannot be interrupted.',
  },
  {
    id: 'spot-interruptible',
    text: 'Spot Instances use spare capacity and suit applications that can be interrupted and are flexible about when they run.',
    src: 'ec2-spot',
    quote: 'Spot Instances are a cost-effective choice if you can be flexible about when your applications run and if your applications can be interrupted.',
  },
  {
    id: 'spot-notice',
    text: 'A Spot Instance can be reclaimed; the interruption comes with a two-minute notice.',
    src: 'ec2-spot',
    quote: 'Amazon EC2 provides a Spot Instance interruption notice, which gives the instance a two-minute warning before it is interrupted.',
  },
  {
    id: 'sp-term-usage',
    text: 'Savings Plans are a commitment to a consistent amount of usage, in USD per hour, for 1 or 3 years.',
    src: 'ec2-purchasing',
    quote: 'Savings Plans – Reduce your Amazon EC2 costs by making a commitment to a consistent amount of usage, in USD per hour, for a term of 1 or 3 years.',
  },
  {
    id: 'ri-term-config',
    text: 'Reserved Instances are a commitment to a consistent instance configuration, including instance type and Region, for 1 or 3 years.',
    src: 'ec2-purchasing',
    quote: 'Reserved Instances – Reduce your Amazon EC2 costs by making a commitment to a consistent instance configuration, including instance type and Region, for a term of 1 or 3 years.',
  },
  {
    id: 'capacity-needs-ri',
    text: 'A capacity reservation in an Availability Zone comes from Reserved Instances or Capacity Reservations.',
    src: 'ec2-purchasing',
    quote: 'If you require a capacity reservation, purchase Reserved Instances or Capacity Reservations for a specific Availability Zone.',
  },
  {
    id: 'ri-zonal-capacity',
    text: 'A zonal Reserved Instance reserves capacity in its Availability Zone.',
    src: 'ec2-ri-scope',
    quote: 'A zonal Reserved Instance reserves capacity in the specified Availability Zone.',
  },
  {
    id: 'ri-regional-no-capacity',
    text: 'A regional Reserved Instance does not reserve capacity.',
    src: 'ec2-ri-scope',
    quote: 'A regional Reserved Instance does not reserve capacity.',
  },
  {
    id: 'ri-convertible',
    text: 'A Convertible Reserved Instance can be exchanged for one with a different configuration, including instance family.',
    src: 'ec2-ri-exchange',
    quote: 'You can exchange one or more Convertible Reserved Instances for another Convertible Reserved Instance with a different configuration, including instance family, operating system, and tenancy.',
  },
  {
    id: 'ri-region-exchange',
    text: 'A Convertible Reserved Instance cannot be exchanged for one in a different Region, so a change of Region is not covered by it.',
    src: 'ec2-ri-exchange',
    quote: "You can't exchange a Convertible Reserved Instance for a Convertible Reserved Instance in a different Region.",
  },
  {
    id: 'ri-standard-fixed',
    text: 'A Standard Reserved Instance cannot be exchanged.',
    src: 'ec2-ri-classes',
    quote: 'A Standard Reserved Instance provides a more significant discount than a Convertible Reserved Instance, but you can\'t exchange a Standard Reserved Instance.',
  },
  {
    id: 'compute-sp-flex',
    text: 'Compute Savings Plans apply regardless of instance family, size, Region, operating system or tenancy.',
    src: 'savings-plans-types',
    quote: 'These plans automatically apply to your EC2 instance usage, regardless of instance family (for example, m5, c5, etc.), instance size (for example, c5.large, c5.xlarge, etc.), Region (for example, us-east-1, us-east-2, etc.), operating system (for example, Windows, Linux, etc.), or tenancy (for example, Dedicated, default, Dedicated Host).',
  },
  {
    id: 'compute-sp-serverless',
    text: 'Compute Savings Plans also apply to AWS Fargate and AWS Lambda usage.',
    src: 'savings-plans-types',
    quote: 'They also apply to your Fargate and Lambda usage.',
  },
  {
    id: 'sp-no-exchanges',
    text: 'Savings Plans need no exchanges or modifications to follow a change in compute use.',
    src: 'savings-plans-vs-ri',
    quote: 'Savings Plans give you the flexibility to use the compute option that best suits your needs at low prices, without having to perform exchanges or modifications.',
  },
  {
    id: 'ec2-sp-family-region',
    text: 'EC2 Instance Savings Plans are a commitment to one instance family in one Region.',
    src: 'savings-plans-types',
    quote: 'EC2 Instance Savings Plans provide savings up to 72% off On-Demand, in exchange for a commitment to a specific instance family in a chosen AWS Region (for example, m5 in Virginia).',
  },
  {
    id: 'ec2-sp-saving',
    text: 'EC2 Instance Savings Plans offer savings of up to 72% off On-Demand in exchange for a commitment to one instance family in one Region.',
    src: 'savings-plans-types',
    quote: 'EC2 Instance Savings Plans provide savings up to 72% off On-Demand, in exchange for a commitment to a specific instance family in a chosen AWS Region (for example, m5 in Virginia).',
  },
  {
    id: 'compute-sp-most-flexible',
    text: 'Compute Savings Plans are the Savings Plans type with the most flexibility.',
    src: 'savings-plans-types',
    quote: 'Compute Savings Plans provide the most flexibility and prices that are up to 66% off of On-Demand rates.',
  },
  {
    id: 'ec2-sp-within-family',
    text: 'EC2 Instance Savings Plans apply regardless of size, operating system and tenancy within the family in the Region.',
    src: 'savings-plans-types',
    quote: 'These plans automatically apply to usage regardless of instance size (for example, m5.xlarge, m5.2xlarge, etc.), OS (for example, Windows, Linux, etc.), and tenancy (Host, Dedicated, Default) within the specified family in a Region.',
  },
];

const CHANGE_LABEL: Record<Change, string> = {
  family: 'instance family',
  size: 'instance size',
  os: 'operating system',
  tenancy: 'tenancy',
  region: 'Region',
  fargate: 'some work moves to AWS Fargate',
  lambda: 'some work moves to AWS Lambda',
};

const TERM_LABEL: Record<Term, string> = {
  short: 'A few weeks',
  unknown: 'Unknown; the project may stop at any time',
  long: 'Steady use around the clock for at least a year',
};

const COMMIT_LABEL: Record<Commit, string> = {
  none: 'No commitment of any kind',
  'usd-per-hour': 'An amount of usage, in USD per hour',
  'instance-config': 'A specific instance configuration',
  either: 'Either kind of commitment is fine',
};

const has = (s: PurchaseScenario, ...c: Change[]) => c.some((x) => s.changes.includes(x));

function out(model: Model, trace: Evaluation['trace']): Evaluation {
  return { answer: { model: [model] }, trace };
}

function evaluate(s: PurchaseScenario): Evaluation | null {
  // Anything the rules do not cover is a refusal.
  if (s.extras.length > 0) return null;

  // No commitment wanted: On-Demand or Spot.
  if (s.commit === 'none') {
    if (s.capacity === 'az') return null; // reserving capacity needs a zonal commitment or a feature that is not an option here
    if (s.interruption === 'tolerates') {
      return out('spot', [
        { rule: 'spot-interruptible', note: 'The work tolerates interruption, so spare capacity fits.' },
        { rule: 'spot-notice', note: 'A reclaimed instance gets a two-minute notice; the work copes with that.' },
      ]);
    }
    return out('on-demand', [
      { rule: 'od-no-commitment', note: 'No commitment is wanted and On-Demand needs none.' },
      ...(s.term === 'short'
        ? [{ rule: 'od-short-term', note: 'The work is short-term, irregular and cannot be interrupted, which rules out Spot.' }]
        : [{ rule: 'spot-interruptible', note: 'Spot Instances need work that can be interrupted, and this work cannot be.' }]),
    ]);
  }

  // A commitment is acceptable: it only makes sense for work that runs for a year or more and cannot be interrupted.
  if (s.term !== 'long') return null;
  if (s.interruption === 'tolerates') return null; // Spot and a commitment both fit; the rules do not break the tie

  if (s.capacity === 'az') {
    if (s.commit === 'usd-per-hour' || s.changes.length > 0) return null;
    return out('ri', [
      { rule: 'ri-term-config', note: 'A fixed configuration for a year or more is a Reserved Instance commitment.' },
      { rule: 'capacity-needs-ri', note: 'Reserving capacity in a specific Availability Zone is done with Reserved Instances or Capacity Reservations.' },
      { rule: 'ri-zonal-capacity', note: 'A zonal Reserved Instance reserves capacity in its Availability Zone.' },
    ]);
  }

  if (has(s, 'fargate', 'lambda', 'region')) {
    if (s.commit === 'instance-config') return null;
    const rule = has(s, 'fargate', 'lambda') ? 'compute-sp-serverless' : 'compute-sp-flex';
    return out('compute-sp', [
      { rule: 'sp-term-usage', note: 'The commitment is an amount of usage in USD per hour for 1 or 3 years.' },
      { rule, note: has(s, 'fargate', 'lambda') ? 'Compute Savings Plans also apply to AWS Fargate and AWS Lambda usage.' : 'Compute Savings Plans apply regardless of Region.' },
      ...(has(s, 'fargate', 'lambda') || s.commit !== 'either' ? [] : [{ rule: 'ri-region-exchange', note: 'A Convertible Reserved Instance cannot be exchanged for one in another Region, so a change of Region is not covered.' }]),
    ]);
  }

  if (has(s, 'family')) {
    if (s.commit === 'usd-per-hour' || (s.commit === 'either' && s.exchanges === 'avoid')) {
      return out('compute-sp', [
        { rule: 'sp-term-usage', note: 'The commitment is an amount of usage in USD per hour for 1 or 3 years.' },
        { rule: 'compute-sp-flex', note: 'Compute Savings Plans apply automatically regardless of instance family.' },
        { rule: 'ec2-sp-family-region', note: 'An EC2 Instance Savings Plan is a commitment to one instance family, so it would not follow the change.' },
        ...(s.exchanges === 'avoid' ? [{ rule: 'sp-no-exchanges', note: 'No exchanges or modifications are needed.' }] : []),
      ]);
    }
    if (s.commit === 'instance-config' && s.exchanges === 'accept') {
      return out('ri', [
        { rule: 'ri-term-config', note: 'The commitment is to an instance configuration.' },
        { rule: 'ri-convertible', note: 'A Convertible Reserved Instance can be exchanged for one with a different instance family, so the commitment can follow the change.' },
      ]);
    }
    return null;
  }

  // Family and Region stay fixed; only size, operating system or tenancy may change.
  const osOrTenancy = has(s, 'os', 'tenancy');
  if (s.commit === 'instance-config' && !osOrTenancy && !has(s, 'size') && s.goal === 'none') {
    return out('ri', [
      { rule: 'ri-term-config', note: 'The commitment is to one instance configuration, including type and Region.' },
      { rule: 'ri-standard-fixed', note: 'Nothing is expected to change, so a Standard Reserved Instance (not exchangeable) is enough.' },
    ]);
  }
  // Family and Region fixed with a USD-per-hour commitment: Compute and EC2 Instance Savings Plans both fit, so the stated goal must decide.
  const planOk = s.commit === 'usd-per-hour' || (s.commit === 'either' && osOrTenancy && s.exchanges === 'avoid');
  if (planOk && s.goal === 'largest-saving') {
    return out('ec2-sp', [
      { rule: 'sp-term-usage', note: 'The commitment is an amount of usage in USD per hour for 1 or 3 years.' },
      { rule: 'ec2-sp-family-region', note: 'The family and Region are fixed, so a plan for that family in that Region is enough.' },
      { rule: 'ec2-sp-saving', note: "The goal is the largest saving for a commitment that stays in one family and Region; this plan's stated maximum is up to 72% off On-Demand, above the up to 66% stated for Compute Savings Plans." },
      { rule: 'compute-sp-most-flexible', note: 'Compute Savings Plans offer the most flexibility, with prices up to 66% off On-Demand.' },
      { rule: 'ec2-sp-within-family', note: 'It still applies across sizes, operating systems and tenancies within the family without exchanges.' },
    ]);
  }
  if (planOk && s.goal === 'most-flexible') {
    return out('compute-sp', [
      { rule: 'sp-term-usage', note: 'The commitment is an amount of usage in USD per hour for 1 or 3 years.' },
      { rule: 'compute-sp-most-flexible', note: 'Flexibility is the stated goal, and Compute Savings Plans offer the most.' },
    ]);
  }
  return null;
}

function fields(): Field[] {
  return [
    {
      id: 'model',
      prompt: 'Which purchasing model does this profile call for?',
      multi: false,
      options: (Object.keys(MODEL_LABEL) as Model[]).map((id) => ({ id, label: MODEL_LABEL[id] })),
    },
  ];
}

function exhibit(s: PurchaseScenario): Exhibit {
  const rows: string[][] = [
    ['How long it runs', TERM_LABEL[s.term]],
    ['Can it be interrupted?', s.interruption === 'tolerates' ? 'Yes; it is fault tolerant and restarts safely' : 'No'],
    ['Willing to commit to', COMMIT_LABEL[s.commit]],
    ['Expected to change', s.changes.length > 0 ? s.changes.map((c) => CHANGE_LABEL[c]).join(', ') : 'Nothing'],
    ['Capacity need', s.capacity === 'az' ? 'Capacity must be reserved in one Availability Zone' : 'None'],
    ['Manual exchanges or modifications', s.exchanges === 'accept' ? 'Acceptable' : 'Should be avoided'],
    ['Goal when several plans fit', s.goal === 'largest-saving' ? 'The largest saving for a commitment that stays in one family and Region' : s.goal === 'most-flexible' ? 'The most flexibility' : 'No stated preference'],
  ];
  for (const x of s.extras) rows.push(['Other requirement', x]);
  return [{ title: 'Workload profile', kind: 'table', head: ['Property', 'Value'], rows }];
}

export const def: PuzzleDef<PurchaseScenario> = { type: 'purchase-planner', rules, fields, exhibit, evaluate: (s) => dedupeTrace(evaluate(s)) };
