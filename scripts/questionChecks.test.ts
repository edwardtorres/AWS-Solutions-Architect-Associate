import { describe, expect, it } from 'vitest';
import type { Building } from '../src/data/types.ts';
import type { Question } from '../src/content/types.ts';
import { mc, mr } from '../content/questions/helpers.ts';
import { checkQuestions, jaccard, knownNames, unknownServiceMentions, type QuestionCheckInput } from './lib/questionChecks.ts';

const mkBuilding = (id: string, district: Building['district'], bullets: string[], portfolio = false): Building =>
  ({ id, name: id, skill: id, district, task: district === 'square' ? null : '1.1', bullets, families: [], services: [], ...(portfolio ? { portfolio: [{ tech: 'lambda', note: 'x' }] } : {}) }) as unknown as Building;

const buildings = [mkBuilding('gate', 'citadel', ['1.1-K1', '1.1-S1'], true), mkBuilding('found', 'square', [])];
const base = (): QuestionCheckInput => ({
  questions: [],
  buildings,
  bulletIds: new Set(['1.1-K1', '1.1-S1']),
  sources: [{ id: 'iam', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/x.html', title: 'IAM', kind: 'aws' }],
  confuse: [{ id: 'sg-nacl', title: 't', required: true, home: 'gate', items: [], choose: [] }],
  queue: [{ id: 'nv-x', building: 'gate', claim: 'c', reason: 'r', status: 'open', added: '2026-01-01', keywords: ['secret phrase'] }],
  banned: [{ term: 'banned thing', reason: 'r' }],
  services: {
    inScope: { categories: [{ name: 'Security', services: ['AWS Identity and Access Management (IAM)', 'Amazon Simple Storage Service (Amazon S3)', 'AWS Lambda', 'Amazon Elastic File System (Amazon EFS)'] }] },
    outOfScope: { categories: [{ name: 'Compute', services: ['Amazon Lightsail'] }] },
    technologiesAndConcepts: { items: [] },
    shortServiceNames: { paragraphs: ['x'], bullets: [] },
  },
  shortNames: [{ short: 'Amazon S3', full: 'Amazon Simple Storage Service' }],
  era: [{ service: 'Snow Family', status: 'closed', sentence: 's', source: 'iam', patterns: ['Snowball'] }],
  scope: new Set<string>(),
});

const q = (over: Partial<Parameters<typeof mc>[0]> = {}): Question =>
  mc({
    id: 'gate-one',
    building: 'gate',
    bullets: ['1.1-K1'],
    d: 2,
    stem: 'A company stores audit logs in Amazon S3 and needs the MOST secure way to restrict access to one team.',
    correct: ['Use an IAM policy scoped to the bucket', 'It limits access to the team and nothing else, meeting the requirement.'],
    wrong: [
      ['Make the bucket public', 'Fails the secure requirement because anyone can read the logs.'],
      ['Share one access key', 'Fails because one shared key cannot be limited per person.'],
      ['Use a longer bucket name', 'Fails because a name does not restrict access to anyone.'],
    ],
    slot: 1,
    evidence: ['iam|IAM policies define permissions for an identity or resource.'],
    ...over,
  });

const problems = (questions: Question[], tweak: (i: QuestionCheckInput) => void = () => {}) => {
  const input = { ...base(), questions };
  tweak(input);
  return checkQuestions(input);
};

describe('question checks', () => {
  it('passes a well formed question', () => {
    expect(problems([q()])).toEqual([]);
  });

  it('fails the shape rules', () => {
    expect(problems([q({ id: 'other-id' })]).join()).toMatch(/must start with the building id/);
    expect(problems([q(), q()]).join()).toMatch(/duplicate id/);
    expect(problems([q({ bullets: ['9.9-K9'] })]).join()).toMatch(/unknown bullet/);
    expect(problems([q({ bullets: [] })]).join()).toMatch(/at least one outline bullet/);
    expect(problems([q({ stem: 'Too short.' })]).join()).toMatch(/too short/);
    expect(problems([q({ tags: ['mystery'] })]).join()).toMatch(/unknown tag/);
    expect(problems([q({ tags: ['trap:nope'] })]).join()).toMatch(/names no don't-confuse pair/);
    expect(problems([q({ tags: ['trap:sg-nacl'] })])).toEqual([]);
  });

  it('requires an explanation, evidence and an AWS source', () => {
    const noWhy = q();
    noWhy.options[0]!.why = 'no';
    expect(problems([noWhy]).join()).toMatch(/needs an explanation/);
    const noEv = q();
    noEv.evidence = [];
    expect(problems([noEv]).join()).toMatch(/at least one evidence quote/);
    expect(problems([q({ evidence: ['missing|A quote that cites a source that does not exist.'] })]).join()).toMatch(/unknown source/);
    expect(problems([q()], (i) => (i.sources = [{ id: 'iam', url: 'https://example.com/x', title: 'x', kind: 'aws' }])).join()).toMatch(/outside the allowed sites/);
    expect(problems([q()], (i) => (i.sources = [{ id: 'iam', url: 'https://learn.microsoft.com/x', title: 'x', kind: 'azure' }])).join()).toMatch(/not an AWS page/);
  });

  it('rejects all/none of the above, banned terms and open queue items', () => {
    const wrong = q();
    wrong.options[0]!.text = 'All of the above';
    expect(problems([wrong]).join()).toMatch(/of the above/);
    const banned = q();
    banned.options[0]!.why = 'This is a banned thing indeed, so it must fail the check.';
    expect(problems([banned]).join()).toMatch(/banned term/);
    const queued = q({ stem: 'A company stores audit logs in Amazon S3 and needs the MOST secure way; the secret phrase matters here.' });
    expect(problems([queued]).join()).toMatch(/open needs-verification item nv-x/);
  });

  it('keeps availability status out of stems and options', () => {
    expect(problems([q({ stem: 'A company stores audit logs in Amazon S3 and needs the MOST secure way; the service is closed to new customers.' })]).join()).toMatch(/depends on availability status/);
  });

  it('rejects out-of-scope and unknown services', () => {
    const light = q();
    light.options[0]!.text = 'Use Amazon Lightsail';
    expect(problems([light]).join()).toMatch(/out-of-scope service "Amazon Lightsail"/);
    const appRunner = q();
    appRunner.options[1]!.text = 'Deploy it on App Runner';
    expect(problems([appRunner]).join()).toMatch(/out-of-scope service "App Runner"/);
    const unknown = q();
    unknown.options[2]!.text = 'Use Amazon Frobnicator for it';
    expect(problems([unknown]).join()).toMatch(/not an in-scope service name/);
    const short = q();
    short.options[2]!.text = 'Use Amazon S3 versioning for it';
    expect(problems([short])).toEqual([]);
  });

  it('knows service names and their short forms', () => {
    const known = knownNames(base().services, base().shortNames);
    expect(unknownServiceMentions('Use Amazon EFS or AWS IAM Identity', known)).toEqual([]);
    expect(unknownServiceMentions('Use AWS Frobnicator now', known)).toEqual(['AWS Frobnicator now']);
  });

  it('applies the exam-era rule', () => {
    const era = q({ stem: 'A company in Amazon S3 land ships data with a Snowball device and needs the LEAST effort to move it.' });
    expect(problems([era]).join()).toMatch(/needs era: "Snow Family"/);
    const ok = q({ stem: era.stem, era: 'Snow Family', evidence: ['iam|IAM policies define permissions for an identity or resource.'] });
    ok.options[0]!.why = 'Snowball is no longer available to new customers, but it fits the offline requirement described.';
    expect(problems([ok])).toEqual([]);
  });

  it('checks multiple response shape and the choose wording', () => {
    const m = mr({
      id: 'gate-two',
      building: 'gate',
      bullets: ['1.1-S1'],
      d: 3,
      stem: 'A company needs to protect objects in Amazon S3 at rest. Which TWO actions meet this requirement? (Choose two.)',
      correct: [
        ['Turn on default encryption', 'Encrypts every new object at rest, meeting the requirement.'],
        ['Use a customer managed key', 'Gives control over the key used for encryption at rest.'],
      ],
      wrong: [
        ['Rename the bucket', 'Fails because a name does not encrypt anything at rest.'],
        ['Add a lifecycle rule', 'Fails because lifecycle rules change storage class, not encryption.'],
        ['Enable website hosting', 'Fails because hosting exposes content rather than protecting it.'],
      ],
      slots: [0, 3],
      evidence: ['iam|IAM policies define permissions for an identity or resource.'],
    });
    expect(problems([m])).toEqual([]);
    expect(problems([{ ...m, stem: 'A company needs to protect objects in Amazon S3 at rest. Which actions meet this requirement?' }]).join()).toMatch(/must say "Choose two/);
  });

  it('enforces counts and balance only for districts in scope', () => {
    expect(problems([q()], (i) => (i.scope = new Set(['citadel']))).join()).toMatch(/building gate has 1 non-reserve questions/);
    const out = problems([q()], (i) => (i.scope = new Set(['citadel']))).join();
    expect(out).toMatch(/bullet 1.1-K1 \(gate\) has 1/);
    expect(out).toMatch(/portfolio building gate has 0 placement-eligible/);
  });

  it('catches answer position skew, near-duplicates and reserve tags', () => {
    const many = Array.from({ length: 24 }, (_, i) => {
      const x = q({ id: `gate-q${i}`, slot: 0, stem: `A company number ${i} with unique wording ${'abcdefghijklmnopqrstuvwxyz'[i]}${i} stores audit logs and needs the MOST secure approach to restrict access across teams ${i * 7}.` });
      return x;
    });
    expect(problems(many, (i) => (i.scope = new Set(['citadel']))).join()).toMatch(/the correct answer is option 1 in 100.0%/);
    expect(problems([q({ id: 'gate-a' }), q({ id: 'gate-b' })], (i) => (i.scope = new Set(['citadel']))).join()).toMatch(/near-duplicate stems: gate-a and gate-b/);
    const bad = q({ tags: ['mock-reserve', 'placement-eligible'] });
    expect(problems([bad]).join()).toMatch(/cannot be placement-eligible/);
  });

  it('flags a strictly longest correct option when it is too common', () => {
    const many = Array.from({ length: 24 }, (_, i) =>
      q({
        id: `gate-l${i}`,
        slot: i % 4,
        stem: `Scenario ${i}: ${'abcdefghijklmnopqrstuvwxyz'[i]} workloads at company ${i * 13} need the LEAST operational overhead for ${['logs', 'keys', 'roles', 'queues'][i % 4]} handling ${i}.`,
        correct: ['Use the managed regional service with automatic key rotation enabled', 'Meets the requirement with the least operational overhead for the team.'],
      }),
    );
    expect(problems(many, (i) => (i.scope = new Set(['citadel']))).join()).toMatch(/strictly the longest/);
  });

  it('keeps question data behind src/questions', () => {
    const p = problems([], (i) => (i.appFiles = [{ path: 'src/ui/Quiz.tsx', content: "import q from '../../content/questions/citadel/x'" }, { path: 'src/questions/pool.ts', content: "import('../../content/questions/citadel/x')" }]));
    expect(p.join()).toMatch(/src\/ui\/Quiz.tsx imports question data directly/);
    expect(p.join()).not.toMatch(/^src\/questions\/pool/m);
  });

  it('measures stem similarity', () => {
    expect(jaccard(new Set(['a b c']), new Set(['a b c']))).toBe(1);
    expect(jaccard(new Set(['a b c']), new Set(['x y z']))).toBe(0);
  });
});
