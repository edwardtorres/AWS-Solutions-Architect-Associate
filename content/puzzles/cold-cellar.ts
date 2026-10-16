import type { ColdCellarScenario } from '../../src/puzzles/cold-cellar/def';
import type { Scenario } from '../../src/puzzles/types';

type S = Scenario<ColdCellarScenario>;
const T = 'cold-cellar' as const;

const scenarios: S[] = [
  {
    id: 'puzzle-cold-cellar-001',
    type: T,
    building: 'cold-cellar',
    bullets: ['4.1-K7', '4.1-S5', '4.1-S9'],
    difficulty: 2,
    title: 'Audit logs that cool in two steps',
    story:
      'A payments team writes audit logs to a bucket. The first month they are searched constantly. After that, auditors open them about once a month for a while, and the logs cannot be rebuilt. From day 45 they are read less than once a year, and a restore that takes hours is fine. Choose the classes and the days of the two moves so that no early-move charge applies.',
    data: {
      objects: 'Compressed audit log files.',
      sizeKB: 20480,
      phases: [
        { from: 0, access: 'frequent', wait: 'ms', recreatable: false },
        { from: 30, access: 'monthly', wait: 'ms', recreatable: false },
        { from: 45, access: 'less-than-yearly', wait: 'hours', recreatable: false },
      ],
      dayOptions: [
        [30, 45, 60, 90],
        [45, 60, 90, 120],
      ],
      rot: 0,
    },
  },
  {
    id: 'puzzle-cold-cellar-002',
    type: T,
    building: 'cold-cellar',
    bullets: ['4.1-S8', '4.1-K10'],
    difficulty: 1,
    title: 'Scans nobody opens after a month',
    story:
      'A records office scans paper files into a bucket. Clerks open each scan daily for its first month. After that a scan is read less than once a year, and the office accepts waiting hours for a restore. Choose the classes and the day to move.',
    data: {
      objects: 'Scanned PDF files.',
      sizeKB: 4096,
      phases: [
        { from: 0, access: 'frequent', wait: 'ms' },
        { from: 30, access: 'less-than-yearly', wait: 'hours' },
      ],
      dayOptions: [[7, 30, 60, 90]],
      rot: 3,
    },
  },
  {
    id: 'puzzle-cold-cellar-003',
    type: T,
    building: 'cold-cellar',
    bullets: ['4.1-S8', '4.1-K10'],
    difficulty: 1,
    title: 'Thumbnails that can be redrawn',
    story:
      'A photo site stores generated thumbnails. For the first month they load constantly. Afterwards each thumbnail is fetched about once a month and must still open instantly. If a thumbnail is lost, a job regenerates it from the original photo. Pick the classes and the day of the move.',
    data: {
      objects: 'Generated JPEG thumbnails.',
      sizeKB: 512,
      phases: [
        { from: 0, access: 'frequent', wait: 'ms', recreatable: true },
        { from: 30, access: 'monthly', wait: 'ms', recreatable: true },
      ],
      dayOptions: [[14, 30, 60, 90]],
      rot: 5,
    },
  },
  {
    id: 'puzzle-cold-cellar-004',
    type: T,
    building: 'cold-cellar',
    bullets: ['4.1-S8', '4.1-K10'],
    difficulty: 1,
    title: 'Signed contracts, read monthly',
    story:
      'A legal team stores signed contracts. In the first month they are opened daily. Later someone opens a contract about once a month, instantly, and every copy is the only copy there is. Choose the classes and the day to move.',
    data: {
      objects: 'Signed contract PDFs, the only copy of each.',
      sizeKB: 2048,
      phases: [
        { from: 0, access: 'frequent', wait: 'ms', recreatable: false },
        { from: 30, access: 'monthly', wait: 'ms', recreatable: false },
      ],
      dayOptions: [[14, 21, 30, 45]],
      rot: 1,
    },
  },
  {
    id: 'puzzle-cold-cellar-005',
    type: T,
    building: 'storage-market',
    bullets: ['4.1-K9'],
    difficulty: 1,
    title: 'Uploads with no pattern',
    story:
      'A team receives customer uploads. Some files are read daily for months, others are never read again, and nobody can predict which. Which single class should the objects be uploaded to?',
    data: {
      objects: 'Customer-uploaded data files.',
      sizeKB: 10240,
      phases: [{ from: 0, access: 'unknown' }],
      dayOptions: [],
      rot: 2,
    },
  },
  {
    id: 'puzzle-cold-cellar-006',
    type: T,
    building: 'cold-cellar',
    bullets: ['4.1-K7', '4.1-S5', '4.1-S9'],
    difficulty: 3,
    title: 'Instant archive, then deep archive',
    story:
      'A broadcaster keeps raw footage. For a month editors read it all the time. Then producers pull clips about once a quarter and need them to open instantly. From day 60 the footage is read less than once a year and a restore of hours is acceptable. The second move cannot come before the previous class has had its minimum time. Choose each class and the two days.',
    data: {
      objects: 'Raw video clips.',
      sizeKB: 512000,
      phases: [
        { from: 0, access: 'frequent', wait: 'ms' },
        { from: 30, access: 'quarterly', wait: 'ms' },
        { from: 60, access: 'less-than-yearly', wait: 'hours' },
      ],
      dayOptions: [
        [30, 60, 90],
        [60, 90, 120, 180],
      ],
      rot: 4,
    },
  },
  {
    id: 'puzzle-cold-cellar-007',
    type: T,
    building: 'cold-cellar',
    bullets: ['4.1-K7', '4.1-S9', '4.1-S5'],
    difficulty: 2,
    title: 'Monthly reports, then occasional lookups',
    story:
      'A finance team writes monthly report bundles that cannot be regenerated. For 30 days they are read daily. Then they are read about once a month. From day 50 they are read about twice a year, and a restore must finish within minutes. Choose the classes and the two days.',
    data: {
      objects: 'Report bundles in compressed files.',
      sizeKB: 8192,
      phases: [
        { from: 0, access: 'frequent', wait: 'ms', recreatable: false },
        { from: 30, access: 'monthly', wait: 'ms', recreatable: false },
        { from: 50, access: 'twice-yearly', wait: 'minutes', recreatable: false },
      ],
      dayOptions: [
        [30, 45, 60],
        [50, 60, 90, 120],
      ],
      rot: 6,
    },
  },
  {
    id: 'puzzle-cold-cellar-008',
    type: T,
    building: 'cold-cellar',
    bullets: ['4.1-S8', '4.1-K10'],
    difficulty: 2,
    title: 'Twice a year, hours allowed',
    story:
      'A research lab stores finished experiment data. It is read daily for a month, and afterwards about twice a year. The lab can wait hours for a restore.',
    data: {
      objects: 'Experiment result archives.',
      sizeKB: 102400,
      phases: [
        { from: 0, access: 'frequent', wait: 'ms' },
        { from: 30, access: 'twice-yearly', wait: 'hours' },
      ],
      dayOptions: [[14, 30, 60, 90]],
      rot: 2,
    },
  },
  {
    id: 'puzzle-cold-cellar-009',
    type: T,
    building: 'cold-cellar',
    bullets: ['4.1-S8', '4.1-S9'],
    difficulty: 2,
    title: 'Legal hold: rare, but fast when needed',
    story:
      'A company keeps case files. They are used daily for the first 60 days, then almost never, less than once a year. When a court asks, the files must be back within minutes, and hours would be too slow. Choose the classes and the day of the move.',
    data: {
      objects: 'Case file bundles.',
      sizeKB: 30720,
      phases: [
        { from: 0, access: 'frequent', wait: 'ms' },
        { from: 60, access: 'less-than-yearly', wait: 'minutes' },
      ],
      dayOptions: [[30, 60, 90, 120]],
      rot: 0,
    },
  },
  {
    id: 'puzzle-cold-cellar-010',
    type: T,
    building: 'cold-cellar',
    bullets: ['4.1-S8', '4.1-K10'],
    difficulty: 2,
    title: 'Old scans a doctor opens in a click',
    story:
      'A clinic stores imaging studies. They are read daily for a month. After that a study is opened less than once a year, but when a doctor opens one it has to appear immediately; a restore request is not acceptable. Choose the classes and the day of the move.',
    data: {
      objects: 'Medical imaging studies.',
      sizeKB: 65536,
      phases: [
        { from: 0, access: 'frequent', wait: 'ms' },
        { from: 30, access: 'less-than-yearly', wait: 'ms' },
      ],
      dayOptions: [[14, 21, 30, 60]],
      rot: 6,
    },
  },
  {
    id: 'puzzle-cold-cellar-011',
    type: T,
    building: 'storage-market',
    bullets: ['4.1-K9'],
    difficulty: 2,
    title: 'Tiny files, monthly reads',
    story:
      'An app stores small JSON documents of about 40 KB each. Each is read about once a month and must open instantly. The team is tempted by an infrequent-access class. The objects stay in one class for their whole life. Which class fits?',
    data: {
      objects: 'Small JSON documents.',
      sizeKB: 40,
      phases: [{ from: 0, access: 'monthly', wait: 'ms', recreatable: false }],
      dayOptions: [],
      rot: 4,
    },
  },
  {
    id: 'puzzle-cold-cellar-012',
    type: T,
    building: 'cold-cellar',
    bullets: ['4.1-S8', '4.1-K10'],
    difficulty: 2,
    title: 'Re-creatable, but tiny',
    story:
      'A build system stores small cache files of 100 KB each. They can be rebuilt at any time, and each is read about once a month. These objects are smaller than the 128 KB that the infrequent-access classes bill as a minimum, and the team is tempted to save money with a one-Availability-Zone class. The objects stay in one class for their whole life. Which class fits?',
    data: {
      objects: 'Small build cache files.',
      sizeKB: 100,
      phases: [{ from: 0, access: 'monthly', wait: 'ms', recreatable: true }],
      dayOptions: [],
      rot: 1,
    },
  },
  {
    id: 'puzzle-cold-cellar-013',
    type: T,
    building: 'cold-cellar',
    bullets: ['4.1-K7', '4.1-K10', '4.1-S9'],
    difficulty: 2,
    title: 'Unknown at first, archive later',
    story:
      'A data team lands datasets whose use cannot be predicted during their first six months. After day 180 the data is read less than once a year and a restore taking hours is fine. The pattern is unknown for that whole period. Choose the classes and the day of the move.',
    data: {
      objects: 'Large dataset files.',
      sizeKB: 5120,
      phases: [
        { from: 0, access: 'unknown' },
        { from: 180, access: 'less-than-yearly', wait: 'hours' },
      ],
      dayOptions: [[90, 180, 270, 365]],
      rot: 3,
    },
  },
  {
    id: 'puzzle-cold-cellar-014',
    type: T,
    building: 'cold-cellar',
    bullets: ['4.1-K7', '4.1-S5', '4.1-S9'],
    difficulty: 3,
    title: 'One Zone, then Flexible Retrieval',
    story:
      'A media team stores rendered previews that a job can regenerate. They are read daily for a month, then about once a month. From day 45 they are read about twice a year and a restore must finish within minutes. Choose the classes and the two days, keeping the lifecycle rules supported.',
    data: {
      objects: 'Rendered preview videos.',
      sizeKB: 25600,
      phases: [
        { from: 0, access: 'frequent', wait: 'ms', recreatable: true },
        { from: 30, access: 'monthly', wait: 'ms', recreatable: true },
        { from: 45, access: 'twice-yearly', wait: 'minutes', recreatable: true },
      ],
      dayOptions: [
        [14, 30, 45, 60],
        [45, 60, 75, 120],
      ],
      rot: 5,
    },
  },
  {
    id: 'puzzle-cold-cellar-015',
    type: T,
    building: 'cold-cellar',
    bullets: ['4.1-K7', '4.1-K10', '4.1-S5', '4.1-S9'],
    difficulty: 3,
    title: 'Four stages from hot to frozen',
    story:
      'An insurer stores claim photos that are the only copies. Stage 1: daily reads. Stage 2 from day 30: about once a month. Stage 3 from day 75: about once a quarter, needing instant open. Stage 4 from day 150: less than once a year, hours of restore time are fine. Each class has a minimum storage time before a single rule may move the objects out. Choose four classes and three days.',
    data: {
      objects: 'Claim photo bundles, the only copy of each.',
      sizeKB: 3072,
      phases: [
        { from: 0, access: 'frequent', wait: 'ms', recreatable: false },
        { from: 30, access: 'monthly', wait: 'ms', recreatable: false },
        { from: 75, access: 'quarterly', wait: 'ms', recreatable: false },
        { from: 150, access: 'less-than-yearly', wait: 'hours', recreatable: false },
      ],
      dayOptions: [
        [30, 45, 60],
        [60, 75, 90, 105],
        [150, 165, 180, 240],
      ],
      rot: 2,
    },
  },
  {
    id: 'puzzle-cold-cellar-016',
    type: T,
    building: 'cold-cellar',
    bullets: ['4.1-K7', '4.1-S9'],
    difficulty: 2,
    title: 'Monthly from day one',
    story:
      'A backup tool uploads archives that are read about once a month from the start, instantly, and cannot be re-created. From day 90 they are read less than once a year and a restore of hours is acceptable. Choose the classes and the day of the move.',
    data: {
      objects: 'Backup archives, the only copy of each.',
      sizeKB: 204800,
      phases: [
        { from: 0, access: 'monthly', wait: 'ms', recreatable: false },
        { from: 90, access: 'less-than-yearly', wait: 'hours', recreatable: false },
      ],
      dayOptions: [[30, 60, 90, 120]],
      rot: 0,
    },
  },
  {
    id: 'puzzle-cold-cellar-017',
    type: T,
    building: 'cold-cellar',
    bullets: ['4.1-K7', '4.1-S5', '4.1-S9'],
    difficulty: 3,
    title: 'Irreplaceable, then quarterly',
    story:
      'A survey team keeps scanned land records that exist nowhere else. Daily reads for a month, then about once a month, then from day 40 about once a quarter with instant open. Choose the classes and the two days so that no move comes before the earlier class has had its minimum time.',
    data: {
      objects: 'Scanned land record bundles, the only copy of each.',
      sizeKB: 1024,
      phases: [
        { from: 0, access: 'frequent', wait: 'ms', recreatable: false },
        { from: 30, access: 'monthly', wait: 'ms', recreatable: false },
        { from: 40, access: 'quarterly', wait: 'ms', recreatable: false },
      ],
      dayOptions: [
        [30, 40, 60],
        [40, 60, 90, 120],
      ],
      rot: 6,
    },
  },
];

export default scenarios;
