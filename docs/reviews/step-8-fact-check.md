# Step 8 fact check (interim report)

Status: **interim, not final.** The claim audit ran and its verdicts are recorded. The fix phase is mostly done. The spot-check, blind re-reviews, freshness tooling and `verifiedAt` dates (Part D) are not done. Do not treat the content as fully verified yet.

## 1. Audit ledger (judgements recorded)

Verdicts are recorded in `docs/reviews/step-8/ledger/*.jsonl`. Each row names the checker batch that judged it.

| Group | Scope | Rows | Confirmed | Unsupported | Wrong | Outdated | Source changed |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| G1-keys | answer keys and correct-option explanations | 1013 | 995 | 16 | 0 | 2 | 0 |
| G2-puzzles | puzzle rules and Qualifier Sprint facts | 221 | 197 | 24 | 0 | 0 | 0 |
| G3-numbers | numbers, limits, durations, dates | 161 | 147 | 13 | 1 | 0 | 0 |
| G4-azure | "Coming from Azure" blocks | 240 | 215 | 11 | 1 | 4 | 9 |
| G5-labs | lab steps, cost badges, traps | 287 | 214 | 73 | 0 | 0 | 0 |
| G6-status | status labels and post-guide dates | 77 | 75 | 2 | 0 | 0 | 0 |
| S-sample | note claims (random sample, then full-district pool) | 1548 | 1343 | 205 | 0 | 0 | 0 |

Note on S-sample: the random 10% sample came back at about 13% unsupported, above the 3% threshold, so every district was escalated to a full audit. The ledger holds 1548 note verdicts. I have not verified in this report that that covers every note block in all five districts. Check the ledger against the note files before treating the note audit as complete.

Note on the rows above: the 1 "wrong" in G3 and the 1 "wrong" in G4 are in the ledger but were not separately re-verified in this report.

## 2. Fixes applied (fix phase, committed to main)

Each fixer re-checked its rows against the live cached page. The changes are small and reversible (commits on `main`, from `abb0d7b7` onward through `899998d7` and `0e663317`).

- Notes: citadel, harbor, express and treasury buildings fixed. Unsupported clauses were removed or reworded, or a verbatim quote was added. Approximately 300 rows.
- Don't-confuse pairs and glossary: 28 rows. The unused glossary term `microservice` was removed.
- Labs 1–14: about 100 rows. Two defects were fixed beyond the ledger: lab 11 cleanup now stops the recorder before deleting the delivery channel, and lab 9 DELETE_FAILED wording now carries a quote.
- Puzzles: 24 rule and fact rows, plus 11 loose clauses in the Qualifier Sprint set. Computed answers checked before and after: 0 of 119 changed. No authored key changed.
- Post-guide registry: `backup-hourly-frequency` and `ecs-min-capacity-0` are listed with an "unknown" introduction date (no AWS page dates them). Lambda Managed Instances (2025-11-30), the Lambda 90-minute timeout (2026-09-09) and the NAT gateway 8-address feature (2023-02-01) are dated from AWS pages.
- Sources: `redshift-what-is` removed (no longer cited). Other source changes are listed in the commit history.

## 3. Owner decisions needed

1. **Qualifier Sprint 013, cost key.** The key 'a' (S3-only is the most cost-effective) has no supporting AWS sentence. Options: add a sourced comparison, or re-author the cost qualifier for that set. A set cannot be deleted without a minimum-count decision (`MIN_SCENARIOS['qualifier-sprint']` is 11).
2. **Lambda term.** AWS Lambda pages now say "Event Function" where they used to say "function". Several notes still say "function" in prose. Decide whether the notes adopt the new term.
3. **Post-guide key rule.** `disaster-bunker-002` (hourly key against a once-a-day option) and `container-yard-008` (ECS minimum-capacity-0 key against a minimum-of-1 option) break the rule in CLAUDE.md. The questions fixer was asked to rewrite them or to report the decision needed. Its result is not in this report yet.
4. **VPN connection-hour charge.** The notes say a standard VPN has no connection-hour charge. The pricing page's worked example shows a connection fee. The claim is probably wrong. It is not yet fixed.

## 4. Still open (not finished)

- **Questions:** `archive-annex-017`, `durable-dock-007`, `backup-archive-001`, `retention-records-006` and `disaster-bunker-002` still need `postGuide` declarations for `backup-hourly-frequency`. `container-yard-008` needs one for `ecs-min-capacity-0`. `database-registry-009` needs one for `dynamodb-price-cut-2024`. `instance-foundry-009` has an evidence quote that is too short. The questions fixer is still working on these.
- **Labs:** `src/labs/meta.ts` must be regenerated (`npm run gen:meta`) after the lab fixes.
- **Unsourced lab lines (from the labs fixers):** lab 12 Athena "standard S3 rates also apply"; lab 13 c3 "default service role stays in IAM"; lab 3 v1 CLI status "SUSPENDED" (not verified); lab 1 v1 quote is a table-header fragment (weak); lab 3 s8 "grants nothing" is not in its quote; lab 5 lifecycle cites the 128 KB default minimum, which is a post-guide feature and may need `newer`.
- **Notes:** `database-registry 3.3-K8.design[0]` says "massive scale" where the page says "large amounts of data". `counting-house azure[0].breaks` makes an absence claim that was left as is. `cold-cellar` storage-class wording conflicts across three AWS pages; the conflict is in prose only and needs a `contradictions.json` entry with a disagreements block.
- **Quote drift (Lambda):** quotes still using the old "function" wording fail `check:links` in a few buildings and questions. The questions fixer was told to update them.

## 5. Not done (Part C and Part D)

- **Spot-check:** a fresh agent should re-verify a random 5% of "confirmed" verdicts, at least half key-dependent. Not started. If more than 3% are overturned, stop and tell the owner.
- **Blind re-review:** each changed question needs a blind re-review (`scripts/export-blind.ts`, `scripts/score-blind.ts`). Not started.
- **Sweeps:** status labels, rename pairs, in-scope check and `npm run check:content -- --live` are not re-run for this report.
- **Freshness (Part D):** `verifiedAt` dates per source and building, `scripts/check-freshness.ts` and `content/page-hashes.json` are not built.
- **Audit document:** `docs/step-8-audit.md` is not written.

## 6. Checks at last run

- `npm run check:content`: 10 problems at the last run, all in the list above (post-guide declarations, one short evidence quote, `src/labs/meta.ts` stale). The unused `redshift-what-is` source was removed afterwards.
- Other checks (`check:links`, `check:cfn`, `build` + `check:bundle`, `test`, `e2e`, `check:freeplan`, `check:hygiene`) have not been re-run in full after the fix phase.
