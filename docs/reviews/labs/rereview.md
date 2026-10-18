# Lab re-review (Step 7, Part A)

**Scope.** One fresh reviewer, who had written and fixed none of the labs, re-checked only the steps (and cost entries and templates) changed to resolve the 7 high and 47 medium findings of the first review. Input: `rereview-input.md` (steps changed since the review baseline) and the five `resolution-*.md` logs. Findings: `rereview-findings.md`.

**Result of the re-review: 0 high, 9 medium, 36 low (45 in all).**
- All 7 original high findings were judged fixed.
- About 38 of the 47 original medium findings were judged fully fixed; the rest were fixed with a gap, which the 9 medium findings below describe.
- Every "not changed, reason" in the first resolution logs was judged sound.
- The templates are safe for stack deletion.

**The nine medium findings and what was done** (each is in `rereview-resolution-*.md`):
1. Lab 11 `s11`: the CloudTrail console defaults "Log file SSE-KMS encryption" to on, which creates a customer managed KMS key that bills and survives trail deletion. The step now says to leave it off.
2. Lab 11 `c4`/`c4b`: the cleanup deleted every Config rule, recorder and delivery channel in the Region. It now touches only rules named `lab11-*`, lists first, and runs only if the lab created the recorder.
3. Lab 06 `waf`: the instruction to decline AWS WAF came after the distribution was already created. It moved into `distribution`; the WAF billing basis is a callout. `c-oac` cited a quote that did not support its instruction: no AWS page documents deleting an OAC, so the step is optional and says to leave it.
4. Lab 03 `c3`/`c3b`: the member account was closed before it was moved back and the OU deleted. Move and delete now come first; wording about a closed account that stays listed is softened.
5. Lab 02 `s10`: proved nothing (PutObject was already denied by the boundary). It now says plainly what it confirms.
6. Lab 13 `s10`: used `$DST` without assigning it. It is assigned, with a note to edit it in later blocks.
7. Lab 08 `c1`/`c2`: printed a table ARN without `sensitive`. Marked.
8. Lab 14 `s5`/`c5`/`c6`: Cost Explorer cannot be turned off; the opt-outs are optional and split into sourced steps.
9. Lab 12 first step: the lab needs a Paid plan account (Athena is "Paid plan exclusive" on the AWS Free Tier page); the step now says so.

**Lows.** Fixed where cheap (labs 01, 04, 05, 07, 09, 10, 13). Not changed, with reasons in the resolution logs: for example Lab 05's lifecycle day values (the minimum-days sentence is not on the cited pages), Lab 11's delivery-channel quote (no AWS page found), Lab 12's Glue policy path, Lab 14's scriptable tag check (no page documents it).

**Still open after this round (no second re-review was run):** Lab 06's wizard may offer a flat-rate pricing plan that was not checked against the live console; Lab 06's DNS-record and hosted-zone removal advice has no AWS quote; Lab 03's step about closed accounts rests on "no page says" rather than a quote.
