import { describe, expect, it } from 'vitest';
import type { Block, BuildingNotes, ConfusePair, GlossaryTerm, RenamedService, Source } from '../src/content/types.ts';
import type { Building } from '../src/data/types.ts';
import { checkNotes, normalise, numberTokens, REQUIRED_PAIRS, type NotesInput } from './lib/notesChecks.ts';

const src = (id: string, url: string, kind: 'aws' | 'azure' = 'aws'): Source => ({ id, url, title: id, kind });
const AWS = src('aws1', 'https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html');
const AZ = src('az1', 'https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-overview', 'azure');
const blk = (text: string, extra: Partial<Block> = {}): Block => ({
  text,
  sources: ['aws1'],
  quotes: [{ src: 'aws1', text: 'A sufficiently long verbatim quote from the page.' }],
  ...extra,
});

const building = (extra: Partial<Building> = {}): Building => ({
  id: 'gatehouse', name: 'Gatehouse', skill: 's', district: 'citadel', task: '1.2', bullets: ['1.2-K3', '1.2-S1'],
  families: ['networking-content-delivery'], services: [], island: 'A', ...extra,
});
const notes = (extra: Partial<BuildingNotes> = {}): BuildingNotes => ({
  building: 'gatehouse',
  overview: [blk('A VPC is a virtual network.')],
  bullets: [
    { id: '1.2-K3', concepts: [blk('Ports matter.')], services: ['Amazon VPC'], design: [blk('Use subnets.')] },
    { id: '1.2-S1', concepts: [blk('Design a VPC.')], services: ['Amazon VPC'], design: [blk('Segment tiers.')] },
  ],
  cues: [{ phrase: 'isolate', points: 'private subnet', fact: blk('Private subnets have no route to an internet gateway.') }],
  examples: [], confuse: [], ...extra,
});
const glossary: GlossaryTerm[] = [{ id: 'vpc', term: 'VPC', definition: blk('A virtual network.') }];
const base = (n: BuildingNotes = notes(), over: Partial<NotesInput> = {}): NotesInput => ({
  buildings: [building()],
  bulletIds: new Set(['1.2-K3', '1.2-S1']),
  sources: [AWS, AZ],
  notes: [n],
  glossary: [],
  confuse: [],
  renamed: [],
  scope: new Set(['citadel', 'square', 'harbor', 'express', 'treasury']),
  requiredPairs: [],
  ...over,
});
// Marks every source and term as used so only the targeted problem is reported.
const withUse = (n: BuildingNotes, over: Partial<NotesInput> = {}) => {
  const nn = structuredClone(n);
  nn.overview.push(blk('Cites azure here.', { sources: ['aws1'] }));
  return base(nn, { sources: [AWS], ...over });
};
const run = (n: BuildingNotes, over: Partial<NotesInput> = {}) => checkNotes(withUse(n, over));

describe('notes checks', () => {
  it('passes a clean minimal note set', () => {
    expect(run(notes())).toEqual([]);
  });
  it('fails when a building has no notes (only for districts in scope)', () => {
    expect(checkNotes({ ...base(), notes: [], sources: [] }).join()).toMatch(/has no notes/);
    expect(checkNotes({ ...base(), notes: [], sources: [], scope: new Set() })).toEqual([]);
  });
  it('fails when a bullet lacks coverage or has no design usage', () => {
    const n = notes();
    n.bullets.pop();
    expect(run(n).join()).toMatch(/bullet 1\.2-S1 has no notes/);
    const m = notes();
    (m.bullets[0] as { design: Block[] }).design = [];
    expect(run(m).join()).toMatch(/no design usage/);
  });
  it('fails when a block has no source or cites an unknown one', () => {
    const n = notes();
    n.overview.push({ text: 'Unsourced claim.', sources: [], quotes: [] });
    expect(run(n).join()).toMatch(/no source/);
    const m = notes();
    m.overview.push(blk('Bad id.', { sources: ['nope'] }));
    expect(run(m).join()).toMatch(/unknown source "nope"/);
  });
  it('fails on sources outside the allowed sites, and Learn outside Azure notes', () => {
    const bad = src('bad', 'https://example.com/aws');
    expect(checkNotes({ ...base(), sources: [AWS, bad] }).join()).toMatch(/outside the allowed sites/);
    const n = notes();
    n.overview.push(blk('Azure ref.', { sources: ['az1'] }));
    expect(checkNotes(base(n)).join()).toMatch(/only allowed in Azure notes/);
  });
  it('requires both a Learn and an AWS source in Azure notes', () => {
    const b = building({ azure: [{ concept: 'VNet', aws: 'VPC', sourceUrl: AZ.url, status: 'sourced', background: 'AZ-900' }] });
    const n = notes({ azure: [{ concept: 'VNet', aws: 'VPC', mapping: blk('Maps.', { sources: ['aws1'] }), breaks: blk('Differs.', { sources: ['az1'] }) }] });
    const problems = checkNotes(base(n, { buildings: [b] })).join();
    expect(problems).toMatch(/needs a Microsoft Learn source/);
    expect(problems).toMatch(/needs an AWS docs source/);
  });
  it('requires an Azure section on Azure-tagged buildings and a beyond-project section on portfolio buildings', () => {
    const b = building({
      azure: [{ concept: 'VNet', aws: 'VPC', sourceUrl: AZ.url, status: 'sourced', background: 'AZ-900' }],
      portfolio: [{ tech: 'lambda', note: 'x'.repeat(50) }],
    });
    const problems = run(notes(), { buildings: [b] }).join();
    expect(problems).toMatch(/needs a "Coming from Azure"/);
    expect(problems).toMatch(/needs a "What SAA adds beyond your project"/);
  });
  it('guards numbers, prices and status words', () => {
    const n = notes();
    n.overview.push(blk('The default is 5 subnets.'));
    expect(run(n).join()).toMatch(/number "5"/);
    const ok = notes();
    ok.overview.push(blk('The default is 5 subnets.', { quotes: [{ src: 'aws1', text: 'You can create up to 5 subnets' }] }));
    expect(run(ok)).toEqual([]);
    const price = notes();
    price.overview.push(blk('It costs $5 a month.', { allow: ['5'] }));
    expect(run(price).join()).toMatch(/states a price/);
    const status = notes();
    status.overview.push(blk('This feature is deprecated.'));
    expect(run(status).join()).toMatch(/no status label/);
    const labelled = notes();
    labelled.overview.push(blk('This feature is deprecated.', { status: 'deprecated', quotes: [{ src: 'aws1', text: 'This feature is deprecated and will end' }] }));
    expect(run(labelled)).toEqual([]);
  });
  it('allows digits inside identifiers and flags number words', () => {
    expect(numberTokens('Use EC2, gp3, Route 53, SSE-S3 and IPv4 on Layer 7 for 1.2-K4.')).toEqual([]);
    expect(numberTokens('There are three zones and 10 subnets.')).toEqual(['10', 'three']);
  });
  it('checks glossary: unknown, duplicate and unused terms', () => {
    const n = notes();
    n.overview.push(blk('See {{term:ghost}}.'));
    expect(run(n).join()).toMatch(/unknown glossary term "ghost"/);
    const dup: GlossaryTerm[] = [...glossary, { id: 'vpc2', term: 'vpc', definition: blk('Again.') }];
    expect(run(notes(), { glossary: dup }).join()).toMatch(/defined twice/);
    expect(run(notes(), { glossary }).join()).toMatch(/never used/);
    const used = notes();
    used.overview.push(blk('A {{term:vpc}} is isolated.'));
    expect(run(used, { glossary })).toEqual([]);
  });
  it("checks don't-confuse: missing required pair and missing members", () => {
    const required = REQUIRED_PAIRS.find((r) => r.id === 'sg-vs-nacl');
    expect(required).toBeDefined();
    const problems = run(notes(), { buildings: [building()], confuse: [], requiredPairs: REQUIRED_PAIRS }).join();
    expect(problems).toMatch(/required don't-confuse pair missing: sg-vs-nacl/);
    const pair: ConfusePair = {
      id: 'sg-vs-nacl', title: 'x', required: true, home: 'gatehouse',
      items: [{ name: 'Security group', points: [blk('Stateful.')] }, { name: 'Other', points: [blk('Stateless.')] }],
      choose: [blk('Pick one.')],
    };
    const n = notes({ confuse: ['sg-vs-nacl'] });
    expect(run(n, { confuse: [pair], requiredPairs: REQUIRED_PAIRS.filter((r) => r.id === 'sg-vs-nacl') }).join()).toMatch(/missing item "Network ACL"/);
  });
  it('requires a verbatim quote on every block', () => {
    const n = notes();
    n.overview.push({ text: 'Claim.', sources: ['aws1'] });
    expect(run(n).join()).toMatch(/no verbatim quote/);
  });
  it('requires renamed services to be written with a rename token', () => {
    const renamed: RenamedService[] = [{ id: 'quick', examGuideName: 'Amazon Quick', otherName: 'Amazon QuickSight', relation: blk('Quick evolved from QuickSight.') }];
    const n = notes();
    n.overview.push(blk('We use Amazon QuickSight for dashboards.'));
    expect(run(n, { renamed }).join()).toMatch(/uses "Amazon QuickSight" directly/);
    const ok = notes();
    ok.overview.push(blk('We use {{rename:quick}} for dashboards.'));
    expect(run(ok, { renamed })).toEqual([]);
    const unknown = notes();
    unknown.overview.push(blk('We use {{rename:zzz}}.'));
    expect(run(unknown, { renamed }).join()).toMatch(/unknown rename/);
  });
  it('rejects non-illustrative examples and 12-digit account numbers in code', () => {
    const n = notes({ examples: [{ title: 'Policy', kind: 'iam-policy', illustrative: false as unknown as true, code: `arn:aws:iam::${'1234'}${'5678'}${'9012'}:role/x`, explanation: [blk('Explains.')] }] });
    const problems = run(n).join();
    expect(problems).toMatch(/must be marked illustrative/);
    expect(problems).toMatch(/12-digit number/);
  });
  it('normalises quote characters and whitespace', () => {
    expect(normalise('It’s  a “test” — ok')).toBe('it\'s a "test" - ok');
  });
});
