import { EXPECTED } from './expected.ts';
import type { Building, Road } from '../../src/data/types.ts';
import { buildGraph, impliedEdges, reachableFrom, topologicalOrder } from '../../src/lib/graph.ts';
import { CATEGORY_TO_FAMILY, SERVICE_EXTRA_FAMILIES } from '../../src/data/families.ts';
import type { BannedTerm } from '../banned-terms.ts';

export interface OutlineDoc {
  examCode: string | null;
  domains: {
    id: number;
    name: string;
    weightPercent: number;
    tasks: { id: string; title: string; bullets: { id: string; type: 'knowledge' | 'skill'; text: string }[] }[];
  }[];
  examFacts?: unknown;
}
export interface ServicesDoc {
  inScope: { categories: { name: string; services: string[] }[] };
  outOfScope: { categories: { name: string; services: string[] }[] };
  technologiesAndConcepts: { items: string[] };
  shortServiceNames: { paragraphs: string[]; bullets: string[] };
}
export interface QueueEntry {
  id: string;
  building: string;
  claim: string;
  reason: string;
  status: 'open' | 'resolved';
  added: string;
  /** Phrases that keep a question off an open item (checked in question text). */
  keywords?: string[];
  verdict?: 'confirmed' | 'corrected' | 'dropped';
  resolution?: string;
  resolutionSource?: string;
  resolved?: string;
}
export interface ContentInput {
  outline: OutlineDoc;
  services: ServicesDoc;
  buildings: readonly Building[];
  roads: readonly Road[];
  queue: readonly QueueEntry[];
  banned: readonly BannedTerm[];
}

export const AWS_HOSTS = ['docs.aws.amazon.com', 'aws.amazon.com'];
export const AZURE_HOST = 'learn.microsoft.com';

/** The recorded outline must match the structure the app was designed around. */
export function checkOutline(outline: OutlineDoc): string[] {
  const p: string[] = [];
  if (outline.examCode !== EXPECTED.examCode) p.push(`exam code is ${String(outline.examCode)}, expected ${EXPECTED.examCode}`);
  if (outline.domains.length !== EXPECTED.domains) p.push(`${outline.domains.length} domains, expected ${EXPECTED.domains}`);
  const tasks = outline.domains.map((d) => d.tasks.length);
  if (JSON.stringify(tasks) !== JSON.stringify(EXPECTED.tasksPerDomain)) p.push(`tasks per domain ${JSON.stringify(tasks)}, expected ${JSON.stringify(EXPECTED.tasksPerDomain)}`);
  const weights = outline.domains.map((d) => d.weightPercent);
  if (JSON.stringify(weights) !== JSON.stringify(EXPECTED.weights)) p.push(`weights ${JSON.stringify(weights)}, expected ${JSON.stringify(EXPECTED.weights)}`);
  if (weights.reduce((a, b) => a + b, 0) !== 100) p.push('weights do not sum to 100');
  const seen = new Set<string>();
  for (const d of outline.domains) {
    for (const t of d.tasks) {
      if (!t.id.startsWith(`${d.id}.`)) p.push(`task ${t.id} is in domain ${d.id}`);
      if (t.bullets.length === 0) p.push(`task ${t.id} has no bullets`);
      let k = 0;
      let s = 0;
      for (const b of t.bullets) {
        if (b.type === 'knowledge') k += 1;
        else s += 1;
        const expectedId = `${t.id}-${b.type === 'knowledge' ? 'K' : 'S'}${b.type === 'knowledge' ? k : s}`;
        if (b.id !== expectedId) p.push(`bullet id ${b.id} should be ${expectedId}`);
        if (!b.text.trim()) p.push(`bullet ${b.id} has no text`);
        if (seen.has(b.id)) p.push(`duplicate bullet id ${b.id}`);
        seen.add(b.id);
      }
      if (k === 0 || s === 0) p.push(`task ${t.id} lacks Knowledge or Skills bullets`);
    }
  }
  return p;
}

export function checkServices(services: ServicesDoc): string[] {
  const p: string[] = [];
  if (services.inScope.categories.length === 0) p.push('in-scope list is empty');
  if (services.outOfScope.categories.length === 0) p.push('out-of-scope list is empty');
  if (services.technologiesAndConcepts.items.length === 0) p.push('technologies and concepts list is empty');
  if (services.shortServiceNames.paragraphs.length === 0) p.push('short service names note is missing');
  for (const c of services.inScope.categories) {
    if (!(c.name in CATEGORY_TO_FAMILY)) p.push(`in-scope category "${c.name}" has no family mapping in src/data/families.ts`);
  }
  return p;
}

function urlsIn(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    for (const m of value.matchAll(/https?:\/\/[^\s"')]+/g)) out.push(m[0]);
  } else if (Array.isArray(value)) {
    for (const v of value) urlsIn(v, out);
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) urlsIn(v, out);
  }
  return out;
}

const hostOf = (u: string) => new URL(u).hostname;

/** Buildings, bullets, roads, services, sources. */
export function checkStructure(input: ContentInput): string[] {
  const p: string[] = [];
  const { outline, services, buildings, roads } = input;

  const bulletIds = new Set(outline.domains.flatMap((d) => d.tasks.flatMap((t) => t.bullets.map((b) => b.id))));
  const mapped = new Map<string, string[]>();
  for (const b of buildings) for (const id of b.bullets) mapped.set(id, [...(mapped.get(id) ?? []), b.id]);
  for (const id of bulletIds) {
    const owners = mapped.get(id) ?? [];
    if (owners.length === 0) p.push(`bullet ${id} is not mapped to any building`);
    if (owners.length > 1) p.push(`bullet ${id} is mapped to ${owners.length} buildings (${owners.join(', ')})`);
  }
  for (const id of mapped.keys()) if (!bulletIds.has(id)) p.push(`building references unknown bullet ${id}`);

  const taskIds = new Set(outline.domains.flatMap((d) => d.tasks.map((t) => t.id)));
  const foundations = buildings.filter((b) => b.task === null);
  if (foundations.length > EXPECTED.maxFoundations) p.push(`${foundations.length} Foundation buildings; the limit is ${EXPECTED.maxFoundations}`);
  for (const b of buildings) {
    if (b.task === null) {
      if (b.bullets.length > 0) p.push(`Foundation ${b.id} must not map bullets`);
      if (!b.foundationReason) p.push(`Foundation ${b.id} needs a foundationReason`);
      continue;
    }
    if (!taskIds.has(b.task)) p.push(`building ${b.id} references unknown task ${b.task}`);
    if (b.bullets.length < 2 || b.bullets.length > 5) p.push(`building ${b.id} has ${b.bullets.length} bullets (must be 2-5)`);
    if (b.bullets.some((id) => !id.startsWith(`${b.task}-`))) p.push(`building ${b.id} mixes bullets from different task statements`);
  }

  const inScope = new Set(services.inScope.categories.flatMap((c) => c.services));
  const outOfScope = new Set(services.outOfScope.categories.flatMap((c) => c.services));
  const category = new Map(services.inScope.categories.flatMap((c) => c.services.map((s) => [s, c.name] as const)));
  for (const b of buildings) {
    for (const s of b.services) {
      if (outOfScope.has(s)) p.push(`building ${b.id} names out-of-scope service "${s}"`);
      else if (!inScope.has(s)) p.push(`building ${b.id} names "${s}", which is not in the in-scope list`);
      else {
        const fam = CATEGORY_TO_FAMILY[category.get(s) as string];
        const options = [...(fam ? [fam] : []), ...(SERVICE_EXTRA_FAMILIES[s] ?? [])];
        if (options.length > 0 && !options.some((o) => b.families.includes(o))) p.push(`building ${b.id} lacks a family tag for "${s}"`);
      }
    }
  }

  const ids = buildings.map((b) => b.id);
  const g = buildGraph(ids, roads);
  for (const r of roads) {
    if (!ids.includes(r.from) || !ids.includes(r.to)) p.push(`road ${r.from}>${r.to} references an unknown building`);
    if (!r.reason.trim()) p.push(`road ${r.from}>${r.to} has no reason`);
  }
  if (topologicalOrder(g) === null) p.push('roads contain a cycle');
  const starts = buildings.filter((b) => b.start).map((b) => b.id);
  const reach = reachableFrom(g, starts);
  for (const id of ids) if (!reach.has(id)) p.push(`building ${id} is not reachable from a start building`);
  for (const e of impliedEdges(g, roads)) p.push(`road ${e.from}>${e.to} is already implied by other roads`);

  // Allowed sources: AWS hosts anywhere; Microsoft Learn only as an Azure crosswalk source.
  for (const b of buildings) {
    for (const url of urlsIn({ ...b, azure: undefined })) {
      if (!AWS_HOSTS.includes(hostOf(url))) p.push(`building ${b.id} cites a source outside the allowed list: ${url}`);
    }
    for (const a of b.azure ?? []) {
      if (a.sourceUrl && hostOf(a.sourceUrl) !== AZURE_HOST) p.push(`building ${b.id}: Azure tag "${a.concept}" cites ${a.sourceUrl}; only ${AZURE_HOST} is allowed`);
      if (a.status === 'sourced' && !a.sourceUrl) p.push(`building ${b.id}: Azure tag "${a.concept}" is marked sourced without a URL`);
    }
  }
  return p;
}

/** Disputed terms must never appear in the app's study text. */
export function checkTextHygiene(input: ContentInput): string[] {
  const p: string[] = [];
  for (const b of input.buildings) {
    const text = [
      b.name,
      b.skill,
      b.foundationReason ?? '',
      ...(b.portfolio ?? []).map((x) => x.note),
      ...(b.azure ?? []).flatMap((a) => [a.concept, a.aws]),
    ].join('\n').toLowerCase();
    for (const t of input.banned) {
      if (text.includes(t.term.toLowerCase())) p.push(`building ${b.id} contains banned term "${t.term}" (${t.reason})`);
    }
  }
  for (const r of input.roads) {
    for (const t of input.banned) {
      if (r.reason.toLowerCase().includes(t.term.toLowerCase())) p.push(`road ${r.from}>${r.to} contains banned term "${t.term}"`);
    }
  }
  return p;
}

/** Every unverified Azure tag needs an open queue entry, and queue entries must point at real buildings. */
export function checkQueue(input: ContentInput): string[] {
  const p: string[] = [];
  const ids = new Set(input.buildings.map((b) => b.id));
  const seen = new Set<string>();
  for (const q of input.queue) {
    if (seen.has(q.id)) p.push(`duplicate needs-verification id ${q.id}`);
    seen.add(q.id);
    if (!ids.has(q.building)) p.push(`needs-verification ${q.id} points at unknown building ${q.building}`);
    if (!q.claim || !q.reason) p.push(`needs-verification ${q.id} needs a claim and a reason`);
  }
  for (const b of input.buildings) {
    const open = input.queue.filter((q) => q.building === b.id && q.status === 'open');
    const unverified = (b.azure ?? []).filter((a) => a.status === 'needs-verification');
    if (unverified.length > open.length) p.push(`building ${b.id} has ${unverified.length} unverified Azure tags but ${open.length} open queue entries`);
  }
  return p;
}

export function runOfflineChecks(input: ContentInput): string[] {
  return [
    ...checkOutline(input.outline).map((x) => `outline: ${x}`),
    ...checkServices(input.services).map((x) => `services: ${x}`),
    ...checkStructure(input).map((x) => `structure: ${x}`),
    ...checkTextHygiene(input).map((x) => `text: ${x}`),
    ...checkQueue(input).map((x) => `queue: ${x}`),
  ];
}

/** Readable differences between recorded data and the live guide. */
export function diffLists(label: string, stored: readonly string[], live: readonly string[]): string[] {
  const out: string[] = [];
  const s = new Set(stored);
  const l = new Set(live);
  for (const x of live) if (!s.has(x)) out.push(`${label}: new on live guide: "${x}"`);
  for (const x of stored) if (!l.has(x)) out.push(`${label}: missing from live guide: "${x}"`);
  return out;
}

export function diffOutline(stored: OutlineDoc, live: OutlineDoc): string[] {
  const out: string[] = [];
  if (stored.examCode !== live.examCode) out.push(`exam code changed: ${String(stored.examCode)} -> ${String(live.examCode)}`);
  const flat = (o: OutlineDoc) => o.domains.flatMap((d) => d.tasks.flatMap((t) => t.bullets.map((b) => `${b.id} [${b.type}] ${b.text}`)));
  out.push(...diffLists('bullet', flat(stored), flat(live)));
  const heads = (o: OutlineDoc) => o.domains.flatMap((d) => [`domain ${d.id}: ${d.name} (${d.weightPercent}%)`, ...d.tasks.map((t) => `task ${t.id}: ${t.title}`)]);
  out.push(...diffLists('heading', heads(stored), heads(live)));
  return out;
}

export function diffServices(stored: ServicesDoc, live: ServicesDoc): string[] {
  const cat = (c: { categories: { name: string; services: string[] }[] }) => c.categories.flatMap((x) => x.services.map((s) => `${x.name} / ${s}`));
  return [
    ...diffLists('in-scope', cat(stored.inScope), cat(live.inScope)),
    ...diffLists('out-of-scope', cat(stored.outOfScope), cat(live.outOfScope)),
    ...diffLists('technologies and concepts', stored.technologiesAndConcepts.items, live.technologiesAndConcepts.items),
    ...diffLists('short names note', [...stored.shortServiceNames.paragraphs, ...stored.shortServiceNames.bullets], [...live.shortServiceNames.paragraphs, ...live.shortServiceNames.bullets]),
  ];
}

export interface ShortNamesDoc {
  items: { short: string; full: string }[];
}

export function diffShortNames(stored: ShortNamesDoc, live: ShortNamesDoc): string[] {
  const f = (d: ShortNamesDoc) => d.items.map((i) => `${i.short} = ${i.full}`);
  return diffLists('short names', f(stored), f(live));
}
