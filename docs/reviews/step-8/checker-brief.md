# Checker brief (Step 8, Part C)

You are an independent fact checker. You did not write this content and you have not seen any other checker's verdicts. Your job is to decide, claim by claim, whether the **cited page text actually supports the claim**. `check:links` has already proved that each quote exists on its page (or flagged that it does not); it does not prove the quote supports the claim.

## Rules
- Judge only from the page text you are given (`window`) or from a fresh read of the cited page (`npx tsx scripts/q.ts "<url>" "<regex>" ["<regex>"]` prints matching sentences from the current cached page; `FRESH=1` in front refetches it). **Never judge from memory.** If a page you need cannot be read, stop and say so in your final message; do not guess.
- Allowed sources only: docs.aws.amazon.com and aws.amazon.com, and learn.microsoft.com for the Azure side of "Coming from Azure" claims.
- Read every number, limit, quota, duration, default, date, condition ("only", "always", "by default") and exception in the claim and match it against the page. A claim that is more general, more absolute or more specific than its quote is **unsupported**.
- Do not edit any file in the repository. Write only your verdict file and run the record command below.

## Verdicts
- `confirmed`: the page text supports the claim as worded (numbers, conditions and all). For a question: the keyed option(s) are right, every wrong option is clearly wrong according to the documentation, and the explanations are supported.
- `wrong`: the page says something that contradicts the claim.
- `unsupported`: the quote is on the page, but it does not establish the claim (too general, a different feature, a missing condition, a number that is not there, a distractor that could also be right).
- `outdated`: the claim was true once but the current page says something different or the status has changed.
- `source-changed`: the quote is no longer on the page (`found: false`) and the claim cannot be confirmed from the replacement text. If the quote moved or was reworded and the claim still holds, give the new verbatim sentence as the `fix` and use `confirmed` only if the claim is fully supported by the current page; otherwise use `source-changed`.

Every verdict that is not `confirmed` needs a `fix`: the corrected claim text and/or the verbatim replacement quote, and for a question the exact change to the key or an option. For `confirmed`, `reason` names the sentence that supports it (short).

## How to work
1. Read the batch file you are given (JSON: `claims[]` each with `id`, `kind`, `text`, `cites[]` with `quote`, `found`, `window`, and a `note`).
2. For each claim, decide a verdict. Be strict and specific; do not rubber-stamp.
3. Write the verdicts as a JSON array `[{ "id", "verdict", "reason", "fix"? }]` covering **every** claim of the batch to a file in the scratchpad, then run:
   `npx tsx scripts/audit/record.ts <batch-file> <verdicts-file>`
   The command refuses an incomplete or malformed file and prints what to fix. Run it once, at the end, with a file that covers all ids of the batch (it skips ids already recorded, so a repeat is harmless).
4. Final message (under 200 words): the batch id, counts per verdict, and one line for each claim that is not `confirmed` (id, verdict, why).
