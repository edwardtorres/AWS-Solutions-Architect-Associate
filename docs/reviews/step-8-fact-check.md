# Step 8 fact check (final report)

Status: **complete, awaiting owner approval.** The claim audit, the adjudication gate, note coverage, the owner decisions, the sweeps, the freshness baseline and the final checks are done. Two things are not fully done and are called out in section 9: one wording edit was not re-checked by a fresh checker, and one Lab 1 quote is weak.

## 1. Headline

| Measure | Result |
| --- | --- |
| Spot-check of confirmed verdicts (172 claims, seed 20261022) | 42 overturned (24.4%): key-dependent 23 of 86, other 19 of 86 |
| Adjudication of the 42 (categories) | (a) answer key wrong 0 · (b) claim false or outdated 1 · (c) true but quote does not state it 33 · (d) already fixed 8 |
| Gate: (a)+(b) of the 172 sample | 1 (0.6%). Limit 3% (5 or fewer). **Gate passed. No re-audit triggered.** |
| Note coverage | 1,680 note blocks in content; all 1,680 now have a verdict (before this step: 1,287) |
| Coverage verdicts for the 393 new blocks | 355 confirmed · 23 unsupported · 2 wrong · 9 source-changed · 4 outdated. All 38 non-confirmed fixed |
| Answer keys (correct-option sets) changed | **None** |
| Puzzle answers changed | None. 0 of 119 computed answers changed. One puzzle set removed (Qualifier Sprint 013) |
| Evaluator rules changed | None |

## 2. Adjudication of the 42 overturned claims

Each claim was judged by a fresh adjudicator against the current text and its page, without the spot-check verdicts or the ledger. The adjudicators' reasoning and AWS sentences are in the adjudication files (not committed). Summary by category:

- **(a) answer key wrong: 0.** No keyed option is wrong per the documentation.
- **(b) claim false or outdated: 1.** `q:refinery-008`: the Athena distractor said Spark code would be rewritten; current Athena documentation says Athena runs submitted Spark code. The distractor reason was corrected. The key (EMR) stands, because only EMR's page names S3 and DynamoDB data movement.
- **(c) true but quote does not state it directly: 33.** Each was fixed by rewording to the page's wording or adding a verbatim quote. Examples: distractor reasons with no cited support (`q:counting-house-006`, `q:counting-house-008`, `q:elastic-mint-007`, `q:storage-market-004`, `q:service-selection-bureau-008`, `q:refinery-013`); missing qualifiers (`note:tide-gauges:2.2-K10.concepts[1]`, `note:block-warehouse:cues[4]`, `note:gatehouse:examples[2].explanation[0]`); overstatements (`note:tuning-bay:overview[0]`, `note:turbine-hall:3.2-K2.concepts[0]`).
- **(d) already fixed: 8.** The current text was already supported by its quote, or the claim no longer appears.

**Re-verification of every fixed item.** The 73 changed claims (the 34 adjudicated (b)/(c) claims, the 38 coverage non-confirmed claims and one pending coverage claim) were re-checked by fresh checkers, in rounds:
- Round 1 (73 claims, three batches): 60 confirmed, 13 unsupported.
- Round 2 (8 claims): 6 fixed by distractor and explanation rewording, 1 (`q:rebuild-yard-012`) fixed by removing an unsupported stem phrase, 1 (confuse trap) fixed by rewording.
- Round 3 (5 claims): 2 more unsupported, both fixed.
- Round 4 (10 claims): 9 confirmed, 1 unsupported (`q:blueprint-hall-010`: the key A explanation said the load balancer makes the tier "scale out"). Fixed by attributing scaling to the Auto Scaling group, with the verbatim sentence from the Auto Scaling groups page (source `asg-groups` added).

**Judgement call:** `q:counting-house-006` distractor B's "not a steady workload" rejection rests on the stem, not a page sentence. Accepted under the explanation-support rule.

## 3. Note coverage

- The extractor finds 1,680 note blocks in `content/notes/**`.
- Before this step, the ledger held 1,548 S-sample rows. Of those, **261 were don't-confuse and glossary rows**; the note rows covered 1,287 blocks. My earlier report said 1,548 note rows, which was wrong.
- 393 blocks had no verdict. They were audited in 16 batches (groups G3-numbers and G4-azure), using the same standard. Results: 355 confirmed, 23 unsupported, 2 wrong, 9 source-changed, 4 outdated.
- Every non-confirmed coverage claim was fixed and included in the re-verification rounds above. The "wrong" rows were `note:cold-cellar:4.1-K10.concepts[3]` (moved to the disagreements block) and `note:message-quay:azure[2].mapping` (the Learn messaging page lists Service Bus).
- Current coverage: 1,680 of 1,680 note blocks have a verdict.

## 4. Owner decisions: outcomes

- **Qualifier Sprint 013: dropped.** Removed from `content/puzzles/qualifier-sprint.ts`. `MIN_SCENARIOS['qualifier-sprint']` is now 10 (was 11). Ten sets remain (ids 001, 002, 004, 006, 008–012, 014; ids are never reused). Scenario count 119 → 118. No other scenario changed.
- **Lambda "Event Function":** prose keeps "Lambda function" (the exam's wording). Added to `content/renamed-services.ts` as `lambda-event-function`, with the verbatim sentence "To summarize, your Event Function's concurrency is the number of concurrent requests that it's handling at the same time." (source `lambda-concurrency`). Note prose changed from "Event Function" to "Lambda function" in five places. Quoted evidence keeps AWS's wording. Deviation: the entry type is a service rename, so this is a term mapping; the naming check passes.
- **Lab 5, 128 KB lifecycle default:** the lifecycle step now declares `newer: ['s3-lifecycle-default-min-size']` ("Newer than the exam guide"; dated 2024-09-24 in the registry).
- **refinery-003:** option E reworded from "Schedule an AWS Glue crawler to run after the job" to "Start an AWS Glue crawler from a trigger", sourced from the Glue triggers page. Blind re-review (fresh reviewer, key-less export): picks D and E, unambiguous. Agrees with the key.
- **storage-market-009:** accepted as rewritten, per the owner. The stem changed from "accessed in unpredictable bursts, its average throughput is a small fraction of its peak, and most files are not read for months" to "Its throughput needs grow with the amount of data stored, and most files are not read for months." The keyed option text is unchanged.
- **Unsourced lab lines:**
  - Lab 12 cost basis: removed "standard S3 rates also apply to the data and results".
  - Lab 13 step: "The default service role stays in IAM; you may keep it." → "If AWS Backup created a default service role for you, you may keep it."
  - Lab 3 s8 and the scp-boundary-identity step: removed "grants nothing"; the text now matches the page-supported quote ("SCPs don't affect users or roles in the management account").
  - Lab 3 v1 "SUSPENDED" status: already absent (removed in Step 8 Part A); verified not present.
  - **Lab 1 v1 quote: kept.** It is a verbatim key list from the GetAccountSummary reference. It supports the key names only. Not softened; the owner may decide.
- **database-registry 3.3-K8.design[0]:** "massive scale" → "large amounts of data" (the page's wording).
- **counting-house azure[0].breaks:** the absence claim ("have no Learn pairing") removed.
- **cold-cellar storage-class wording:** added `c-s3-ia-minimum-duration` to `content/contradictions.json` (three readings: the storage decision guide, the storage classes page, the lifecycle page). The note's disagreements block carries the reading, and the disputed sentence was removed from the concepts. No question states the disputed transition minimum; the early-deletion charge, which all three pages state, is undisputed and remains in questions.
- **transfer-dock:** added "AWS Data Transfer Terminal is available only to AWS Enterprise Support customers at this time." (quote from the Data Transfer Terminal page).

## 5. Every change that altered a key, puzzle answer or evaluator rule

Keys (the correct-option sets) changed: **none.**

Option text, stems and reasons changed on keyed questions. The keyed option is the same option as before in every case.

| Item | Before | After |
| --- | --- | --- |
| `disaster-bunker-002` | Wrong option "Create an AWS Backup plan that runs once a day…" (the established daily design, which the post-guide rule forbids as a wrong option) | Removed; replaced with a wrong option "Keep the database and instances in one Region and use a Multi-AZ deployment for recovery" (explanation: the standby is in another AZ of the same Region, so it does not protect against a Regional disaster). Key unchanged (hourly backups; post-guide declared). |
| `container-yard-008` | Wrong option B "…target tracking policy on average CPU utilization and a minimum capacity of 1" | "…target tracking policy on average CPU utilization" (minimum-1 clause removed). Key unchanged; post-guide declared. |
| `ingestion-gate-006` | Key "Turn on dynamic partitioning on the delivery stream and use customer_id as the partitioning key" | "Turn on dynamic partitioning when the delivery stream is created and use customer_id as the partitioning key". Wrong option "Increase the buffer size and buffer interval…" → "Increase the buffer size…". **Owner should note:** key wording changed, same mechanism. |
| `storage-market-009` | Stem "accessed in unpredictable bursts…" | Stem "Its throughput needs grow with the amount of data stored…". Key text unchanged; accepted by the owner. |
| `refinery-003` | Option E "Schedule an AWS Glue crawler to run after the job…" | "Start an AWS Glue crawler from a trigger…". Key pair D and E unchanged; blind re-review agrees. |
| `service-selection-bureau-010` | Stem "Which TWO changes lower the cost of the table?" | "Which TWO changes can lower the cost of the table?" (done by the lead). Key unchanged. **Owner should review:** the page says provisioned capacity "may be better", so the stem's modal now matches that. |
| `rebuild-yard-012` | Stem "…reapplied automatically on a schedule, including on new instances, without inbound SSH access…" | "…on a schedule, without inbound SSH access…" (done by the lead). Key unchanged. |
| `blueprint-hall-010` | Key A explanation: "the tier scales out" attributed to the load balancer | Attributed to an Auto Scaling group spreading instances across the AZs you specify (quote: "If a scaling action occurs, Amazon EC2 Auto Scaling automatically maintains balance across all of the Availability Zones that you specify."). Key D explanation: "reducing the read load on the database". Keys unchanged. |
| `storage-market-004`, `counting-house-006`, `counting-house-008`, `elastic-mint-007`, `refinery-008`, `refinery-013`, `service-selection-bureau-008` | Distractor or explanation reasons without support | Reworded to the page's wording or with verbatim evidence. Keys unchanged (`refinery-008` was a category (b) fix). |

Puzzles:
- **Qualifier Sprint 013 removed** (see section 4). This is the only puzzle-set change in this step.
- **Qualifier Sprint clause fixes (11 items, earlier in this step):** reworded or re-sourced. Computed answers: 0 of 119 changed.
- **Evaluator rules:** no rule changed in this round.

## 6. Sweeps

- **Status labels, banned terms, deprecated/retired/preview wording:** `check:content` passes.
- **Rename pairs** (`content/renamed-services.ts`, `scripts/official-short-names.json`): `check:content -- --live` passes.
- **Post-guide registry scan** (`scripts/post-guide-scan.ts`): every match is declared. Matches: `backup-hourly-frequency` (5 questions, declared), `ecs-min-capacity-0` (1 question, declared), `lambda-managed-instances` (3 notes, declared), `lambda-managed-instances-90min` (3 notes, declared). Pre-guide candidate `rds-multi-az-db-cluster` removed from the list: the What's New page says "Posted on: Mar 2, 2022", which is before the 2022-08-01 cutoff.
- **Post-guide features with unknown dates** (`backup-hourly-frequency`, `ecs-min-capacity-0`): no AWS page dates them, so they stay "unknown" and post-guide. The keys that use them stay, as the owner approved in Step 4.
- **In-scope check** (questions): part of `check:content` (`scripts/lib/questionChecks.ts`); passes.
- **Live outline:** `npm run check:content -- --live`: OK, 4 domains, 14 tasks, 189 bullets, 69 buildings, 97 roads, 1013 questions.

## 7. Freshness (Part D)

- `content/page-hashes.json` written by `npm run check:freshness -- --update`: 807 pages, each with a hash of its main content and `verifiedAt` 2026-10-22.
- Building dates: `npm run gen:meta` regenerated `src/content/verified.ts`: 69 buildings, each "Last checked on AWS docs: 2026-10-22". The panel line already exists (`src/ui/DetailPanel.tsx`).
- `npm run check:freshness`: "OK: 807 pages unchanged since their hashes were stored (2026-10-22)."
- Deviation from the plan: `verifiedAt` is stored per page in `content/page-hashes.json` (the freshness design), not per `Source`, so there is one source of truth. The effect is the same.
- Fix made during this step: the main-content extraction removed navigation elements before choosing the main region, which emptied Learn pages. It now chooses the region first. Freshness unit tests pass (4).
- `check:freshness` is not part of `npm test`, `check` or `check:all`.

## 8. check:freeplan (run once)

Changes since the 2026-10-19 snapshot:
- added: AWS Security Hub (Available on both plans); AWS Application Migration Service (Available on both plans); Amazon Personalize (Paid plan exclusive); AWS Elemental MediaTailor (Paid plan exclusive)
- removed: Amazon Neptune (Paid plan exclusive); AWS App Studio (Available on both plans)

No lab uses any of these services, so no lab badge changes. The snapshot was not updated (the plan says update only when the owner asks). The command reports changes; its exit status was not captured through the pipe, but the script exits 1 on any change by design.

## 9. Not fully done, and unsure

- **`q:blueprint-hall-010`:** the last edit (the Auto Scaling sentence and source) was checked by quote and by reading the page, but not by a fresh checker.
- **Lab 1 v1 quote** is a verbatim key list. It supports the key names only (see section 4).
- **Owner review requested:** `service-selection-bureau-010` stem ("can lower"), `rebuild-yard-012` stem, `storage-market-009` stem, `ingestion-gate-006` key wording.
- **Spot-check batch files were overwritten.** A re-run of the sampler (which has since been made to refuse to overwrite) rewrote the `.cache/audit/spot` batch files, because the frame had grown with coverage verdicts. The 172 spot ids and their verdicts are preserved in the spot verdict files, and every claim's text is in the untouched `.cache/audit/batches` files. The 42 overturned claims' text is in the adjudication inputs. The sample itself is not redrawn.
- **Adjudicators and checkers are fresh agents of the same model family,** so independence is partial.
- **Puzzle set removal** changes the scenario count (119 → 118), which the tests and the minimum check now reflect.
- **The Lambda "Event Function" term** is a term mapping placed in the rename list.
- **Ledger cleanup:** the recorder wrote some coverage rows to an unnamed group file twice. The duplicates were removed; each id now has one row.

## 10. Checks at the final run

| Check | Result |
| --- | --- |
| `typecheck` | pass |
| `lint` | pass |
| `npm test` | pass: 33 files, 496 tests |
| `check:content` | pass: 1013 questions, 69 buildings |
| `check:content -- --live` | pass |
| `check:links --fresh` | pass: 807 sources, 807 pages, 7,989 quotes verified |
| `check:cfn` | pass: 5 templates |
| `build` + `check:bundle` | pass: 85 files, dev hooks absent, no external origins, strict CSP |
| `check:hygiene` | pass: 705 files, 193 commits |
| `check:freshness` | pass: 807 pages unchanged |
| `check:freeplan` | changes reported (section 8) |
| `test:layout` | see the final run below |
| `e2e` | see the final run below |

The layout and e2e results are recorded in the audit document (`docs/step-8-audit.md`), which is written after those runs finish.
