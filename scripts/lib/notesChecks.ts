import type {
  Block,
  BuildingNotes,
  ConfusePair,
  GlossaryTerm,
  RenamedService,
  Source,
} from '../../src/content/types.ts';
import type { Building } from '../../src/data/types.ts';
import { AWS_HOSTS, AZURE_HOST } from './contentChecks.ts';

export interface NotesInput {
  buildings: readonly Building[];
  bulletIds: ReadonlySet<string>;
  sources: readonly Source[];
  notes: readonly BuildingNotes[];
  glossary: readonly GlossaryTerm[];
  confuse: readonly ConfusePair[];
  renamed: readonly RenamedService[];
  /** Districts whose notes are required (all five when Step 2 is complete). */
  scope: ReadonlySet<string>;
  /** Defaults to REQUIRED_PAIRS; tests override it. */
  requiredPairs?: typeof REQUIRED_PAIRS;
}

/** Pairs the brief requires. `members` must each be named by an item of the pair. */
export const REQUIRED_PAIRS: { id: string; home: string; members: string[] }[] = [
  { id: 'sg-vs-nacl', home: 'gatehouse', members: ['Security group', 'Network ACL'] },
  { id: 'gateway-vs-interface-endpoints', home: 'customs-house', members: ['Gateway endpoint', 'Interface endpoint'] },
  { id: 'alb-nlb-gwlb', home: 'express-interchange', members: ['Application Load Balancer', 'Network Load Balancer', 'Gateway Load Balancer'] },
  { id: 's3-storage-classes', home: 'cold-cellar', members: ['S3 Standard', 'S3 Intelligent-Tiering', 'S3 Standard-IA', 'S3 One Zone-IA', 'S3 Glacier Instant Retrieval', 'S3 Glacier Flexible Retrieval', 'S3 Glacier Deep Archive'] },
  { id: 'multi-az-vs-read-replicas', home: 'read-replica-annex', members: ['Multi-AZ', 'Read replica'] },
  { id: 'aurora-vs-rds', home: 'database-registry', members: ['Amazon Aurora', 'Amazon RDS'] },
  { id: 'sqs-sns-eventbridge-kinesis', home: 'message-quay', members: ['Amazon SQS', 'Amazon SNS', 'Amazon EventBridge', 'Amazon Kinesis Data Streams'] },
  { id: 'kds-vs-firehose', home: 'streaming-canal', members: ['Kinesis Data Streams', 'Amazon Data Firehose'] },
  { id: 'savings-plans-ri-spot', home: 'counting-house', members: ['Savings Plans', 'Reserved Instances', 'Spot Instances'] },
  { id: 'ebs-efs-fsx', home: 'storage-market', members: ['Amazon EBS', 'Amazon EFS', 'Amazon FSx'] },
  { id: 'instance-store-vs-ebs', home: 'block-warehouse', members: ['Instance store', 'Amazon EBS'] },
  { id: 'kms-vs-cloudhsm', home: 'key-vault', members: ['AWS KMS', 'AWS CloudHSM'] },
  { id: 'sse-s3-kms-c', home: 'key-vault', members: ['SSE-S3', 'SSE-KMS', 'SSE-C'] },
  { id: 'shield-vs-waf', home: 'watchtower', members: ['AWS Shield Standard', 'AWS Shield Advanced', 'AWS WAF'] },
  { id: 'direct-connect-vs-vpn', home: 'transit-tariff', members: ['AWS Direct Connect', 'AWS Site-to-Site VPN'] },
  { id: 'cloudfront-vs-global-accelerator', home: 'edge-link-terminal', members: ['Amazon CloudFront', 'AWS Global Accelerator'] },
  { id: 'nat-gateway-vs-instance', home: 'nat-toll', members: ['NAT gateway', 'NAT instance'] },
  { id: 'peering-tgw-privatelink', home: 'grid-planning-office', members: ['VPC peering', 'AWS Transit Gateway', 'AWS PrivateLink'] },
  { id: 'secrets-manager-vs-parameter-store', home: 'wardens-lodge', members: ['AWS Secrets Manager', 'Parameter Store'] },
  { id: 'iam-roles-vs-resource-policies', home: 'embassy-row', members: ['IAM role', 'Resource-based policy'] },
  { id: 'scp-boundary-identity', home: 'embassy-row', members: ['Service control policy', 'Permissions boundary', 'Identity-based policy'] },
  { id: 'dr-strategies', home: 'disaster-bunker', members: ['Backup and restore', 'Pilot light', 'Warm standby', 'Multi-site active/active'] },
];

const NUMBER_WORDS = /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|hundred|thousand|million|billion)\b/gi;
// Digits inside identifiers are not claims: EC2, S3, gp3, m5, Route 53, IPv4, SSE-S3, "1.1-K4", Layer 4/7, CIDR examples in code.
const IDENT_WITH_DIGITS = /\b[A-Za-z]+\d+[A-Za-z0-9.-]*\b|\b\d+\.\d+-[KS]\d+\b|\bRoute 53\b|\bLayer \d(?:\/\d)?\b|\bIPv[46]\b|\bSAA-C03\b|\bSAML 2\.0\b|\bOAuth 2\.0\b|\bHTTP\/[123](?:\.\d)?\b/g;
const PRICE = /[$€£]\s?\d|\b\d+(?:\.\d+)?\s?(?:cents?|USD|dollars?)\b|\bUS\$/i;
const STATUS_WORDS = /\b(preview|deprecated|deprecation|retired|end[- ]of[- ](?:life|support)|sunset|discontinued)\b/i;
const TERM_REF = /\{\{term:([a-z0-9-]+)(?:\|[^}]*)?\}\}/g;
const RENAME_REF = /\{\{rename:([a-z0-9-]+)\}\}/g;

export function normalise(s: string): string {
  return s
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Numeric tokens (digits and number words) in prose that are not part of an identifier. */
export function numberTokens(text: string): string[] {
  const cleaned = text.replace(TERM_REF, ' ').replace(RENAME_REF, ' ').replace(/`[^`]*`/g, ' ').replace(IDENT_WITH_DIGITS, ' ');
  const digits = cleaned.match(/\d+(?:,\d{3})*(?:\.\d+)?/g) ?? [];
  const words = cleaned.match(NUMBER_WORDS) ?? [];
  return [...digits, ...words.map((w) => w.toLowerCase())];
}

export function allBlocks(n: BuildingNotes): { where: string; block: Block }[] {
  const out: { where: string; block: Block }[] = [];
  n.overview.forEach((b, i) => out.push({ where: `overview[${i}]`, block: b }));
  n.beyondProject?.forEach((b, i) => out.push({ where: `beyondProject[${i}]`, block: b }));
  n.bullets.forEach((bn) => {
    bn.concepts.forEach((b, i) => out.push({ where: `${bn.id}.concepts[${i}]`, block: b }));
    bn.design.forEach((b, i) => out.push({ where: `${bn.id}.design[${i}]`, block: b }));
  });
  n.cues.forEach((c, i) => out.push({ where: `cues[${i}]`, block: c.fact }));
  n.examples.forEach((e, i) => e.explanation.forEach((b, j) => out.push({ where: `examples[${i}].explanation[${j}]`, block: b })));
  return out;
}

export function azureBlocks(n: BuildingNotes): { where: string; block: Block }[] {
  return (n.azure ?? []).flatMap((a, i) => [
    { where: `azure[${i}].mapping`, block: a.mapping },
    { where: `azure[${i}].breaks`, block: a.breaks },
  ]);
}

function hostOf(url: string): string {
  return new URL(url).hostname;
}

export function checkSources(sources: readonly Source[]): string[] {
  const p: string[] = [];
  const ids = new Set<string>();
  const urls = new Set<string>();
  for (const s of sources) {
    if (ids.has(s.id)) p.push(`duplicate source id ${s.id}`);
    ids.add(s.id);
    if (urls.has(s.url)) p.push(`duplicate source url ${s.url}`);
    urls.add(s.url);
    let host: string;
    try {
      host = hostOf(s.url);
    } catch {
      p.push(`source ${s.id} has an invalid url`);
      continue;
    }
    if (!s.url.startsWith('https://')) p.push(`source ${s.id} is not https`);
    if (s.kind === 'aws' && !AWS_HOSTS.includes(host)) p.push(`source ${s.id} is kind aws but host is ${host}`);
    if (s.kind === 'azure' && host !== AZURE_HOST) p.push(`source ${s.id} is kind azure but host is ${host}`);
    if (!AWS_HOSTS.includes(host) && host !== AZURE_HOST) p.push(`source ${s.id} is outside the allowed sites (${host})`);
    if (!s.title.trim()) p.push(`source ${s.id} has no title`);
  }
  return p;
}

interface Ctx {
  sources: ReadonlyMap<string, Source>;
  terms: ReadonlySet<string>;
  renamedOld: readonly string[];
  renameIds: ReadonlySet<string>;
}

function checkBlock(where: string, block: Block, ctx: Ctx, kind: 'aws' | 'azure-note', used: { sources: Set<string>; terms: Set<string> }): string[] {
  const p: string[] = [];
  if (!block.text.trim()) p.push(`${where}: empty text`);
  if (block.sources.length === 0) p.push(`${where}: no source`);
  const kinds = new Set<string>();
  for (const id of block.sources) {
    const s = ctx.sources.get(id);
    if (!s) {
      p.push(`${where}: unknown source "${id}"`);
      continue;
    }
    used.sources.add(id);
    kinds.add(s.kind);
    if (kind === 'aws' && s.kind !== 'aws') p.push(`${where}: Microsoft Learn source "${id}" is only allowed in Azure notes`);
  }
  if (kind === 'azure-note') {
    if (!kinds.has('azure')) p.push(`${where}: Azure note needs a Microsoft Learn source for the Azure side`);
    if (!kinds.has('aws')) p.push(`${where}: Azure note needs an AWS docs source for the AWS side`);
  }
  if ((block.quotes ?? []).length === 0) p.push(`${where}: no verbatim quote; every statement must be grounded in a quote from its source`);
  for (const q of block.quotes ?? []) {
    if (!block.sources.includes(q.src)) p.push(`${where}: quote cites "${q.src}", which is not in the block's sources`);
    if (!ctx.sources.has(q.src)) p.push(`${where}: quote cites unknown source "${q.src}"`);
    if (q.text.trim().length < 12) p.push(`${where}: quote is too short to verify`);
  }
  // Number guard.
  const quoted = normalise((block.quotes ?? []).map((q) => q.text).join(' \n '));
  const allow = new Set((block.allow ?? []).map((a) => a.toLowerCase()));
  for (const tok of numberTokens(block.text)) {
    if (allow.has(tok)) continue;
    const t = normalise(tok);
    if (!quoted.includes(t)) p.push(`${where}: number "${tok}" is not backed by a quote from a cited page`);
  }
  if (PRICE.test(block.text)) p.push(`${where}: states a price; compare costs only in relative terms`);
  if (STATUS_WORDS.test(block.text) && !block.status) p.push(`${where}: mentions preview/deprecated/retired but has no status label`);
  if (block.status && !(block.quotes ?? []).some((q) => /preview|deprecat|retire|end of (life|support)|no longer|sunset|discontinu|not available to new/i.test(q.text))) {
    p.push(`${where}: status "${block.status}" needs a quote showing AWS says so`);
  }
  for (const m of block.text.matchAll(TERM_REF)) {
    const id = m[1] as string;
    if (!ctx.terms.has(id)) p.push(`${where}: unknown glossary term "${id}"`);
    used.terms.add(id);
  }
  for (const m of block.text.matchAll(RENAME_REF)) {
    if (!ctx.renameIds.has(m[1] as string)) p.push(`${where}: unknown rename "${m[1] as string}"`);
  }
  const withoutTokens = block.text.replace(RENAME_REF, ' ');
  for (const old of ctx.renamedOld) {
    if (new RegExp(`\\b${old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(withoutTokens)) {
      p.push(`${where}: uses "${old}" directly; write {{rename:id}} so both names show with sources`);
    }
  }
  return p;
}

export function checkNotes(input: NotesInput): string[] {
  const p: string[] = [];
  const { buildings, bulletIds, notes } = input;
  const sources = new Map(input.sources.map((s) => [s.id, s]));
  const terms = new Set(input.glossary.map((g) => g.id));
  const used = { sources: new Set<string>(), terms: new Set<string>() };
  const ctx: Ctx = { sources, terms, renamedOld: input.renamed.map((r) => r.otherName), renameIds: new Set(input.renamed.map((r) => r.id)) };

  p.push(...checkSources(input.sources));

  const byBuilding = new Map<string, BuildingNotes>();
  for (const n of notes) {
    if (byBuilding.has(n.building)) p.push(`duplicate notes for ${n.building}`);
    byBuilding.set(n.building, n);
  }
  for (const n of notes) if (!buildings.some((b) => b.id === n.building)) p.push(`notes for unknown building ${n.building}`);

  for (const b of buildings) {
    const n = byBuilding.get(b.id);
    if (!n) {
      if (input.scope.has(b.district)) p.push(`building ${b.id} has no notes`);
      continue;
    }
    if (n.overview.length === 0) p.push(`${b.id}: no overview`);
    // Bullet coverage.
    const covered = new Set(n.bullets.map((x) => x.id));
    for (const id of b.bullets) {
      if (!covered.has(id)) p.push(`${b.id}: bullet ${id} has no notes`);
    }
    for (const bn of n.bullets) {
      if (!b.bullets.includes(bn.id)) p.push(`${b.id}: notes cover ${bn.id}, which is not one of its bullets`);
      if (!bulletIds.has(bn.id)) p.push(`${b.id}: unknown bullet ${bn.id}`);
      if (bn.concepts.length === 0) p.push(`${b.id}/${bn.id}: no key concepts`);
      if (bn.design.length === 0) p.push(`${b.id}/${bn.id}: no design usage`);
    }
    if (b.task && n.cues.length === 0) p.push(`${b.id}: no scenario cues`);
    if (b.portfolio && (!n.beyondProject || n.beyondProject.length === 0)) p.push(`${b.id}: portfolio building needs a "What SAA adds beyond your project" section`);
    if (!b.portfolio && n.beyondProject?.length) p.push(`${b.id}: has a beyond-your-project section but no portfolio tag`);
    const azTagged = (b.azure ?? []).length > 0;
    if (azTagged && (!n.azure || n.azure.length === 0)) p.push(`${b.id}: Azure-tagged building needs a "Coming from Azure" section`);
    if (!azTagged && n.azure?.length) p.push(`${b.id}: has Azure notes but no Azure tag`);
    for (const ex of n.examples) {
      if (ex.illustrative !== true) p.push(`${b.id}: example "${ex.title}" must be marked illustrative`);
      if (ex.explanation.length === 0) p.push(`${b.id}: example "${ex.title}" has no explanation`);
      if (/\b\d{12}\b/.test(ex.code)) p.push(`${b.id}: example "${ex.title}" contains a 12-digit number; use <ACCOUNT_ID>`);
    }
    for (const id of n.confuse) if (!input.confuse.some((c) => c.id === id)) p.push(`${b.id}: references unknown don't-confuse "${id}"`);

    for (const { where, block } of allBlocks(n)) p.push(...checkBlock(`${b.id} ${where}`, block, ctx, 'aws', used));
    for (const { where, block } of azureBlocks(n)) p.push(...checkBlock(`${b.id} ${where}`, block, ctx, 'azure-note', used));
  }

  // Glossary: defined once.
  const labels = new Map<string, string>();
  const ids = new Set<string>();
  for (const g of input.glossary) {
    if (ids.has(g.id)) p.push(`glossary: duplicate id ${g.id}`);
    ids.add(g.id);
    for (const label of [g.term, ...(g.aliases ?? [])]) {
      const k = label.toLowerCase();
      const prev = labels.get(k);
      if (prev) p.push(`glossary: "${label}" is defined twice (${prev} and ${g.id})`);
      labels.set(k, g.id);
    }
    p.push(...checkBlock(`glossary ${g.id}`, g.definition, ctx, 'aws', used));
    if (/\{\{term:/.test(g.definition.text) && new RegExp(`\\{\\{term:${g.id}\\}\\}`).test(g.definition.text)) p.push(`glossary ${g.id}: defined in terms of itself`);
  }

  // Don't confuse.
  const pairIds = new Set<string>();
  for (const c of input.confuse) {
    if (pairIds.has(c.id)) p.push(`don't-confuse: duplicate id ${c.id}`);
    pairIds.add(c.id);
    if (!buildings.some((b) => b.id === c.home)) p.push(`don't-confuse ${c.id}: unknown home building ${c.home}`);
    if (c.items.length < 2) p.push(`don't-confuse ${c.id}: needs at least two items`);
    for (const it of c.items) {
      if (it.points.length === 0) p.push(`don't-confuse ${c.id}/${it.name}: no points`);
      it.points.forEach((b, i) => p.push(...checkBlock(`confuse ${c.id}/${it.name}[${i}]`, b, ctx, 'aws', used)));
    }
    c.choose.forEach((b, i) => p.push(...checkBlock(`confuse ${c.id} choose[${i}]`, b, ctx, 'aws', used)));
    if (c.trap) p.push(...checkBlock(`confuse ${c.id} trap`, c.trap, ctx, 'aws', used));
    const homeNotes = byBuilding.get(c.home);
    if (homeNotes && !homeNotes.confuse.includes(c.id)) p.push(`don't-confuse ${c.id}: home building ${c.home} does not list it`);
  }
  for (const req of input.requiredPairs ?? REQUIRED_PAIRS) {
    const homeDistrict = buildings.find((b) => b.id === req.home)?.district;
    if (!homeDistrict || !input.scope.has(homeDistrict)) continue;
    const pair = input.confuse.find((c) => c.id === req.id);
    if (!pair) {
      p.push(`required don't-confuse pair missing: ${req.id}`);
      continue;
    }
    if (!pair.required) p.push(`don't-confuse ${req.id} must be marked required`);
    if (pair.home !== req.home) p.push(`don't-confuse ${req.id}: home should be ${req.home}, is ${pair.home}`);
    for (const m of req.members) {
      if (!pair.items.some((it) => it.name.toLowerCase().includes(m.toLowerCase()))) p.push(`don't-confuse ${req.id}: missing item "${m}"`);
    }
  }

  // Renamed services.
  for (const r of input.renamed) {
    p.push(...checkBlock(`renamed ${r.id}`, r.relation, { ...ctx, renamedOld: [], renameIds: ctx.renameIds }, 'aws', used));
  }

  // Unused entries are only an error once every district is written (while notes are in progress, the
  // shared files grow ahead of the buildings that use them).
  if (input.scope.size >= 5) {
    for (const g of input.glossary) {
      if (!used.terms.has(g.id)) p.push(`glossary: term "${g.id}" is never used in a note`);
    }
    for (const s of input.sources) {
      if (!used.sources.has(s.id)) p.push(`source ${s.id} is never cited`);
    }
  }
  return p;
}

export interface NotesStats {
  district: string;
  buildings: number;
  words: number;
  sources: number;
  examples: number;
  glossaryTerms: number;
  confusePairs: number;
}

export function wordCount(s: string): number {
  return s.replace(TERM_REF, 'term').split(/\s+/).filter(Boolean).length;
}

export function notesText(n: BuildingNotes): string {
  const parts: string[] = [];
  for (const { block } of [...allBlocks(n), ...azureBlocks(n)]) parts.push(block.text);
  for (const c of n.cues) parts.push(c.phrase, c.points);
  for (const e of n.examples) parts.push(e.title);
  for (const a of n.azure ?? []) parts.push(a.concept, a.aws);
  return parts.join('\n');
}

/** Every block in the content set, with a readable location (used by check:links for quotes). */
export function everyBlock(input: Pick<NotesInput, 'notes' | 'glossary' | 'confuse' | 'renamed'>): { where: string; block: Block }[] {
  const out: { where: string; block: Block }[] = [];
  for (const n of input.notes) {
    for (const x of [...allBlocks(n), ...azureBlocks(n)]) out.push({ where: `${n.building} ${x.where}`, block: x.block });
  }
  for (const g of input.glossary) out.push({ where: `glossary ${g.id}`, block: g.definition });
  for (const c of input.confuse) {
    c.items.forEach((it) => it.points.forEach((b, i) => out.push({ where: `confuse ${c.id}/${it.name}[${i}]`, block: b })));
    c.choose.forEach((b, i) => out.push({ where: `confuse ${c.id} choose[${i}]`, block: b }));
    if (c.trap) out.push({ where: `confuse ${c.id} trap`, block: c.trap });
  }
  for (const r of input.renamed) out.push({ where: `renamed ${r.id}`, block: r.relation });
  return out;
}
