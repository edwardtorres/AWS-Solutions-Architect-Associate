# Question writing guide (Step 3)

For writer agents. Read CLAUDE.md first. Questions are original, AWS scenario style, SAA-C03 in-scope services only. Never use or recall exam-dump items.

## Files and helpers
- One file per building: `content/questions/<district>/<building-id>.ts`, default export `Question[]`.
- Build questions with `mc()` (multiple choice, exactly 4 options) and `mr()` (multiple response, 5 or more options, 2 or 3 correct) from `content/questions/helpers.ts`.
- Ids are `<building-id>-<3 digits>` (`gatehouse-001`), unique.

```ts
import type { Question } from '../../../src/content/types.ts';
import { mc, mr } from '../helpers.ts';

const questions: Question[] = [
  mc({
    id: 'gatehouse-001',
    building: 'gatehouse',
    bullets: ['1.2-K3'],
    d: 2,                       // 1 recall in a scenario, 2 apply and choose, 3 several constraints and trade-offs
    tags: ['trap:sg-vs-nacl'],  // also 'placement-eligible' (portfolio buildings) or 'mock-reserve' when the lead says so
    stem: 'A company ... Which solution meets these requirements MOST cost-effectively?',
    correct: ['Option text', 'Why this is right, tied to each requirement.'],
    wrong: [
      ['Distractor A', 'Fails the requirement for X because ...'],
      ['Distractor B', 'Fails ...'],
      ['Distractor C', 'Fails ...'],
    ],
    slot: 2,                    // authored position 0-3 of the correct option (see "Balance")
    evidence: ['source-id|Verbatim sentence from that AWS page that confirms the key.'],
  }),
  mr({
    id: 'gatehouse-002', building: 'gatehouse', bullets: ['1.2-S1'], d: 3,
    stem: 'A company ... Which TWO actions meet these requirements? (Choose two.)',
    correct: [['Right 1', 'Why.'], ['Right 2', 'Why.']],
    wrong: [['Wrong 1', 'Fails ...'], ['Wrong 2', 'Fails ...'], ['Wrong 3', 'Fails ...']],
    slots: [0, 3],              // authored positions of the correct options among all options
    evidence: ['source-id|Verbatim sentence.', 'other-id|Verbatim sentence.'],
  }),
];

export default questions;
```

The UI shuffles options at render time; the authored order only has to be balanced.

## Style rules
- Stem: a short company scenario with concrete requirements, then a qualifier in capitals: MOST cost-effective, LEAST operational overhead, MOST secure, highest availability (write "MOST highly available"), best performance. At least 60 percent of stems carry a qualifier word from: MOST, LEAST, LOWEST, HIGHEST, FASTEST, BEST, MINIMUM, SIMPLEST.
- Multiple response stems end with "(Choose two.)" or "(Choose three.)" and the number must match.
- Distractors are real in-scope services or settings that would often work but fail the qualifier or one named requirement. Never absurd, never invented features. Each `why` for a wrong option names exactly which requirement it fails. Each `why` for a correct option says why it meets the requirements.
- No "all of the above", "none of the above", "both A and B". No trick wording, no double negatives.
- Do not make the correct option the longest. Make distractors similar in length and detail to the correct option (the check fails if the correct option is strictly the longest more than 40 percent of the time).
- Use the exam guide's service names (Amazon S3, AWS IAM Identity Center, Amazon Data Firehose, Amazon Quick, ...). Never name a service that is not on the in-scope list. Never use: App Runner, Timestream, Elastic Disaster Recovery, Lightsail, CodeCommit, Cloud9, CDK, CloudShell, CodeBuild, CodeDeploy, Fault Injection Simulator, IoT services.
- A stem or option never mentions availability status ("closed to new customers", "deprecated", "new customers"). If a question involves Snowball/Snow Family, FSx File Gateway or Aurora Serverless v1, follow the exam-era rule in CLAUDE.md: set `era`, put the availability source in `evidence`, and say the current availability in one explanation. Never let the answer depend on that status.
- No prices or dollar figures in the key. No claims about exam content. Do not use anything listed in `content/needs-verification.json` with status open, or in `scripts/banned-terms.ts`.
- The key rests on a fact from an AWS page (docs.aws.amazon.com or aws.amazon.com), not on a "study guidance" block in the notes. The notes are the starting point; open the cited page to confirm.

## Evidence
- `evidence` strings are `source-id|verbatim quote`. Source ids come from `content/sources.ts`. If you need a page that is not there: `npx tsx scripts/add-source.ts <id> <url> "<title>"` (AWS pages only).
- Every quote must appear verbatim on the page (the check normalises whitespace and quote marks). Test quotes with `npx tsx scripts/q.ts <url> "<regex>"` and `npx tsx scripts/ctx.ts <url> "<regex>" <chars>`. Pick quotes that confirm the key, not just the topic. Use 1 to 3 quotes per question.
- Do not put figures that are not backed by a quote into the key explanation.

## Coverage
- Every outline bullet of the building needs at least 3 non-reserve questions that list it in `bullets`. A question may list two bullets of the same building (both must be genuinely tested).
- Foundations (Founders' Square) use `bullets: []`.
- Aim for about 20 percent difficulty 1, 55 percent difficulty 2, 25 percent difficulty 3 (level 3 at least 22 percent overall), and about 20 percent multiple response, in every building file.
- Use `trap:<pair-id>` tags from `content/dont-confuse.ts` whenever a question turns on one of those comparisons.
- `placement-eligible`: only on portfolio-tagged buildings; tests SAA-level design decisions beyond the five portfolio projects (S3 static hosting, CloudFront, Lambda, API Gateway, DynamoDB): never basic definitions.
- `mock-reserve`: only the questions the lead assigns; they count in addition to the live minimum (a building keeps at least 8 non-reserve questions).

## Balance
Cycle the correct slot through 0, 1, 2, 3 as you write (and vary multiple response slots across positions 0 to 4). Over a district each position must stay at or below 35 percent of multiple-choice questions; the lead rebalances with a script if needed.

## Checks to run before you hand back
1. `npx tsc -p tsconfig.node.json --noEmit`
2. `npx tsx scripts/check-building.ts <building>` (all buildings you wrote; must print OK)
3. `npx tsx scripts/check-content.ts` (must stay OK)
4. `npm run -s check:links` (verifies every evidence quote on the live pages)
Work in small batches (one building at a time) and run these after each, so a cut-off run leaves a passing tree. Do not edit notes, the checks or other buildings' files.
