import type { Building } from '../../src/data/types.ts';
import type { ConfusePair, Source } from '../../src/content/types.ts';
import { DEBRIEF_SIZE, type Lab, type LabStep } from '../../src/labs/types.ts';
import { SERVICE_PLANS, planOf, type ServicePlan } from '../../content/labs/services.ts';
import type { BannedTerm } from '../banned-terms.ts';

export const LAB_COUNT = 14;
export const MIN_STEP_QUOTE = 25;

/** Resources that bill while they exist. A step that creates one needs a cost badge; the lab needs a matching cost entry and a cleanup step. */
export const BILLABLE: { name: string; text: RegExp; resource: RegExp; templateTypes: RegExp }[] = [
  { name: 'NAT gateway', text: /\bNAT gateways?\b/i, resource: /NAT gateway/i, templateTypes: /AWS::EC2::NatGateway/ },
  { name: 'load balancer', text: /\b(load balancers?|ALB|NLB|GWLB)\b/i, resource: /load balancer/i, templateTypes: /AWS::ElasticLoadBalancing(V2)?::LoadBalancer/ },
  { name: 'RDS DB instance', text: /\b(RDS|DB) (DB )?instances?\b|\bAurora (DB )?(cluster|instance)s?\b/i, resource: /(RDS|DB) instance|Aurora/i, templateTypes: /AWS::RDS::DB(Instance|Cluster)/ },
  { name: 'interface endpoint', text: /\binterface (VPC )?endpoints?\b|\bPrivateLink\b/i, resource: /interface (VPC )?endpoint/i, templateTypes: /VpcEndpointType:\s*Interface/ },
  { name: 'Transit Gateway', text: /\bTransit Gateway\b/i, resource: /Transit Gateway/i, templateTypes: /AWS::EC2::TransitGateway/ },
  { name: 'Elastic IP', text: /\bElastic IPs?\b/i, resource: /Elastic IP/i, templateTypes: /AWS::EC2::EIP\b/ },
  { name: 'customer managed KMS key', text: /\bcustomer managed (KMS )?keys?\b|\bKMS key\b/i, resource: /(customer managed|KMS) key/i, templateTypes: /AWS::KMS::Key/ },
  { name: 'EC2 instance', text: /\b(EC2|Spot) instances?\b|\bAuto Scaling groups?\b|\blaunch (an |the )?instances?\b/i, resource: /EC2 instance|Auto Scaling/i, templateTypes: /AWS::EC2::Instance|AWS::AutoScaling::AutoScalingGroup/ },
  { name: 'Config recorder', text: /\bAWS Config\b.*\b(recorder|record)\b/i, resource: /Config/i, templateTypes: /AWS::Config::ConfigurationRecorder/ },
];

/** Dollar amounts, currency words and per-unit rate phrasing. Labs never state prices. */
const PRICE = /[$€£]\s?\d|\b(USD|EUR|GBP)\b|\b\d+(\.\d+)?\s?(dollars?|cents?)\b|\bper (hour|GB|month|request|million)\b[^.]{0,40}\d/i;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const TWELVE = /(?<![\d.])\d{12}(?![\d.])/;
const ARN_DIGITS = /arn:aws[a-z-]*:[a-z0-9-]*:[a-z0-9-]*:\d{12}:/;
const KEY = /\b(AKIA|ASIA)[A-Z0-9]{16}\b/;

export interface LabCheckInput {
  labs: readonly Lab[];
  /** Every lab, when `labs` is a subset (a writer's partial run), so prerequisites resolve. */
  allLabs?: readonly Lab[];
  templates: ReadonlyMap<string, string>;
  sources: readonly Source[];
  buildings: readonly Building[];
  bulletIds: ReadonlySet<string>;
  confuse: readonly ConfusePair[];
  banned: readonly BannedTerm[];
  /** Live, non-reserve questions: their bullets, for the debrief. */
  debriefPool: readonly { bullets: readonly string[] }[];
  /** Require the full set (14 labs). A partial run passes false. */
  complete?: boolean;
}

export function labTextOf(lab: Lab): string {
  const out: string[] = [lab.title, lab.goal];
  for (const c of lab.costs) out.push(c.resource, c.basis, c.quote);
  for (const s of lab.steps) out.push(s.text, s.quote, s.alt ?? '', s.checkpoint ?? '', s.code ?? '');
  for (const t of lab.traps) out.push(t.text, t.quote);
  return out.join('\n');
}

const kindOf = (s: LabStep) => s.kind ?? 'do';

export function checkLabs(input: LabCheckInput): string[] {
  const p: string[] = [];
  const srcById = new Map(input.sources.map((s) => [s.id, s]));
  const buildingById = new Map(input.buildings.map((b) => [b.id, b]));
  const everyLab = input.allLabs ?? input.labs;
  const labIds = new Set(everyLab.map((l) => l.id));
  const confuseIds = new Set(input.confuse.map((c) => c.id));
  const usedTemplates = new Set<string>();
  const seenN = new Set<number>();

  if (input.complete !== false && input.labs.length !== LAB_COUNT) p.push(`expected ${LAB_COUNT} labs, found ${input.labs.length}`);

  for (const lab of input.labs) {
    const w = `lab ${lab.id}`;
    if (!/^lab-\d{2}-[a-z0-9-]+$/.test(lab.id)) p.push(`${w}: id must look like lab-NN-slug`);
    else if (Number(lab.id.slice(4, 6)) !== lab.n) p.push(`${w}: id number does not match n=${lab.n}`);
    if (seenN.has(lab.n)) p.push(`${w}: duplicate lab number ${lab.n}`);
    seenN.add(lab.n);
    if (!lab.title.trim() || !lab.goal.trim()) p.push(`${w}: title and goal are required`);
    if (!(lab.minutes >= 10 && lab.minutes <= 240)) p.push(`${w}: minutes must be between 10 and 240`);
    if (lab.buildings.length === 0) p.push(`${w}: maps no building`);
    for (const b of lab.buildings) if (!buildingById.has(b)) p.push(`${w}: unknown building ${b}`);
    if (lab.bullets.length === 0) p.push(`${w}: maps no outline bullet`);
    const mapped = new Set(lab.buildings.flatMap((b) => buildingById.get(b)?.bullets ?? []));
    for (const b of lab.bullets) {
      if (!input.bulletIds.has(b)) p.push(`${w}: unknown bullet ${b}`);
      else if (!mapped.has(b)) p.push(`${w}: bullet ${b} does not belong to a mapped building`);
    }
    if (new Set(lab.bullets).size !== lab.bullets.length) p.push(`${w}: duplicate bullets`);
    const pool = input.debriefPool.filter((q) => q.bullets.some((b) => lab.bullets.includes(b))).length;
    if (pool < DEBRIEF_SIZE * 3) p.push(`${w}: only ${pool} live questions cover its bullets (need ${DEBRIEF_SIZE * 3} so debriefs can vary)`);

    for (const n of lab.needs) {
      const other = everyLab.find((l) => l.id === n);
      if (!labIds.has(n)) p.push(`${w}: unknown prerequisite ${n}`);
      else if (other && other.n >= lab.n) p.push(`${w}: prerequisite ${n} must come earlier in the recommended order`);
    }

    // Services and plan.
    if (lab.services.length === 0) p.push(`${w}: lists no services (the plan badge is derived from them)`);
    for (const s of lab.services) if (!(s in SERVICE_PLANS)) p.push(`${w}: service "${s}" is not in content/labs/services.ts`);
    const plan = planOf(lab.services);
    if (plan === 'free' && lab.costs.length > 0) p.push(`${w}: derived plan is "Free plan compatible" but the lab has billable resources; mark those services unconfirmed or remove the resources`);

    // Costs.
    const costIds = new Set<string>();
    for (const c of lab.costs) {
      const cw = `${w} cost ${c.id}`;
      if (costIds.has(c.id)) p.push(`${cw}: duplicate id`);
      costIds.add(c.id);
      if (!c.resource.trim() || !c.basis.trim()) p.push(`${cw}: resource and basis are required`);
      p.push(...checkCite(cw, c.src, c.quote, srcById));
    }
    for (const b of BILLABLE) {
      const created = lab.steps.filter((s) => kindOf(s) === 'do' && b.text.test(`${s.text} ${s.code ?? ''}`));
      const inTemplate = (lab.templates ?? []).some((t) => b.templateTypes.test(input.templates.get(t) ?? ''));
      if ((created.length > 0 || inTemplate) && !lab.costs.some((c) => b.resource.test(c.resource))) p.push(`${w}: uses ${b.name} but has no "bills while running" cost entry for it`);
      for (const s of created) if ((s.costs ?? []).length === 0) p.push(`${w} step ${s.id}: mentions ${b.name} but carries no cost badge`);
    }

    // Steps.
    const ids = new Set<string>();
    lab.steps.forEach((s, i) => {
      const sw = `${w} step ${s.id}`;
      if (ids.has(s.id)) p.push(`${sw}: duplicate step id`);
      ids.add(s.id);
      if (!s.text.trim()) p.push(`${sw}: empty text`);
      p.push(...checkCite(sw, s.src, s.quote, srcById));
      for (const c of s.costs ?? []) if (!costIds.has(c)) p.push(`${sw}: unknown cost ${c}`);
      if (kindOf(s) === 'check' && !s.checkpoint) p.push(`${sw}: a check step needs a checkpoint`);
      if (s.optional && (s.costs ?? []).length > 0 && !s.alt) p.push(`${sw}: an optional billable step needs a free or cheaper alternative (alt)`);
      if (!s.optional && (s.costs ?? []).length > 0 && kindOf(s) === 'do') p.push(`${sw}: a billable step should be optional (mark optional and give an alt) unless the lab cannot work without it`);
      if (/^\s*(click|choose|select)\b.*>.*>/i.test(s.text)) p.push(`${sw}: link to the section instead of a long click path`);
      if (s.checkpoint && /\b\d{3,}\b/.test(s.checkpoint)) p.push(`${sw}: a checkpoint should not depend on a specific number`);
      void i;
    });
    const kinds = lab.steps.map(kindOf);
    const firstCleanup = kinds.indexOf('cleanup');
    const lastVerify = kinds.lastIndexOf('verify');
    if (firstCleanup === -1) p.push(`${w}: no cleanup checklist (steps of kind "cleanup")`);
    if (lastVerify === -1) p.push(`${w}: no verification step (kind "verify")`);
    if (firstCleanup !== -1 && kinds.slice(firstCleanup).some((k) => k === 'do' || k === 'check')) p.push(`${w}: cleanup and verification must come last`);
    if (lastVerify !== -1 && lastVerify !== kinds.length - 1) p.push(`${w}: the verification step must be the last step`);
    for (const c of lab.costs) {
      if (!lab.steps.some((s) => kindOf(s) === 'cleanup' && (s.costs ?? []).includes(c.id))) p.push(`${w}: cost ${c.id} is not removed by any cleanup step (list it in the step's costs)`);
    }
    for (const s of lab.steps.filter((x) => kindOf(x) === 'verify')) if (!s.code && !s.checkpoint) p.push(`${w} step ${s.id}: a verify step needs a CloudShell command (code) or a console checkpoint`);
    if ((lab.templates ?? []).length > 0 && !lab.steps.some((s) => kindOf(s) === 'cleanup' && /delete[^.]*stack/i.test(s.text))) p.push(`${w}: has a template but no cleanup step that deletes the stack`);

    // Traps.
    for (const t of lab.traps) {
      const tw = `${w} trap ${t.pair}`;
      if (!confuseIds.has(t.pair)) p.push(`${tw}: unknown don't-confuse pair`);
      if (!ids.has(t.step)) p.push(`${tw}: unknown step ${t.step}`);
      p.push(...checkCite(tw, t.src, t.quote, srcById));
    }

    // Templates.
    for (const t of lab.templates ?? []) {
      usedTemplates.add(t);
      if (!input.templates.has(t)) p.push(`${w}: template ${t} not found in content/labs/templates`);
    }

    // Text rules.
    const text = labTextOf(lab);
    if (PRICE.test(text)) p.push(`${w}: states a price or rate (${PRICE.exec(text)?.[0]}); labs never state prices`);
    for (const [re, name] of [[EMAIL, 'an email address'], [TWELVE, 'a 12-digit number (account ID?)'], [ARN_DIGITS, 'an ARN with an account number'], [KEY, 'an access key id']] as const) {
      const m = re.exec(text);
      if (m) p.push(`${w}: contains ${name}: ${m[0]}`);
    }
    for (const b of input.banned) if (text.toLowerCase().includes(b.term.toLowerCase())) p.push(`${w}: banned term "${b.term}": ${b.reason}`);
  }

  for (const [name, body] of input.templates) {
    if (input.complete !== false && !usedTemplates.has(name)) p.push(`template ${name}: not used by any lab`);
    for (const [re, label] of [[EMAIL, 'an email address'], [TWELVE, 'a 12-digit number'], [ARN_DIGITS, 'an ARN with an account number'], [KEY, 'an access key id']] as const) {
      const m = re.exec(body);
      if (m) p.push(`template ${name}: contains ${label}: ${m[0]}`);
    }
  }

  // Services table consistency.
  for (const [name, sp] of Object.entries(SERVICE_PLANS)) p.push(...checkServicePlan(name, sp, srcById));
  return p;
}

function checkServicePlan(name: string, sp: ServicePlan, srcById: ReadonlyMap<string, Source>): string[] {
  const p: string[] = [];
  if (sp.evidence === 'docs-table' || sp.evidence === 'rule') {
    if (!sp.src || !sp.quote) p.push(`services ${name}: evidence "${sp.evidence}" needs src and quote`);
    else p.push(...checkCite(`services ${name}`, sp.src, sp.quote, srcById));
  }
  if (sp.plan === 'unconfirmed' && sp.evidence !== 'none') p.push(`services ${name}: an unconfirmed service must have evidence "none"`);
  if (sp.plan !== 'unconfirmed' && sp.evidence === 'none') p.push(`services ${name}: ${sp.plan} needs published evidence`);
  return p;
}

function checkCite(where: string, src: string, quote: string, srcById: ReadonlyMap<string, Source>): string[] {
  const p: string[] = [];
  const s = srcById.get(src);
  if (!s) p.push(`${where}: unknown source ${src}`);
  else {
    if (s.kind !== 'aws') p.push(`${where}: source ${src} is not an AWS page`);
    if (!/^https:\/\/(docs\.aws\.amazon\.com|aws\.amazon\.com)\//.test(s.url)) p.push(`${where}: source ${src} is outside the allowed sites`);
  }
  if (quote.trim().length < MIN_STEP_QUOTE) p.push(`${where}: quote is too short to check`);
  return p;
}
