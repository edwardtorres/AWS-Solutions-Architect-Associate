# Source review: purchase-planner

Pages: `ec2-on-demand`, `ec2-spot`, `ec2-purchasing`, `ec2-ri-scope`, `ec2-ri-classes`, `savings-plans-types`, `savings-plans-vs-ri`. All 15 rule quotes were checked against the cached live text: every quote is present verbatim. No prices or discount figures appear in rule text, stories or exhibits (the pages do contain "up to 66% / 72%", unused). Post-guide: nothing matches the registry (Database Savings Plans, which the `savings-plans-types` page also lists, is not mentioned). Evaluator: the commit/term/interruption/capacity/change branches match the rules; the refusals (extras, capacity with no commitment, tolerates + commitment, short/unknown term with a commitment, unsupported combinations) are right.

## Rules

| item | verdict | issue | suggested fix |
| --- | --- | --- | --- |
| od-no-commitment | OK | Quote on page. | none |
| od-short-term | OK | Quote on page. Text says "short-term, irregular", but it also appears in the trace of 003 (steady, years-long, no commitment allowed), where the decisive rule is od-no-commitment. | In the trace keep only od-no-commitment for long-term workloads, or word the note accordingly. |
| spot-interruptible | OK | Quote on page. | none |
| spot-notice | FIX | The quote is the rebalance-recommendation sentence; it mentions the two-minute notice only in passing. The page has a direct sentence. | Use "Amazon EC2 provides a Spot Instance interruption notice, which gives the instance a two-minute warning before it is interrupted." |
| sp-term-usage, ri-term-config | OK | Quotes on `ec2-purchasing`. | none |
| ri-zonal-capacity, ri-regional-no-capacity | OK | Quotes on `ec2-ri-scope`. | none |
| ri-convertible, ri-standard-fixed | OK | Quotes on `ec2-ri-classes`. | none |
| compute-sp-flex, compute-sp-serverless | OK | Quotes on `savings-plans-types`; texts match (note: both Compute and EC2 Instance plans apply across OS and tenancy). | none |
| sp-no-exchanges | OK | Quote on `savings-plans-vs-ri`. | none |
| ec2-sp-family-region, ec2-sp-within-family | OK | Quotes on page; text matches. | none |
| Missing rule: Savings Plans do not reserve capacity | FIX | Scenario 010 keys a Reserved Instance because capacity is needed, but no rule says Savings Plans give no capacity. `ec2-purchasing` has: "If you require a capacity reservation, purchase Reserved Instances or Capacity Reservations for a specific Availability Zone." | Add that quote as a rule and cite it in the trace for 009 and 010. |
| Missing rule: EC2 Instance vs Compute Savings Plans | FIX | When family and Region stay fixed, both plan types fit; the evaluator returns EC2 Instance without any rule that breaks the tie (007, 008, 017). The `savings-plans-vs-ri` table lists a higher saving for EC2 Instance in exchange for the narrower commitment, and `plan-types` says Compute "provide the most flexibility". | Add a rule from `savings-plans-vs-ri` or `plan-types` (no figures in the text), and state in the stories "the largest saving for a commitment that stays in the family and Region". Otherwise refuse these cases. |

## Scenarios

| item | verdict | issue | suggested fix |
| --- | --- | --- | --- |
| purchase-planner-001 | OK | On-Demand: no commitment, no interruption. | none |
| purchase-planner-002 | OK | Spot: fault tolerant, no commitment. | none |
| purchase-planner-003 | OK | Long and steady, but no commitment allowed: On-Demand. | none |
| purchase-planner-004 | OK | Interruptible, no commitment: Spot. | none |
| purchase-planner-005 | OK | Fargate and Lambda: Compute Savings Plans only. | none |
| purchase-planner-006 | OK | Region and family change: Compute (table says Region-wide pricing is Compute only). | none |
| purchase-planner-007 | FIX | USD per hour, family and Region fixed, sizes change: Compute Savings Plans also fit, so the key (EC2 Instance) is an unbroken tie. | See the missing-rule row; add the "largest saving" criterion or key Compute. |
| purchase-planner-008 | FIX | My view on the blind flag: agreed, it is a tie. The `savings-plans-vs-ri` table shows Compute and EC2 Instance both apply to any tenancy or OS, and the story gives no reason to prefer the narrower plan. | Add the "largest saving while staying in one family and Region" criterion and the rule above. |
| purchase-planner-009 | FIX | Reserved Instance (zonal) is right, but the case rests on the unquoted fact that Savings Plans do not reserve capacity. | Add the capacity rule and trace it. |
| purchase-planner-010 | FIX | Same as 009; "either commitment is fine" makes it an explicit test of that fact. | Same fix. |
| purchase-planner-011 | OK | Convertible Reserved Instance; the page confirms exchanges. | none |
| purchase-planner-012 | OK | My view on the blind flag: the key (Reserved Instance) is right. The story states the commitment type itself ("commit to the instance configuration"), and `ec2-purchasing` defines Reserved Instances as that commitment and Savings Plans as USD per hour. | none |
| purchase-planner-013 | OK | Family changes, no exchanges: Compute. | none |
| purchase-planner-014 | OK | Region change, USD per hour: Compute. | none |
| purchase-planner-015 | OK | Interruptible, no commitment: Spot (two-minute notice in story matches). | none |
| purchase-planner-016 | OK | On-Demand. | none |
| purchase-planner-017 | FIX | Same tie as 007 (size and tenancy change in a fixed family and Region; Compute also fits). | Same fix. |

Counts (rows): OK 21, FIX 8, DROP 0. Scenarios: 12 OK, 5 FIX (007, 008, 009, 010, 017). Rules: 3 FIX (spot-notice, missing capacity rule, missing EC2 Instance vs Compute rule).
