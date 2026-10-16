# Source re-check after review fixes (Policy Court, Qualifier Sprint)

Method: every changed rule quote and all 36 quotes of the changed sprint sets were machine-checked as verbatim on the cached live pages (all FOUND). `check-puzzles` passes (122 scenarios) and the policy-court unit tests pass (63). Policy Court scenarios 003, 008, 009, 015, 017, 020, 024 and 026 were run through `def.evaluate` and their traces read against the stories. No content or code was edited.

## Policy Court: changed rules and evaluator

| item | verdict | issue | suggested fix |
| --- | --- | --- | --- |
| principal-identity | OK | Rule text now limited to identity-based policies, matching the quote. `validate` also refuses a Principal in boundary and session policies; no page is cited for those two, but it is a refusal (conservative), not a claim. | None. |
| scp-no-principal | OK | Quote "The following elements aren't supported in SCPs: NotPrincipal Principal" found on orgs-scp-syntax; text equals the quote; evaluator refuses a Principal in an SCP. | None. |
| resource-wildcard | OK | Text now says only "any run of characters, including /", matching the quote. Resource matching is case-sensitive with no cited rule (all scenario ARNs are lowercase, so harmless). | None. |
| resource-wildcard-colon | OK | Quote found. Rule and `validPattern` agree: a `*` followed by a colon (end of a segment) crosses colons; a `*` mid-segment with a colon later in the pattern is refused. | None. |
| cond-cidr | OK | Quote found (CIDR sentence). "IPv4 only here" is a scope statement, enforced by `ipv4()`. | None. |
| cond-ip-operators | OK | Table-row quote found; IpAddress / NotIpAddress behave as stated. A bare address without a prefix is treated as /32 (supported by "specified IP address or range"). NotIpAddress with a missing key is refused. | None. |
| cond-ip | OK | Source-address quote still found; now supported by cond-cidr and cond-ip-operators. | None. |
| decider definition (top of def.ts) | OK | `outcome()` implements it uniformly: single explicit Deny; else the one limiter whose removal flips to Allow; else (no limiter) the single failing-side policy across accounts, the trust or key policy, or the only identity or resource policy in one account; else "implicit". Several equal limiters, or limiter plus missing grant, give null or "implicit" as written. Prompt and option labels now match the definition. | None. |

## Policy Court: spot-checked scenarios

| item | verdict | issue | suggested fix |
| --- | --- | --- | --- |
| policy-court-003 | OK | Deny / boundary. Boundary lacks iam:CreateUser; removing it flips to Allow. Trace shows boundary-limits then implicit-deny. | None. |
| policy-court-008 | OK | Deny / identity. Bool true with no MFA key is false; only one policy exists. Trace cond-mfa. | None. |
| policy-court-009 | OK | Deny / identity. Source 198.51.100.1 is outside 203.0.113.0/24. Trace cond-ip. | None. |
| policy-court-015 | OK | Deny / identity. Trace says the principal side fails and the resource side allows; decider matches. | None. |
| policy-court-017 | OK | Deny / bucket. Delete is not in the bucket policy's list; identity side allows. Decider and trace agree. | None. |
| policy-court-020 | OK | Deny / trust policy, with no Resource element in the trust policy. Trace shows trust-exception. | None. |
| policy-court-024 | FIX | Result and decider (identity) are correct, but the trace is only "implicit-deny". It never says the session policy allows DynamoDB yet cannot grant, or that the role's identity policy has no DynamoDB Allow, which is the lesson of the scenario. | In `core`, when a session policy (or boundary) holds an Allow but no grant exists, push a `session-limits` / `boundary-limits` note ("a session policy only limits, it never grants") and a note that the identity-based policy has no Allow for the action. |
| policy-court-026 | OK | Deny / implicit ("No single policy"): both sides fail, two changes needed. Trace names both failures. | None. |

## Qualifier Sprint: changed sets

| item | verdict | issue | suggested fix |
| --- | --- | --- | --- |
| 001 steady internal API | OK | Availability now two Regions with failover routing (clearly above Lambda's in-Region multi-AZ). Overhead, secure, available quotes fit. Cost quote ("also applies to Fargate and Lambda usage") alone states no saving, but the story (constant load, three years) and the page's preceding "lower prices" sentence make b the clear cost winner. | Optional: quote "Savings Plans offer a flexible pricing model that provides savings on AWS usage." |
| 002 transcoding videos | OK | Batch (overhead), Spot for retryable jobs (cost), interface endpoint (secure), explicit three-AZ Auto Scaling group (available; the Batch option is one subnet). No unfair winner. | None. |
| 003 orders database | OK | Story now says the team does not want to size instances, which makes Aurora Serverless v2 the overhead winner. Reserved DB instance for flat load, encrypted private-subnet instance, Multi-AZ standby all fit. Secure quote covers encryption at rest only; the private subnets in d carry the rest, and no other option states either. | None. |
| 004 session store | OK | Cost quote is now TTL "cost-effective method for deleting items", and only a includes TTL while the story says finished sessions pile up. Secure now uses the gateway-endpoint page ("without requiring an internet gateway or NAT device"), which only d has. On-demand (overhead) and global table (available) fit. | None. |
| 007 database password | FIX | Cost winner b (Parameter Store standard parameter): the quote only says advanced parameters incur charges and can be recreated as standard; it never states that standard parameters cost nothing, while the option text and the fact text claim it. Other options fit (rotation, VPC endpoint only in d, replication). | Quote the page's tier table row "Cost No additional charge Charges apply" (parameter-store-advanced-parameters), or the sentence "Advanced parameters incur charges." plus the standard row. |
| 009 private servers and S3 | FIX | Overhead winner b ("one NAT gateway for the whole VPC") rests on "The route table for each subnet determines how traffic is routed", which does not say fewer gateways or routes means less work; b wins only by inference. Cost (gateway endpoint, heavy S3 flow in the story), secure (d alone locks the bucket to the endpoint) and available (a, per-zone gateways) fit. | Overhead: have the fact say what the page says, that adding a gateway per zone is the resiliency step (quote "Alternatively, you can improve resiliency by creating a NAT gateway in each Availability Zone..."), so b is the baseline with nothing extra to build; or reword the qualifier line in the story to "fewest resources to build and keep". |
| 011 container service | FIX | Available winner b: the quote ("monitors the health of its registered targets, and routes traffic only to the healthy targets") is true for every option, since the story already puts all of them behind a load balancer. The real differentiator, three Availability Zones, is not in the quote. | Use a quote that supports spreading tasks across Availability Zones (for example an ECS service or Auto Scaling "spans multiple Availability Zones" sentence), or keep this quote and add the zone sentence as a second quote. |
| 012 Windows file share | OK | HDD quote now matches the cost option; secure quote lists AD, KMS and CloudTrail integration, which are the features c adds; Multi-AZ standby for available. Overhead d versus a is close (both fully managed), but d is the default-settings baseline and no option beats it. | None. |
| 013 office to six VPCs | FIX | Secure winner d (Direct Connect with IPsec VPN) is not clearly stronger than the VPN options a and b, which are also IPsec-encrypted; the story has no constraint that traffic must stay off the public internet. The dx-encryption quote does not rank d above an internet VPN on security. Overhead (transit gateway, no circuit to order), cost (Direct Connect for a large steady flow) and available (separate devices) fit. | Add to the story "traffic must be encrypted and must not cross the public internet", so d is the only option meeting both; or change a and b so the difference is explicit. |

## Counts

Policy Court rules and evaluator: 8 items, OK 8, FIX 0. Policy Court spot-check scenarios: 8 items, OK 7, FIX 1 (024, trace only). Qualifier Sprint sets: 9 items, OK 5 (001, 002, 003, 004, 012), FIX 4 (007, 009, 011, 013).

Total: 25 items, OK 20, FIX 5. Quotes: all 36 sprint quotes and all 7 changed Policy Court quotes verbatim on their pages.
