# Source review: architecture-builder

All 10 rule quotes were machine-checked as verbatim on the cited pages (all present). Verdicts below judge whether the page supports the rule text and whether each check is a fair reading. No content or code was edited.

## Rules
| item | verdict | issue | suggested fix |
| --- | --- | --- | --- |
| rule lb-az-nodes | OK | Quote supports a node per enabled zone. "keeps serving if one zone fails" is an inference, not in the quote. | Optional: trim the rule text to the quoted fact. |
| rule lb-internet-facing | FIX | Quote says only that internet-facing nodes have public IPs. "so they sit in public subnets" is not on the page quoted. The check requires public subnets. | Add an AWS quote that an internet-facing load balancer needs public subnets (ELB subnets page), or reword the rule to the quoted fact. |
| rule targets-private-ip | OK | Quote supports private-IP targets. "so instances can sit in private subnets" is a fair inference; the check only demands instances are private. | None. |
| rule asg-multi-az | OK | Quote matches. | None. |
| rule nat-public-subnet | OK | Quote describes NAT in a public subnet with private subnets routed to it. | None. |
| rule nat-per-az | OK | Quote states the per-zone recommendation with same-zone routing. | None. |
| rule rds-standby | OK | Quote supports a synchronous standby in a different zone. | None. |
| rule db-private-subnets | FIX | Quote is soft ("typically private") and the same page says subnets in a group "are either public or private". The check (db-private) requires private-data for every DB node. A page on keeping the DB off the internet is the real support. | Replace the quote with the RDS page section "Hiding a DB instance in a VPC from the internet", or cite the public-access setting. |
| rule cache-multi-az | OK | Quote matches the two-zone replica need. The "private data subnets" placement is not sourced (see check). | None for the rule. |
| rule sqs-decouples | FIX | Quote supports decoupling only. "regional service, not placed in a subnet" is in the rule text but not in the quote; the check relies on it (queue must be in the regional row). | Add a quote from an SQS page that it is accessed by endpoint/API, or reword to drop the claim. |

## Checks in score()
| item | verdict | issue | suggested fix |
| --- | --- | --- | --- |
| lb-public-multi-az | OK (depends on lb-internet-facing fix) | All ALB nodes public, at least 2 zones: fair reading of both rules. | None. |
| app-private | OK | All app instances in private-app subnets: fair. | None. |
| app-multi-az | OK | At least 2 zones with private instances: fair. | None. |
| nat-per-az | OK | NAT in the public subnet of every zone with private instances; none outside public: fair. Routing is not modelled (cosmetic). | None. |
| db-multi-az | OK | One primary plus a standby in another zone: fair for a Multi-AZ DB instance deployment. It also requires private-data, which belongs to db-private; scenarios using db-multi-az always list the private wording, so it holds. | Optional: drop the tier test from db-multi-az so a check tests one rule. |
| db-private | FIX | Strictly private-data for every DB node is stricter than its quote. | See the db-private-subnets rule fix. |
| cache-multi-az | FIX | Requires 2+ nodes in private-data in 2+ zones. Placement in private data subnets and "node count 2" are not in the quote (primary plus a replica is). | Cite a page on ElastiCache subnet groups, or drop the tier test. |
| queue-decouple | FIX | Passes if one queue sits in the regional row; it does not test that the tiers are decoupled. Weak but not wrong. | Reword the need to "place a managed queue" or add a second queue consumer test. |

## Scenarios
| item | verdict | issue | suggested fix |
| --- | --- | --- | --- |
| 001 | FIX | Story mentions "a relational database" but no check or requirement covers it, which misleads. | Remove the database sentence from the story. |
| 002 | OK | Feasible. | None. |
| 003 | OK | Feasible; "keep taking orders" matches the queue check. | None. |
| 004 | OK | Feasible with 3 zones. | None. |
| 005 | OK | Feasible; story "single zone" is a past state the player rebuilds. | None. |
| 006 | FIX | Story says the web tier "already spans two zones" but the player must place it, and says "no single instance is a single point of failure" while the checks only test zones. | Say "rebuild the web tier and database", drop the "no single instance" claim. |
| 007 | OK | Feasible (extra NAT in palette is a decoy). | None. |
| 008 | OK | Feasible. The database requirement is only in the check text; the story says only "in front of the database". | Optional: mention the Multi-AZ database in the story. |
| 009 | OK | Feasible with 3 zones. | None. |

Post-guide scan: no registry features appear (check-puzzles OK). In-scope service names: ALB, EC2 Auto Scaling, NAT gateway, RDS, ElastiCache, SQS are all in scope.

Counts: OK 19, FIX 8 (3 rules, 3 checks, 2 scenarios), DROP 0.
