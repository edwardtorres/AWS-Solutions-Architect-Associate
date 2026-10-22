# Step 8 fact check (interim report)

Status: **stopped at the spot-check gate.** The spot-check overturned well over the 3% limit, so per the plan the fix work, Part D and the final audit are on hold until the owner decides. Everything below is what has actually been run; nothing is inferred.

## 0. Current state in one table

| Item | Status |
| --- | --- |
| Claim audit (ledger) | Recorded: 3,547 verdicts across seven groups (section 1) |
| Fix phase (notes, don't-confuse, glossary, labs 1–14, puzzles, questions, post-guide, sources) | Applied and committed; see section 2 |
| Blind re-review of changed questions | 20 reviewed: 19 agree, 1 wording change (refinery-003) not re-reviewed after reword |
| Spot-check of confirmed verdicts (5% gate) | **Stopped.** 42 of 172 overturned (24%): key-dependent 23 of 86, other 19 of 86. Limit is 3%. |
| `typecheck` | pass |
| `lint` | pass |
| `npm test` | pass: 33 files, 497 tests |
| `check:content` | pass: 1013 questions, 69 buildings |
| `check:links` | pass: 808 sources, 808 pages, 7,891 quotes verified |
| `check:cfn` | pass: 5 templates |
| `build` + `check:bundle` | pass: 85 files, dev hooks absent, no external origins, strict CSP |
| `check:hygiene` | pass: 704 files, 181 commits |
| `test:layout` | pass: 74 checks at 390 px and 1280 px |
| `e2e` | pass: 60 passed, 0 failed |
| `check:freeplan` | not run (network; not part of this fix phase) |
| Part D: `verifiedAt`, `check:freshness`, `content/page-hashes.json` | **not built** |
| `docs/step-8-audit.md` | **not written** |

## 1. Audit ledger (judgements recorded)

Verdicts are in `docs/reviews/step-8/ledger/*.jsonl`. Counts are exact.

| Group | Scope | Rows | Confirmed | Unsupported | Wrong | Outdated | Source changed |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| G1-keys | answer keys and correct-option explanations | 1013 | 995 | 16 | 0 | 2 | 0 |
| G2-puzzles | puzzle rules and Qualifier Sprint facts | 221 | 197 | 24 | 0 | 0 | 0 |
| G3-numbers | numbers, limits, durations, dates | 161 | 147 | 13 | 1 | 0 | 0 |
| G4-azure | "Coming from Azure" blocks | 240 | 215 | 11 | 1 | 4 | 9 |
| G5-labs | lab steps, cost badges, traps | 287 | 214 | 73 | 0 | 0 | 0 |
| G6-status | status labels and post-guide dates | 77 | 75 | 2 | 0 | 0 | 0 |
| S-sample | note claims (sample, escalated to full district pool) | 1548 | 1343 | 205 | 0 | 0 | 0 |

Two notes on coverage:
- The random 10% sample of note claims came back at about 13% unsupported, above the 3% threshold, so each district was escalated to a full audit. I have not verified that the 1548 note rows cover every note block in all five districts. That needs a check against the note files before the note audit can be called complete.
- The single "wrong" rows in G3 and G4 are recorded but were not re-verified in this report.

## 2. Fixes applied (committed to `main`)

Each fixer re-checked its rows against the live cached page and reported that every new quote is verbatim.

- **Notes:** citadel, harbor, express and treasury buildings. Unsupported clauses removed or reworded, or a verbatim quote added. Roughly 300 rows.
- **Don't-confuse pairs and glossary:** 28 rows. Unused glossary term `microservice` removed.
- **Labs 1–14:** about 100 rows. Two defects beyond the ledger: lab 11 cleanup now stops the recorder before deleting the delivery channel, and lab 9's DELETE_FAILED wording now carries a quote.
- **Puzzles:** 24 rule and fact rows, plus 11 loose clauses in the Qualifier Sprint set. Computed answers checked before and after: 0 of 119 changed. No authored key changed.
- **Questions:** 18 worklist rows, plus post-guide declarations for six questions. Keys unchanged except `ingestion-gate-006` (option text, "when the delivery stream is created"). `storage-market-009`'s stem was rewritten and needs review (not blind-reviewed separately; see section 3).
- **Post-guide registry:** `backup-hourly-frequency` and `ecs-min-capacity-0` have no dating AWS page, so they stay "unknown". Lambda Managed Instances (2025-11-30), the Lambda 90-minute timeout (2026-09-09) and the NAT gateway 8-address feature (2023-02-01) are dated from AWS pages.
- **Lambda "Event Function" rename:** quotes in container-yard, serverless-mill, throttle-lb-gate, elastic-mint and others updated to the current page wording. `refinery` 15-minute claims for Lambda now say "standard Lambda invocation" because Managed Instances exist.
- **Sources:** `redshift-what-is` re-added once cited; `glue-triggers` added for refinery-003.

## 3. Blind re-review of changed questions

Twenty worklist questions were answered by a fresh reviewer who never saw keys (`docs/reviews/<district>/blind-<building>.json`).
- **Agree:** 19 of 20, unambiguous.
- **Disputed:** `refinery-003`. Option E said a crawler runs "after the job" on a schedule. I reworded it to "start an AWS Glue crawler from a trigger", sourced from `about-triggers`. The key pair (D and E) did not change. **The reworded option has not been re-reviewed blind.**
- **Not re-reviewed:** `storage-market-009`'s rewritten stem (the reviewer agreed with the key on the rewritten version, but the owner should read the rewrite; the AWS page recommends Elastic for spiky workloads).

## 4. Spot-check of confirmed verdicts (stopped)

Plan: a fresh agent re-judges a seeded 5% sample of confirmed verdicts, at least half key-dependent. If more than 3% are overturned, stop and tell the owner.

- **Sample:** 172 claims (86 key-dependent, 86 other), drawn with seed 20261022 (`scripts/audit/spot-sample.cjs`). Frame: 819 of 1,192 key-dependent confirmed verdicts had claim text in the batch files, and 1,426 of the other confirmed verdicts did.
- **Final result (all seven batches, 172 claims):** 42 overturned, 24.4%. Key-dependent: 23 of 86 (26.7%). Other: 19 of 86 (22.1%).
  - batch 01: 10 of 25 overturned (minor: uncited distractor reasons, and one "by tag" targeting claim)
  - batch 02: 3 of 25
  - batch 03: 3 of 25
  - batch 04: 11 of 25 (seven question items, none in the blind-review set of 20: throttle-lb-gate-012, ingestion-gate-008, refinery-008, refinery-013, legacy-wharf-014, blueprint-hall-010, service-selection-bureau-008)
  - batch 05: 3 of 25
  - batch 06: 6 of 25
  - batch 07: 6 of 22

The stop is in effect. The overturns are not yet adjudicated. Some may be over-strict checkers, and some may already be fixed in section 2 (the sample used the pre-fix text). Owner options: (1) have a second independent checker adjudicate every overturned claim against the current text, then decide which side is right; (2) re-audit all note claims at the stricter standard; (3) accept the overturns, fix the listed items, and move on.

Overturned claims (not re-checked against the current text; see the batch files and verdicts under scratchpad/spot for the full reasons):
- batch 05: `note:gatehouse:examples[2].explanation[0]`, `confuse:direct-connect-vs-vpn:choose[1]` ("encrypted" not on the page), `note:service-selection-bureau:azure[0].breaks` (version condition missing).
- batch 06: `note:instance-foundry:azure[0].mapping`, `note:turbine-hall:3.2-K2.concepts[0]`, `note:gatehouse:examples[2].explanation[3]` (203.0.113.0/24 is not on an allowed source), `pg-pre:rds-multi-az-db-cluster` (2022-03 date uncited), `note:counting-house:4.2-K1.concepts[0]`, `note:capacity-meter:4.3-K6.design[0]`.
- batch 07: `note:ledger-office:azure[2].breaks`, `glossary:homogeneous-migration`, `note:streaming-canal:3.5-K2.concepts[0]`, `note:tide-gauges:2.2-K10.concepts[1]`, `note:instance-foundry:4.2-K7.concepts[1]`, `note:block-warehouse:cues[4]`.
- batch 07 also flagged that `note:transfer-dock` was confirmed but omits that the Data Transfer Terminal is limited to Enterprise Support customers.

## 4a. Open items found during the fix phase (not yet fixed)

- **Qualifier Sprint 013, cost key.** Key 'a' (S3-only as most cost-effective) has no supporting AWS sentence. Owner decision: add a sourced comparison, or re-author the cost qualifier.
- **Lambda term.** Notes still say "function" in prose where Lambda's pages now say "Event Function". Owner decision.
- **Unsourced lines from the labs fixers:** lab 12 Athena "standard S3 rates also apply"; lab 13 c3 "default service role stays in IAM"; lab 3 v1 CLI status "SUSPENDED" (not verified); lab 1 v1 quote is a table-header fragment; lab 3 s8 "grants nothing" is not in its quote; lab 5 lifecycle cites the 128 KB default minimum (post-guide, may need `newer`).
- **Notes:** `database-registry 3.3-K8.design[0]` says "massive scale" where the page says "large amounts of data". `counting-house azure[0].breaks` makes an absence claim left as is. `cold-cellar` storage-class wording conflicts across three AWS pages; it needs a `contradictions.json` entry with a disagreements block.
- **VPN wording.** The "no connection-hour charge" text that the treasury fixer flagged is no longer in the repo. The VPN claim is supported by the pricing page.

## 5. Not done

- **Part D:** `verifiedAt` dates per source and building, `scripts/check-freshness.ts`, `content/page-hashes.json`, and the "Last checked on AWS docs" panel line.
- **Sweeps:** status labels, rename pairs and the in-scope check are not re-run for this report. `check:content -- --live` is not re-run for this report.
- **`check:freeplan`:** not run.
- **Audit document:** `docs/step-8-audit.md` not written.
