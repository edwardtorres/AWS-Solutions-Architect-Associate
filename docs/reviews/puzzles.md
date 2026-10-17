# Puzzle review log (Step 5)

Reviewers did not write the content. Blind reviewers saw only a keyless export (`scripts/blind-puzzles.ts export`: story, exhibit as text, fields and options) and could not open the repository. Source reviewers read the rules, the evaluator code and the scenarios, and checked every quote against the cited page. Answers are in `docs/reviews/puzzles/round1`, `round2`, `round3` and the current `blind-*.json` (round 4); source findings in `docs/reviews/puzzles/source-*.md` and `source-recheck.md`. Most blind reviewers answered from knowledge and did not browse; the source reviewers did the page checks.

## Blind passes (agree = same answer as the computed one and not flagged ambiguous)
| Type | Round 1 (sample) | Round 2 (all) | Round 3 | Round 4 (current) |
| --- | --- | --- | --- | --- |
| Policy Court | 18 of 25 | 22 of 25 | 26 of 26 | 26 of 26 (round 3 kept) |
| Packet Tracer | 20 of 22 | 22 of 22 | n/a | 22 of 22 (round 2 kept) |
| Disaster Bunker | 12 of 16 | 16 of 16 | n/a | 16 of 16 (round 2 kept) |
| Cold Cellar | 5 of 9 | 15 of 17 | 14 of 17 (answers matched, 3 wording flags) | 17 of 17 |
| Purchase Planner | 7 of 9 | 18 of 18 | n/a | 18 of 18 (round 2 kept) |
| Architecture Builder | 0 of 5 (placements passed; all flagged "which components are needed?") | 9 of 9 | n/a | 9 of 9 (round 2 kept) |
| Qualifier Sprint | 1 of 7 | 8 of 14 | 11 of 14 (answers matched, 3 flags) | round 4: 13 of 14; round 5 (after rewording 009): all 14 answers match the keys, 11 of 14 unflagged; flags on 003 (overhead), 005 (cost), 007 (cost) |

Round 1 sampled at least 30% of each type and all of Policy Court, Packet Tracer and Disaster Bunker. Rounds 2 to 4 re-solved every scenario of each type they cover. Types that were already fully clean in round 2 were not re-run after that (their later edits were limited to wording).

## Source passes
| Type | First pass | Re-check |
| --- | --- | --- |
| Policy Court (35 rules, 25 scenarios) | rules 32 OK / 3 FIX, scenarios 20 OK / 5 FIX, 3 general items | 7 changed rules OK; scenario 024 trace FIX (fixed) |
| Packet Tracer (53 rules, 22 scenarios) | rules 48 OK / 5 FIX, scenarios 15 OK / 7 FIX | not repeated; all FIX items fixed and tests extended |
| Disaster Bunker | 24 OK / 6 FIX | not repeated |
| Cold Cellar | 25 OK / 8 FIX | not repeated |
| Purchase Planner | 21 OK / 8 FIX | not repeated |
| Architecture Builder | 19 OK / 8 FIX | not repeated |
| Qualifier Sprint | 6 OK / 8 FIX | sets 001-004, 012 OK; 007, 009, 011, 013 FIX (007, 009, 013 replaced by new sets; 011 re-quoted) |

All 77 rule quotes in the first pass, and every changed quote since, were machine-checked verbatim against the live pages; `npm run check:links` also verifies every puzzle rule and fact quote (7,288 quotes).

## Disagreements and how they were resolved
**Policy Court**
- 003, 006, 011, 020, 023, 024 (decider = "implicit" vs the limiter) and 015, 017, 020, 024 (the keyed "no policy allows it" was literally false): the decider prompt contradicted itself. Resolved by one uniform definition: the decider is the single policy that would by itself turn the result into Allow if its Allow applied; "No single policy" only when no one policy could. Evaluator, prompt, labels, traces and tests changed; scenario 026 added so that option is used.
- 008, 009, 024 (round 2): same cause, keyed to the identity-based policy under the uniform rule.
- 019, 020: trust policy exhibits had an invalid Resource element; the evaluator now treats trust policies as having none.
- Rules principal-identity, resource-wildcard, cond-ip narrowed to what their quotes say; quotes added (scp-no-principal, resource-wildcard-colon, cond-cidr, cond-ip-operators).

**Packet Tracer**
- 010 and 019 (blame ambiguity): the blocker field now defines blame ("the first component on the packet's path that cannot carry it"); 010 rebuilt around a component that exists; 009, 015, 020, 021 reworded; unsourced cost motives removed; gateway endpoints no longer offered as options where two answers were defensible. DynamoDB prefix-list/NACL quotes added; sg-stateful reply quote added; eph-linux reworded.

**Disaster Bunker**
- 009, 010, 011, 015: the blocks `dns-failover` and `ami-copy` appear in several strategies' documentation. `dns-failover` removed everywhere; `ami-copy` kept only as a backup-and-restore block and never used as a distractor. 015's key stands (the source reviewer disagreed with the blind reviewer). 006 now says the documented class table decides.

**Cold Cellar**
- 001/006/008 (Deep Archive vs Flexible Retrieval for rare reads): access frequencies are stated in the wording the two AWS pages share ("about twice a year", "less than once a year") and the page conflict is recorded in `content/contradictions.json` (`c-glacier-access-frequency`). 008 now asks for a restore within minutes.
- 003, 014 (One Zone-IA vs Standard-IA): every class field now states the cost criterion "the least expensive class whose documented use case fits".
- 011, 012 (Standard vs Intelligent-Tiering / One Zone-IA below 128 KB): the stories state a known steady pattern and non-re-creatable data. 015: the day prompt now says "the earliest day that is at or after the stage start and free of any early-move charge".
- Rules cls-standard-ia and min-billable-size no longer claim more than their quotes; the newer 128 KB lifecycle rule was removed (see audit).

**Purchase Planner**
- 007, 008, 017 (EC2 Instance vs Compute Savings Plans tie): a documented goal field (largest saving vs most flexible) breaks the tie; without it the case is refused. 009, 010: a documented rule that capacity needs Reserved Instances or Capacity Reservations. 012: key stands. spot-notice quote replaced by the direct sentence.

**Architecture Builder**
- Blind: all five flagged "ambiguous" only because the requirements did not say components may be left unused; the exhibit now says so. Source pass: rule quotes for public-subnet load balancers, private DB placement and the queue were weaker than the checks; rules reworded to what the pages state, the db-private and cache checks loosened to what their quotes support, the queue check now needs a worker behind the queue, and two scenario stories were corrected.

**Qualifier Sprint**
- Sets 001, 003, 004, 007, 009, 011, 012, 013 were reworked (stated deciding constraints, better-separating quotes); three sets (007, 009, 013) were replaced twice. Residual judgement calls: 013's overhead winner (S3 static hosting vs fewer CloudFront parts) rests on a "fewer parts" reading; set 013 has only three distinct answers; 007's overhead quote does not separate versioning-only from the options that add to it in words. These are recorded in the audit.

**Qualifier Sprint, final state.** In round 5 the blind reviewer's answer matched the key in all 14 sets, but flagged three qualifier calls as still arguable: 003 overhead (Aurora Serverless v2 vs a plain RDS instance, both managed), 005 cost (snapshot archive tier vs a plain backup plan) and 007 cost (a lifecycle rule on noncurrent versions vs keeping every version). Each round of rewording moved the flags to different sets, which indicates the "best for this qualifier" judgement is inherently softer than the rule-computed puzzles. I stopped iterating there and list them as open judgement calls in the audit rather than keep rewriting; say if you want Sprint sets replaced or the type dropped.

## Step 6: Qualifier Sprint replacement round
- Goal: replace sets 003, 005 and 007 with sets whose winner for each qualifier rests on one AWS sentence that settles it; one blind and one source round; drop any set still flagged.
- 003 (DynamoDB: on-demand / reserved capacity / item-level IAM conditions / global table): dropped before review. The post-guide registry (`dynamodb-price-cut-2024`) says reserved provisioned capacity is no longer the established lowest-cost answer, so its cost winner cannot be defended.
- 005 (image-resizing service: Fargate / Spot / Session Manager / multi-AZ Auto Scaling group): blind reviewer matched all four keys (overhead, cost, secure, available) and flagged only "most secure" as arguable (Fargate's isolation). Dropped under the "drop, don't iterate" rule. The source pass was not run on a dropped set.
- 007: no candidate found whose sentences separate all four qualifiers without ties (for example, S3 docs list Glacier Instant Retrieval at a lower availability than S3 Standard while a product page lists both at the same figure).
- Result: 11 sets remain; minimum lowered from 13 to 11; decision recorded in CLAUDE.md.
