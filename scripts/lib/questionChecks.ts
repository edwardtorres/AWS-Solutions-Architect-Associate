import type { Building } from '../../src/data/types.ts';
import type { ConfusePair, Question, Source } from '../../src/content/types.ts';
import type { BannedTerm } from '../banned-terms.ts';
import type { QueueEntry, ServicesDoc } from './contentChecks.ts';

/** Per-domain share targets in percent (domain id 1 to 4), and the tolerance in points. */
export const DOMAIN_TARGET: Record<string, number> = { citadel: 30, harbor: 26, express: 24, treasury: 20 };
export const SHARE_TOLERANCE = 2;
export const MIN_PER_BULLET = 3;
export const MIN_PER_BUILDING = 8;
export const MIN_PLACEMENT = 8;
export const MAX_MC_POSITION_SHARE = 0.35;
export const MAX_MR_POSITION_SHARE = 0.6;
export const MAX_LONGEST_CORRECT_SHARE = 0.4;
export const MIN_DIFFICULTY_3_SHARE = 0.22;
export const MIN_QUALIFIER_SHARE = 0.6;
export const NEAR_DUPLICATE = 0.7;

export const KNOWN_TAGS = new Set(['placement-eligible', 'mock-reserve']);
export const QUALIFIER = /\b(MOST|LEAST|LOWEST|HIGHEST|FASTEST|BEST|MINIMUM|MINIMAL|SIMPLEST|SHORTEST|LONGEST|MAXIMUM)\b/;
export const NONE_OF_ABOVE = /\b(all|none|both|neither)\s+of\s+the\s+(above|following)\b|\ball of these\b|\bnone of these\b|\bboth (a|b|1|2)\b/i;
/** Questions test design choices, never availability. */
export const STATUS_IN_QUESTION = /no longer (available|open|offered|supported)|closed to new|new customers|deprecated|end of (life|support)|is retired|discontinued/i;

/** Generic names that may follow "AWS" or "Amazon" without being a service. */
export const GENERIC_ALLOW = [
  'AWS Management Console',
  'AWS Region',
  'AWS Regions',
  'AWS Cloud',
  'AWS account',
  'AWS accounts',
  'AWS service',
  'AWS services',
  'AWS managed',
  'AWS Support',
  'AWS Local Zones',
  'AWS Wavelength',
  'AWS Outposts',
  'AWS Marketplace',
  'AWS Free Tier',
  'AWS Nitro',
  'AWS Graviton',
  'AWS owned',
  'AWS Lambda@Edge',
  'Amazon Web Services',
  'Amazon Linux',
  'Amazon Machine Image',
  'Amazon Resource Name',
  'AWS CLI',
  'AWS SDK',
  'AWS Trusted Advisor',
  'AWS Health',
  'AWS Compute Optimizer',
  'AWS Cost Explorer',
  'AWS Budgets',
  'AWS Cost and Usage',
];

/** Out-of-scope names that are not on the official out-of-scope list but must never be answers or appear (see content/exam-era.json). */
export const EXTRA_OUT_OF_SCOPE = ['App Runner', 'Timestream', 'Elastic Disaster Recovery', 'AWS Elastic Disaster Recovery', 'CodeCommit', 'Cloud9', 'AWS Proton'];

export interface EraEntry {
  service: string;
  status: string;
  sentence: string;
  source: string;
  /** Case-insensitive regex that detects the service in question text. */
  patterns: string[];
}

export interface QuestionCheckInput {
  questions: readonly Question[];
  buildings: readonly Building[];
  bulletIds: ReadonlySet<string>;
  sources: readonly Source[];
  confuse: readonly ConfusePair[];
  queue: readonly QueueEntry[];
  banned: readonly BannedTerm[];
  services: ServicesDoc;
  shortNames: readonly { short: string; full: string }[];
  era: readonly EraEntry[];
  /** District ids whose questions are complete and checked for minimums. */
  scope: ReadonlySet<string>;
  /** Source files of the app, for the mock-isolation scan: path to text. */
  appFiles?: readonly { path: string; content: string }[];
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const questionText = (q: Question) => [q.stem, ...q.options.map((o) => o.text)].join('\n');
const fullText = (q: Question) => [q.stem, ...q.options.flatMap((o) => [o.text, o.why])].join('\n');
const isReserve = (q: Question) => q.tags.includes('mock-reserve');
const share = (n: number, d: number) => (d === 0 ? 0 : n / d);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/** Known service names (full, parenthetical and short forms), lower-cased. */
export function knownNames(services: ServicesDoc, shortNames: readonly { short: string; full: string }[]): string[] {
  const names = new Set<string>();
  const add = (n: string) => {
    const t = norm(n);
    if (t) names.add(t);
  };
  for (const c of services.inScope.categories) {
    for (const s of c.services) {
      add(s);
      add(s.replace(/\s*\(.*?\)\s*/g, ' '));
      for (const m of s.matchAll(/\(([^)]+)\)/g)) add(m[1] as string);
    }
  }
  for (const s of shortNames) {
    add(s.short);
    add(s.full);
  }
  for (const g of GENERIC_ALLOW) add(g);
  return [...names];
}

/** Returns the unknown "Amazon X"/"AWS X" candidates in a text. */
export function unknownServiceMentions(text: string, known: readonly string[]): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\b(?:Amazon|AWS)\s+[A-Za-z0-9@][\w@-]*(?:\s+[A-Za-z0-9][\w-]*){0,2}/g)) {
    const words = m[0].split(/\s+/);
    let ok = false;
    for (let n = words.length; n >= 2 && !ok; n -= 1) {
      const cand = norm(words.slice(0, n).join(' '));
      ok = known.some((k) => k === cand || k.startsWith(`${cand} `) || cand.startsWith(`${k} `));
    }
    if (!ok) out.push(m[0]);
  }
  return out;
}

function outOfScopeNames(services: ServicesDoc): string[] {
  const names = new Set<string>(EXTRA_OUT_OF_SCOPE);
  for (const c of services.outOfScope.categories) {
    for (const s of c.services) {
      if (/^all services$/i.test(s)) continue;
      names.add(s.replace(/\s*\(.*?\)\s*/g, ' ').trim());
      for (const m of s.matchAll(/\(([^)]+)\)/g)) names.add(m[1] as string);
    }
  }
  return [...names].filter((n) => n.length > 3);
}

function wordsOf(stem: string): string[] {
  return norm(stem).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter((w) => w.length > 2);
}

function shingles(words: string[]): Set<string> {
  const s = new Set<string>();
  for (let i = 0; i + 2 < words.length; i += 1) s.add(words.slice(i, i + 3).join(' '));
  return s;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter);
}

/** Findings for individual questions. */
export function checkEachQuestion(input: QuestionCheckInput): string[] {
  const p: string[] = [];
  const byBuilding = new Map(input.buildings.map((b) => [b.id, b]));
  const sourceById = new Map(input.sources.map((s) => [s.id, s]));
  const pairIds = new Set(input.confuse.map((c) => c.id));
  const known = knownNames(input.services, input.shortNames);
  const oos = outOfScopeNames(input.services);
  const openQueue = input.queue.filter((e) => e.status === 'open');
  const seen = new Set<string>();

  for (const q of input.questions) {
    const w = `question ${q.id}`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(q.id)) p.push(`${w}: id must be lower-case kebab-case`);
    if (seen.has(q.id)) p.push(`${w}: duplicate id`);
    seen.add(q.id);

    const building = byBuilding.get(q.building);
    if (!building) {
      p.push(`${w}: unknown building ${q.building}`);
      continue;
    }
    if (!q.id.startsWith(`${q.building}-`)) p.push(`${w}: id must start with the building id "${q.building}-"`);
    if (building.task === null) {
      if (q.bullets.length > 0) p.push(`${w}: Foundation questions carry no bullets`);
    } else {
      if (q.bullets.length === 0) p.push(`${w}: needs at least one outline bullet`);
      for (const id of q.bullets) {
        if (!input.bulletIds.has(id)) p.push(`${w}: unknown bullet ${id}`);
        else if (!building.bullets.includes(id)) p.push(`${w}: bullet ${id} does not belong to ${q.building}`);
      }
      if (new Set(q.bullets).size !== q.bullets.length) p.push(`${w}: repeated bullet id`);
    }

    // Shape.
    const correct = q.options.filter((o) => o.correct).length;
    if (q.format === 'mc') {
      if (q.options.length !== 4) p.push(`${w}: multiple choice needs exactly 4 options (has ${q.options.length})`);
      if (correct !== 1 || q.select !== 1) p.push(`${w}: multiple choice needs exactly 1 correct option`);
      if (/\bchoose (two|three|2|3)\b/i.test(q.stem)) p.push(`${w}: multiple choice stem says "Choose two/three"`);
    } else {
      if (q.options.length < 5) p.push(`${w}: multiple response needs 5 or more options (has ${q.options.length})`);
      if (correct < 2 || correct > 3 || q.select !== correct) p.push(`${w}: multiple response needs 2 or 3 correct options and select = ${correct}`);
      const word = correct === 2 ? '(two|2)' : '(three|3)';
      if (!new RegExp(`\\bchoose ${word}\\b`, 'i').test(q.stem)) p.push(`${w}: multiple response stem must say "Choose ${correct === 2 ? 'two' : 'three'}."`);
    }
    if (![1, 2, 3].includes(q.difficulty)) p.push(`${w}: difficulty must be 1, 2 or 3`);
    if (q.stem.trim().length < 40) p.push(`${w}: stem is too short to be a scenario`);

    // Options.
    const texts = new Set<string>();
    for (const [i, o] of q.options.entries()) {
      if (o.text.trim().length < 3) p.push(`${w}: option ${i + 1} has no text`);
      if (o.why.trim().length < 25) p.push(`${w}: option ${i + 1} needs an explanation (which requirement it meets or fails)`);
      const t = norm(o.text);
      if (texts.has(t)) p.push(`${w}: duplicate option text "${o.text.slice(0, 40)}"`);
      texts.add(t);
    }

    // Tags.
    for (const t of q.tags) {
      if (t.startsWith('trap:')) {
        if (!pairIds.has(t.slice(5))) p.push(`${w}: tag ${t} names no don't-confuse pair`);
      } else if (!KNOWN_TAGS.has(t)) p.push(`${w}: unknown tag "${t}"`);
    }
    if (q.tags.includes('mock-reserve') && q.tags.includes('placement-eligible')) p.push(`${w}: a mock-reserve question cannot be placement-eligible`);
    if (q.tags.includes('placement-eligible') && !(building.portfolio && building.portfolio.length > 0)) {
      p.push(`${w}: placement-eligible is only for portfolio-tagged buildings`);
    }

    // Evidence.
    if (q.evidence.length === 0) p.push(`${w}: needs at least one evidence quote from an AWS page`);
    for (const e of q.evidence) {
      const s = sourceById.get(e.src);
      if (!s) p.push(`${w}: evidence cites unknown source ${e.src}`);
      else {
        if (s.kind !== 'aws') p.push(`${w}: evidence source ${e.src} is not an AWS page`);
        if (!/^https:\/\/(docs\.aws\.amazon\.com|aws\.amazon\.com)\//.test(s.url)) p.push(`${w}: evidence source ${e.src} is outside the allowed sites`);
      }
      if (e.text.trim().length < 20) p.push(`${w}: evidence quote is too short`);
    }

    // Forbidden text.
    const asked = questionText(q);
    const all = fullText(q);
    if (NONE_OF_ABOVE.test(asked)) p.push(`${w}: uses an "all/none/both of the above" option`);
    if (STATUS_IN_QUESTION.test(asked)) p.push(`${w}: the stem or an option depends on availability status (explanations may mention it, questions may not)`);
    for (const b of input.banned) if (norm(all).includes(norm(b.term))) p.push(`${w}: contains banned term "${b.term}"`);
    for (const e of openQueue) {
      for (const k of e.keywords ?? []) if (norm(all).includes(norm(k))) p.push(`${w}: touches open needs-verification item ${e.id} ("${k}")`);
    }
    for (const n of oos) {
      const re = new RegExp(`(^|[^A-Za-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9]|$)`);
      if (re.test(asked)) p.push(`${w}: names out-of-scope service "${n}" in the stem or an option`);
    }
    for (const u of unknownServiceMentions(asked, known)) p.push(`${w}: "${u}" is not an in-scope service name or short name`);

    // Exam-era.
    for (const e of input.era) {
      const hit = e.patterns.some((pat) => new RegExp(pat, 'i').test(all));
      if (!hit) continue;
      if (q.era !== e.service) p.push(`${w}: mentions ${e.service} so it needs era: "${e.service}"`);
      if (!q.evidence.some((x) => x.src === e.source)) p.push(`${w}: ${e.service} needs the availability source ${e.source} in its evidence`);
      if (!q.options.some((o) => new RegExp(e.status === 'deprecated' ? 'deprecated' : 'no longer available|closed', 'i').test(o.why))) {
        p.push(`${w}: an explanation must state the current availability of ${e.service}`);
      }
    }
    if (q.era && !input.era.some((e) => e.service === q.era)) p.push(`${w}: era "${q.era}" is not in content/exam-era.json`);
  }
  return p;
}

function domainOf(b: Building | undefined): string | null {
  return b && b.district !== 'square' ? b.district : null;
}

/** Counts, shares, balance and duplicates over the whole bank. */
export function checkBank(input: QuestionCheckInput): string[] {
  const p: string[] = [];
  const byBuilding = new Map(input.buildings.map((b) => [b.id, b]));
  const qs = input.questions.filter((q) => byBuilding.has(q.building));
  const scoped = qs.filter((q) => input.scope.has(byBuilding.get(q.building)?.district ?? ''));

  // Per bullet and per building minimums, for districts in scope.
  const liveByBuilding = new Map<string, Question[]>();
  const reserveByBuilding = new Map<string, Question[]>();
  for (const q of scoped) {
    const m = isReserve(q) ? reserveByBuilding : liveByBuilding;
    m.set(q.building, [...(m.get(q.building) ?? []), q]);
  }
  for (const b of input.buildings) {
    if (!input.scope.has(b.district)) continue;
    const live = liveByBuilding.get(b.id) ?? [];
    if (live.length < MIN_PER_BUILDING) p.push(`building ${b.id} has ${live.length} non-reserve questions (needs ${MIN_PER_BUILDING})`);
    for (const id of b.bullets) {
      const n = live.filter((q) => q.bullets.includes(id)).length;
      if (n < MIN_PER_BULLET) p.push(`bullet ${id} (${b.id}) has ${n} non-reserve questions (needs ${MIN_PER_BULLET})`);
    }
    if (b.portfolio && b.portfolio.length > 0) {
      const n = live.filter((q) => q.tags.includes('placement-eligible')).length;
      if (n < MIN_PLACEMENT) p.push(`portfolio building ${b.id} has ${n} placement-eligible questions (needs ${MIN_PLACEMENT})`);
    }
  }

  // Domain shares, once every domain is in scope.
  const domains = Object.keys(DOMAIN_TARGET);
  if (domains.every((d) => input.scope.has(d))) {
    const dq = scoped.filter((q) => domainOf(byBuilding.get(q.building)) !== null);
    const sets: [string, Question[]][] = [
      ['all questions', dq],
      ['non-reserve questions', dq.filter((q) => !isReserve(q))],
    ];
    for (const [label, list] of sets) {
      for (const d of domains) {
        const n = list.filter((q) => domainOf(byBuilding.get(q.building)) === d).length;
        const s = share(n, list.length) * 100;
        const target = DOMAIN_TARGET[d] as number;
        if (Math.abs(s - target) > SHARE_TOLERANCE) p.push(`domain ${d}: ${s.toFixed(1)}% of ${label} (${n} of ${list.length}), target ${target}% plus or minus ${SHARE_TOLERANCE}`);
      }
    }
    const reserve = dq.filter(isReserve);
    if (reserve.length < 120) p.push(`only ${reserve.length} mock-reserve questions (needs about 130)`);
    for (const d of domains) {
      const n = reserve.filter((q) => domainOf(byBuilding.get(q.building)) === d).length;
      const s = share(n, reserve.length) * 100;
      const target = DOMAIN_TARGET[d] as number;
      if (Math.abs(s - target) > 3) p.push(`mock reserve: domain ${d} is ${s.toFixed(1)}% (${n} of ${reserve.length}), target ${target}%`);
    }
  }

  // Balance, over the bank and per district.
  const groups: [string, Question[]][] = [['bank', scoped]];
  for (const d of input.scope) groups.push([d, scoped.filter((q) => byBuilding.get(q.building)?.district === d)]);
  for (const [label, list] of groups) {
    const mcs = list.filter((q) => q.format === 'mc');
    if (mcs.length >= 20) {
      const counts = [0, 0, 0, 0];
      let longest = 0;
      for (const q of mcs) {
        const i = q.options.findIndex((o) => o.correct);
        if (i >= 0 && i < 4) counts[i] = (counts[i] as number) + 1;
        const max = Math.max(...q.options.map((o) => o.text.length));
        const top = q.options.filter((o) => o.text.length === max);
        if (top.length === 1 && top[0]?.correct) longest += 1;
      }
      counts.forEach((c, i) => {
        if (share(c, mcs.length) > MAX_MC_POSITION_SHARE) p.push(`${label}: the correct answer is option ${i + 1} in ${pct(share(c, mcs.length))} of multiple-choice questions (limit ${pct(MAX_MC_POSITION_SHARE)})`);
      });
      if (share(longest, mcs.length) > MAX_LONGEST_CORRECT_SHARE) p.push(`${label}: the correct option is strictly the longest in ${pct(share(longest, mcs.length))} of multiple-choice questions (limit ${pct(MAX_LONGEST_CORRECT_SHARE)})`);
    }
    const mrs = list.filter((q) => q.format === 'mr');
    if (mrs.length >= 20) {
      for (let i = 0; i < 6; i += 1) {
        const have = mrs.filter((q) => q.options.length > i);
        if (have.length < 10) continue;
        const c = have.filter((q) => q.options[i]?.correct).length;
        if (share(c, have.length) > MAX_MR_POSITION_SHARE) p.push(`${label}: option ${i + 1} is correct in ${pct(share(c, have.length))} of the multiple-response questions that have it (limit ${pct(MAX_MR_POSITION_SHARE)})`);
      }
    }
  }

  // Mix.
  if (input.scope.size === 5 && scoped.length > 100) {
    const d3 = scoped.filter((q) => q.difficulty === 3).length;
    if (share(d3, scoped.length) < MIN_DIFFICULTY_3_SHARE) p.push(`difficulty-3 questions are ${pct(share(d3, scoped.length))} of the bank (needs at least ${pct(MIN_DIFFICULTY_3_SHARE)})`);
    const mr = scoped.filter((q) => q.format === 'mr').length;
    if (share(mr, scoped.length) < 0.15 || share(mr, scoped.length) > 0.25) p.push(`multiple response is ${pct(share(mr, scoped.length))} of the bank (target about 20%)`);
    const withQualifier = scoped.filter((q) => QUALIFIER.test(q.stem)).length;
    if (share(withQualifier, scoped.length) < MIN_QUALIFIER_SHARE) p.push(`only ${pct(share(withQualifier, scoped.length))} of stems carry a qualifier such as MOST or LEAST (needs ${pct(MIN_QUALIFIER_SHARE)})`);
  }

  // Near-duplicate stems.
  const sh = scoped.map((q) => ({ q, s: shingles(wordsOf(q.stem)), t: norm(q.stem) }));
  for (let i = 0; i < sh.length; i += 1) {
    const a = sh[i] as (typeof sh)[number];
    for (let j = i + 1; j < sh.length; j += 1) {
      const c = sh[j] as (typeof sh)[number];
      if (a.t === c.t || jaccard(a.s, c.s) >= NEAR_DUPLICATE) p.push(`near-duplicate stems: ${a.q.id} and ${c.q.id}`);
    }
  }
  return p;
}

/** The mock reserve must stay behind src/questions/pool.ts: only src/questions/* may reach question data. */
export function checkReserveIsolation(files: readonly { path: string; content: string }[]): string[] {
  const p: string[] = [];
  for (const f of files) {
    if (!/^src\/.*\.(ts|tsx)$/.test(f.path)) continue;
    if (f.path.startsWith('src/questions/')) continue;
    if (/content\/questions\//.test(f.content) && !/\.test\.tsx?$/.test(f.path)) p.push(`${f.path} imports question data directly; use src/questions/pool.ts`);
  }
  return p;
}

export function checkQuestions(input: QuestionCheckInput): string[] {
  const problems = [...checkEachQuestion(input), ...checkBank(input)];
  if (input.appFiles) problems.push(...checkReserveIsolation(input.appFiles));
  return problems;
}
