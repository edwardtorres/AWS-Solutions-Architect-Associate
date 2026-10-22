import { dedupeTrace, type Answer, type Evaluation, type Exhibit, type Field, type PuzzleDef, type Rule } from '../types';

/** How often a stage reads the objects. The labels follow the wording of the S3 storage class pages. */
export type Access = 'frequent' | 'monthly' | 'quarterly' | 'twice-yearly' | 'less-than-yearly' | 'unknown';
/** How long a read may wait: immediately, a restore that finishes in minutes, or a restore that takes hours. */
export type Wait = 'ms' | 'minutes' | 'hours';

export interface Phase {
  /** Day (counted from object creation) on which the access pattern of this stage starts. The first stage starts on day 0. */
  from: number;
  access: Access;
  /** Retrieval need. Left out when the scenario does not state one. */
  wait?: Wait;
  /** Whether the data can be re-created if lost. Left out when the scenario does not state it. */
  recreatable?: boolean;
}

export interface ColdCellarScenario {
  /** What the objects are, for the exhibit. */
  objects: string;
  /** Average object size in KB. */
  sizeKB: number;
  phases: Phase[];
  /** Day options for each transition, in order (one list per stage after the first). */
  dayOptions: number[][];
  /** Rotates the class options so the answer position is not predictable. */
  rot?: number;
}

export type StorageClass = 'standard' | 'standard-ia' | 'onezone-ia' | 'intelligent-tiering' | 'glacier-ir' | 'glacier-fr' | 'glacier-da';

const CLASS_LABEL: Record<StorageClass, string> = {
  standard: 'S3 Standard',
  'standard-ia': 'S3 Standard-IA',
  'onezone-ia': 'S3 One Zone-IA',
  'intelligent-tiering': 'S3 Intelligent-Tiering',
  'glacier-ir': 'S3 Glacier Instant Retrieval',
  'glacier-fr': 'S3 Glacier Flexible Retrieval',
  'glacier-da': 'S3 Glacier Deep Archive',
};
const CLASS_ORDER = Object.keys(CLASS_LABEL) as StorageClass[];

/** Minimum storage duration in days, as the storage class pages list it. Classes not listed have none. */
const MIN_DAYS: Partial<Record<StorageClass, number>> = {
  'standard-ia': 30,
  'onezone-ia': 30,
  'glacier-ir': 90,
  'glacier-fr': 90,
  'glacier-da': 180,
};

/** Supported lifecycle transitions (the waterfall). A class missing here has no supported transition out of it. */
const WATERFALL: Record<StorageClass, StorageClass[]> = {
  standard: ['standard-ia', 'intelligent-tiering', 'onezone-ia', 'glacier-ir', 'glacier-fr', 'glacier-da'],
  'standard-ia': ['intelligent-tiering', 'onezone-ia', 'glacier-ir', 'glacier-fr', 'glacier-da'],
  'intelligent-tiering': ['onezone-ia', 'glacier-ir', 'glacier-fr', 'glacier-da'],
  'onezone-ia': ['glacier-fr', 'glacier-da'],
  'glacier-ir': ['glacier-fr', 'glacier-da'],
  'glacier-fr': ['glacier-da'],
  'glacier-da': [],
};
const WATERFALL_RULE: Record<StorageClass, string> = {
  standard: 'wf-standard',
  'standard-ia': 'wf-standard-ia',
  'intelligent-tiering': 'wf-intelligent-tiering',
  'onezone-ia': 'wf-onezone-ia',
  'glacier-ir': 'wf-glacier-ir',
  'glacier-fr': 'wf-glacier-fr',
  'glacier-da': 'wf-glacier-da',
};

const SMALL_KB = 128;

export const rules: Rule[] = [
  {
    id: 'cls-standard',
    text: 'Data read more than once a month, with millisecond access, belongs in S3 Standard.',
    src: 's3-storage-classes',
    quote: 'Frequently accessed data (more than once a month) with millisecond access',
  },
  {
    id: 'cls-standard-ia',
    text: 'Long-lived data read about once a month with millisecond access fits S3 Standard-IA.',
    src: 's3-storage-classes',
    quote: 'Long-lived, infrequently accessed data (once a month) with millisecond access',
  },
  {
    id: 'cls-onezone-recreatable',
    text: 'S3 One Zone-IA is for infrequently read data you can re-create if the Availability Zone fails.',
    src: 's3-storage-classes',
    quote: 'S3 One Zone-IA (ONEZONE_IA) – Use if you can re-create the data if the Availability Zone fails, for object replicas when configuring S3 Cross-Region Replication (CRR).',
  },
  {
    id: 'cls-onezone-cheaper',
    text: 'S3 One Zone-IA keeps data in one Availability Zone and is less expensive than S3 Standard-IA.',
    src: 's3-storage-classes',
    quote: 'Amazon S3 stores the object data in only one Availability Zone, which makes it less expensive than S3 Standard-IA.',
  },
  {
    id: 'cls-onezone-loss',
    text: 'S3 One Zone-IA is not resilient to the loss of the Availability Zone.',
    src: 's3-storage-classes',
    quote: 'Not resilient to the loss of the Availability Zone.',
  },
  {
    id: 'cls-intelligent-tiering',
    text: 'S3 Intelligent-Tiering is the class for data with unknown or changing access patterns.',
    src: 's3-storage-classes',
    quote: 'S3 Intelligent-Tiering is the ideal storage class when you want to optimize storage costs for data that has unknown or changing access patterns.',
  },
  {
    id: 'cls-glacier-ir',
    text: 'S3 Glacier Instant Retrieval serves archive data that is read about once a quarter, or rarely, and must open in milliseconds.',
    src: 's3-glacier-classes',
    quote: "We recommend using S3 Glacier Instant Retrieval for long-term data that's accessed once per quarter and requires millisecond retrieval times.",
  },
  {
    id: 'cls-glacier-ir-rare',
    text: 'Rarely read archive data that still needs millisecond retrieval goes in S3 Glacier Instant Retrieval.',
    src: 's3-storage-classes',
    quote: "S3 Glacier Instant Retrieval (GLACIER_IR) – Use for long-term data that's rarely accessed and requires milliseconds retrieval.",
  },
  {
    id: 'cls-glacier-fr',
    text: 'S3 Glacier Flexible Retrieval is for archives where parts of the data may be needed in minutes; objects must be restored before they can be read.',
    src: 's3-storage-classes',
    quote: 'S3 Glacier Flexible Retrieval (GLACIER) – Use for archives where portions of the data might need to be retrieved in minutes.',
  },
  {
    id: 'cls-glacier-da',
    text: 'S3 Glacier Deep Archive is for archive data read less than once a year when retrieval times of hours are acceptable.',
    src: 's3-storage-classes',
    quote: 'Long-lived archive data accessed less than once a year with retrieval times of hours',
  },
  {
    id: 'restore-first',
    text: 'Objects in S3 Glacier Flexible Retrieval and S3 Glacier Deep Archive must be restored before they can be read, so they never serve milliseconds reads.',
    src: 's3-storage-classes',
    quote: 'You must first restore archived objects before you can access them.',
  },
  {
    id: 'min-duration-ia',
    text: 'S3 Standard-IA and S3 One Zone-IA have a 30-day minimum storage duration; deleting an object earlier still charges for 30 days.',
    src: 's3-storage-classes',
    quote: 'If you delete an object before the end of the 30-day minimum storage duration period, you are charged for 30 days.',
  },
  {
    id: 'min-duration-glacier',
    text: 'S3 Glacier Instant Retrieval and Flexible Retrieval have a 90-day minimum storage duration; S3 Glacier Deep Archive has 180 days.',
    src: 's3-glacier-classes',
    quote: 'S3 Glacier Instant Retrieval 90 days Quarterly Milliseconds No S3 Glacier Flexible Retrieval 90 days Semi-annually Minutes to 12 hours Yes S3 Glacier Deep Archive 180 days Annually 9 to 48 hours Yes',
  },
  {
    id: 'single-rule-min-duration',
    text: 'One Lifecycle rule cannot move an object out of a class before its minimum storage duration has passed, so the next move waits until then.',
    src: 's3-lifecycle-transitions',
    quote: "You can't create a single Lifecycle rule that transitions objects from one storage class to another before the minimum storage duration period has passed.",
  },
  {
    id: 'single-rule-example',
    text: 'Documented example: after 4 days in S3 Glacier Instant Retrieval (90-day minimum), the move to S3 Glacier Deep Archive must come at day 94 or later.',
    src: 's3-lifecycle-transitions',
    quote: 'In this case the S3 Glacier Deep Archive transition must occur after at least 94 days.',
  },
  {
    id: 'waterfall',
    text: 'Lifecycle transitions follow a waterfall: an object only moves toward colder classes, never back up.',
    src: 's3-lifecycle-transitions',
    quote: 'Amazon S3 supports a waterfall model for transitioning between storage classes, as shown in the following diagram.',
  },
  {
    id: 'wf-standard',
    text: 'From S3 Standard a rule can move objects to any other class on this list.',
    src: 's3-lifecycle-transitions',
    quote: 'The S3 Standard storage class to the S3 Standard-IA, S3 Intelligent-Tiering, S3 One Zone-IA, S3 Glacier Instant Retrieval, S3 Glacier Flexible Retrieval, or S3 Glacier Deep Archive storage classes.',
  },
  {
    id: 'wf-standard-ia',
    text: 'From S3 Standard-IA a rule can move objects to S3 Intelligent-Tiering, One Zone-IA or any Glacier class, but not back to S3 Standard.',
    src: 's3-lifecycle-transitions',
    quote: 'The S3 Standard-IA storage class to the S3 Intelligent-Tiering, S3 One Zone-IA, S3 Glacier Instant Retrieval, S3 Glacier Flexible Retrieval, or S3 Glacier Deep Archive storage classes.',
  },
  {
    id: 'wf-intelligent-tiering',
    text: 'From the S3 Intelligent-Tiering Frequent Access or Infrequent Access tier a rule can move objects to S3 One Zone-IA or a Glacier class.',
    src: 's3-lifecycle-transitions',
    quote: 'Frequent Access tier or Infrequent Access tier to S3 One Zone-IA, S3 Glacier Instant Retrieval, S3 Glacier Flexible Retrieval, or S3 Glacier Deep Archive storage classes.',
  },
  {
    id: 'wf-onezone-ia',
    text: 'From S3 One Zone-IA a rule can move objects only to S3 Glacier Flexible Retrieval or S3 Glacier Deep Archive.',
    src: 's3-lifecycle-transitions',
    quote: 'The S3 One Zone-IA storage class to the S3 Glacier Flexible Retrieval or S3 Glacier Deep Archive storage classes.',
  },
  {
    id: 'wf-glacier-ir',
    text: 'From S3 Glacier Instant Retrieval a rule can move objects only to S3 Glacier Flexible Retrieval or S3 Glacier Deep Archive.',
    src: 's3-lifecycle-transitions',
    quote: 'The S3 Glacier Instant Retrieval storage class to the S3 Glacier Flexible Retrieval or S3 Glacier Deep Archive storage classes.',
  },
  {
    id: 'wf-glacier-fr',
    text: 'From S3 Glacier Flexible Retrieval a rule can move objects only to S3 Glacier Deep Archive.',
    src: 's3-lifecycle-transitions',
    quote: 'The S3 Glacier Flexible Retrieval storage class to the S3 Glacier Deep Archive storage class.',
  },
  {
    id: 'wf-glacier-da',
    text: 'A Lifecycle rule cannot move objects out of S3 Glacier Deep Archive to any other class.',
    src: 's3-lifecycle-transitions',
    quote: 'You cannot use an S3 Lifecycle configuration rule to convert the storage class of an object from S3 Glacier Deep Archive to any other storage class.',
  },
  {
    id: 'min-billable-size',
    text: 'For an object smaller than the minimum billable size, S3 Standard-IA and S3 One Zone-IA charge for that minimum size.',
    src: 's3-storage-classes',
    quote: 'If an object is less than 128 KB, Amazon S3 charges you for 128 KB.',
  },
  {
    id: 'ia-larger-objects',
    text: 'S3 Standard-IA and S3 One Zone-IA suit objects larger than the minimum billable size that are kept at least 30 days.',
    src: 's3-storage-classes',
    quote: 'The S3 Standard-IA and S3 One Zone-IA storage classes are suitable for objects larger than 128 KB that you plan to store for at least 30 days.',
  },
];

/** The storage class a stage needs, with the rules that decided it. Null when the rules do not settle it. */
function classFor(p: Phase, sizeKB: number, stages: number): { cls: StorageClass; rules: string[]; note: string } | null {
  const small = sizeKB < SMALL_KB;
  // Objects under 128 KB with a later stage are refused: a newer (2024) Lifecycle default for small objects would change the answer, and it is not encoded.
  if (small && stages > 1) return null;
  if (small) {
    if (p.access === 'frequent') return { cls: 'standard', rules: ['cls-standard'], note: 'Read often with millisecond access: S3 Standard.' };
    if (p.access === 'monthly') return { cls: 'standard', rules: ['min-billable-size', 'ia-larger-objects'], note: 'Objects are under the minimum billable size, so the infrequent-access classes would charge for more than the data: S3 Standard.' };
    return null;
  }
  switch (p.access) {
    case 'frequent':
      return { cls: 'standard', rules: ['cls-standard'], note: 'Read more than once a month with millisecond access: S3 Standard.' };
    case 'monthly':
      if (p.recreatable === undefined) return null;
      return p.recreatable
        ? { cls: 'onezone-ia', rules: ['cls-onezone-recreatable', 'cls-onezone-cheaper'], note: 'Read about monthly and can be re-created: S3 One Zone-IA, the less expensive of the two infrequent-access classes.' }
        : { cls: 'standard-ia', rules: ['cls-standard-ia', 'cls-onezone-loss'], note: 'Read about monthly and cannot be re-created: S3 Standard-IA (S3 One Zone-IA would not survive the loss of its Availability Zone).' };
    case 'unknown':
      return { cls: 'intelligent-tiering', rules: ['cls-intelligent-tiering'], note: 'Unknown or changing access pattern: S3 Intelligent-Tiering.' };
    case 'quarterly':
      if (p.wait === 'ms') return { cls: 'glacier-ir', rules: ['cls-glacier-ir'], note: 'Read about quarterly and must open in milliseconds: S3 Glacier Instant Retrieval.' };
      return null;
    case 'twice-yearly':
      if (p.wait === 'ms') return { cls: 'glacier-ir', rules: ['cls-glacier-ir-rare'], note: 'Rarely read but must open in milliseconds: S3 Glacier Instant Retrieval.' };
      if (p.wait === 'minutes' || p.wait === 'hours') return { cls: 'glacier-fr', rules: ['cls-glacier-fr', 'restore-first'], note: 'Read about twice a year and a restore is acceptable: S3 Glacier Flexible Retrieval (S3 Glacier Deep Archive is for data read less than once a year).' };
      return null;
    case 'less-than-yearly':
      if (p.wait === 'ms') return { cls: 'glacier-ir', rules: ['cls-glacier-ir-rare'], note: 'Rarely read but must open in milliseconds: S3 Glacier Instant Retrieval.' };
      if (p.wait === 'minutes') return { cls: 'glacier-fr', rules: ['cls-glacier-fr', 'restore-first'], note: 'A restore must finish in minutes, which S3 Glacier Deep Archive (hours) cannot meet: S3 Glacier Flexible Retrieval.' };
      if (p.wait === 'hours') return { cls: 'glacier-da', rules: ['cls-glacier-da', 'restore-first'], note: 'Read less than once a year and hours are acceptable: S3 Glacier Deep Archive.' };
      return null;
    default:
      return null;
  }
}

const ACCESS_LABEL: Record<Access, string> = {
  frequent: 'Read many times a month',
  monthly: 'Read about once a month',
  quarterly: 'Read about once a quarter',
  'twice-yearly': 'Read about twice a year',
  'less-than-yearly': 'Read less than once a year',
  unknown: 'Unknown or changing pattern',
};
const WAIT_LABEL: Record<Wait, string> = {
  ms: 'Must open immediately (milliseconds)',
  minutes: 'A restore may take minutes, no longer',
  hours: 'A restore taking hours is fine',
};
const sizeText = (kb: number) => (kb >= 1024 ? `${kb / 1024} MB` : `${kb} KB`);

function rotated(s: ColdCellarScenario): StorageClass[] {
  const r = (((s.rot ?? 0) % CLASS_ORDER.length) + CLASS_ORDER.length) % CLASS_ORDER.length;
  return [...CLASS_ORDER.slice(r), ...CLASS_ORDER.slice(0, r)];
}

function fields(s: ColdCellarScenario): Field[] {
  const out: Field[] = [];
  const opts = rotated(s).map((c) => ({ id: c, label: CLASS_LABEL[c] }));
  s.phases.forEach((_, i) => {
    out.push({
      id: `class-${i + 1}`,
      prompt: `${i === 0 ? 'Storage class for stage 1 (set when the objects are uploaded)' : `Storage class for stage ${i + 1}`}: the least expensive class whose documented use case fits`,
      multi: false,
      options: opts,
    });
  });
  s.phases.forEach((_, i) => {
    if (i === 0) return;
    out.push({
      id: `day-${i}`,
      prompt: `Day (counted from object creation) of the one Lifecycle rule that moves objects to stage ${i + 1}: the earliest day that is both at or after the stage start and free of any early-move charge`,
      multi: false,
      options: (s.dayOptions[i - 1] ?? []).map((d) => ({ id: `d${d}`, label: `Day ${d}` })),
    });
  });
  return out;
}

function exhibit(s: ColdCellarScenario): Exhibit {
  const hasWait = s.phases.some((p) => p.wait !== undefined);
  return [
    { title: 'Objects', kind: 'text', text: `${s.objects} Average object size: ${sizeText(s.sizeKB)}. Days are counted from the day each object is created.` },
    {
      title: 'Access over time',
      kind: 'table',
      head: ['Stage', 'Starts on day', 'Access', ...(hasWait ? ['Retrieval need'] : []), 'Can be re-created?'],
      rows: s.phases.map((p, i) => [
        String(i + 1),
        String(p.from),
        ACCESS_LABEL[p.access],
        ...(hasWait ? [p.wait ? WAIT_LABEL[p.wait] : 'Not stated'] : []),
        p.recreatable === undefined ? 'Not stated' : p.recreatable ? 'Yes' : 'No',
      ]),
    },
  ];
}

function evaluate(s: ColdCellarScenario): Evaluation | null {
  const ph = s.phases;
  if (ph.length === 0 || s.sizeKB <= 0) return null;
  if (ph[0]?.from !== 0) return null;
  for (let i = 1; i < ph.length; i++) if ((ph[i]?.from ?? 0) <= (ph[i - 1]?.from ?? 0)) return null;
  if (s.dayOptions.length !== ph.length - 1) return null;

  const answer: Answer = {};
  const trace: Evaluation['trace'] = [];
  const classes: StorageClass[] = [];
  for (let i = 0; i < ph.length; i++) {
    const p = ph[i];
    if (!p) return null;
    const c = classFor(p, s.sizeKB, ph.length);
    if (!c) return null;
    classes.push(c.cls);
    answer[`class-${i + 1}`] = [c.cls];
    for (const r of c.rules) trace.push({ rule: r, note: `Stage ${i + 1}: ${c.note}` });
  }

  let moved = 0; // day the object entered the previous stage
  for (let i = 1; i < ph.length; i++) {
    const from = classes[i - 1];
    const to = classes[i];
    const p = ph[i];
    if (!from || !to || !p) return null;
    if (from === to) return null;
    if (!WATERFALL[from].includes(to)) return null; // lifecycle cannot move objects back up or sideways
    // Older guidance on moving into the infrequent-access classes is not encoded: refuse early moves into them.
    if ((to === 'standard-ia' || to === 'onezone-ia') && p.from < 30) return null;
    trace.push({ rule: WATERFALL_RULE[from], note: `Stage ${i} to ${i + 1}: ${CLASS_LABEL[from]} to ${CLASS_LABEL[to]} is a supported move.` });
    const min = MIN_DAYS[from] ?? 0;
    const earliest = moved + min;
    const day = Math.max(p.from, earliest);
    const options = s.dayOptions[i - 1] ?? [];
    if (!options.includes(day)) return null;
    if (new Set(options).size !== options.length) return null;
    answer[`day-${i}`] = [`d${day}`];
    if (min > 0) {
      trace.push({
        rule: 'single-rule-min-duration',
        note:
          earliest > p.from
            ? `Objects entered ${CLASS_LABEL[from]} on day ${moved} and it has a ${min}-day minimum, so the move waits until day ${earliest} (the stage starts on day ${p.from}).`
            : `${CLASS_LABEL[from]} has a ${min}-day minimum and the objects entered it on day ${moved}; day ${earliest} is not later than the stage start, so the move is on day ${p.from}.`,
      });
    }
    moved = day;
  }
  return { answer, trace };
}

export const def: PuzzleDef<ColdCellarScenario> = {
  type: 'cold-cellar',
  rules,
  fields,
  exhibit,
  evaluate: (s) => dedupeTrace(evaluate(s)),
};
