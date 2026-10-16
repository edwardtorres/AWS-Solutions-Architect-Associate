# Source review: disaster-bunker

Pages: `dr-options` (Disaster recovery options in the cloud), `dr-reliability-strategies` (REL13-BP02). All 23 rule quotes (and all 14 block quotes) were checked against the cached live text: every quote is present verbatim. Post-guide: nothing in the text, rules or scenarios matches `content/post-guide.json`; no availability wording. Evaluator: the class mapping (stricter of RPO/RTO class decides), the at-most / cheaper-than ceilings and the refusals (unknown class, PITR with an RPO in minutes, bad pool) behave as the rules say.

## Rules

| item | verdict | issue | suggested fix |
| --- | --- | --- | --- |
| cost-order | OK | Quote on page; text matches. | none |
| class-backup-restore / class-pilot-light / class-warm-standby / class-active-active | OK | Four quotes on the REL page; text says no more than the quote. | none |
| tradeoff | OK | Quote on page. "least costly strategy meeting both" is the puzzle's reading of the trade-off sentence plus cost-order; acceptable. | none |
| pitr-backups | OK | "5 minutes" is in the quote. Refusal is correct. It never changes an answer in the scenarios (an RTO of 24 hours or less is the only B&R-compatible RTO). | none |
| blocks-cumulative-warm / blocks-cumulative-active | OK | Page says "services", rule text says "blocks"; same idea. | none |
| block-pit-backups, block-backup-copy, block-iac-redeploy | OK | Quotes in the Backup and restore section. | none |
| block-ami-copy | FIX | Quote is in Backup and restore, but the Pilot light section also says to copy AMIs to the primary and backup Regions ("copy these to both your primary and backup Regions"). Keyed as B&R-only, so it is a contestable distractor in pilot-light scenarios (010). | Do not use ami-copy as a distractor in a pilot-light or warm-standby scenario; keep it only as a key for backup and restore or as a distractor for active/active. |
| block-cont-replication | OK | Quote is in the Pilot light section. The B&R section also shows S3 CRR but says "Continuous replication is covered in the AWS Services for Pilot Light section", so keying it to pilot light is supported. | none |
| block-data-tier-on, block-app-servers-off | OK | Pilot light section, verbatim. | none |
| block-dns-failover | FIX | Page presents Route 53 health-check failover as "one option" among Route 53/ARC, weighted records, Global Accelerator and CloudFront, warns that automatic failover "should be used with caution" and says manually initiated failover is common. Keying it as something pilot light "adds" is stronger than the page. | Drop it from keyed sets (use it only as a distractor against backup and restore), or reword the label to "a traffic-management option such as Route 53 health checks" and do not make it required. |
| block-scaled-down-stack | OK | Quote right. Note the Pilot light section also says to deploy "a scaled down version of your core workload infrastructure"; the label's "fully functional, always running" keeps the distinction. | Optional: keep the full label in every pool. |
| block-scale-up-failover, block-reduced-capacity-traffic | OK | Quotes on the pages; contrast with pilot light is exactly what they say. | none |
| block-all-regions-serve, block-user-routing-policies, block-multi-region-writes | OK | Quotes verbatim. Routing policies are also usable for active/passive on the page, but the quote is specific to active/active. | none |
| Evaluator, cost constraint | OK | The trace never cites a rule for at-most / cheaper-than (it relies on cost-order). | Optional: add `cost-order` note naming the ceiling. |

## Scenarios

| item | verdict | issue | suggested fix |
| --- | --- | --- | --- |
| disaster-bunker-001 | OK | B&R; keys pit-backups, backup-copy, iac-redeploy are all in the B&R section. | none |
| disaster-bunker-002 | OK | Pilot light by RTO (tens of minutes); keys cont-replication, data-tier-on, app-servers-off. scaled-down-stack distractor is fine. | none |
| disaster-bunker-003 | OK | Warm standby; keys match the pages. | none |
| disaster-bunker-004 | OK | Active/active; keys match. | none |
| disaster-bunker-005 | OK | Obvious guess (B&R from "hours") is wrong, RTO decides. Correct by the class table. | none |
| disaster-bunker-006 | FIX | Near-zero RPO with a 24-hour RTO is keyed active/active, but the page itself says continuous replication is "the shortest time (near zero)" for backing up data and that pilot light's continuous replication is "the best approach for low RPO". Docs support a different reading (pilot light), so "the class table decides" is a puzzle convention, not a documented fact. | State in the story/exhibit that the targets are to be read against the documented class table (RPO near zero is the active/active class), or replace with a scenario where no other reading exists. |
| disaster-bunker-007 | OK | Warm standby from RPO seconds. | none |
| disaster-bunker-008 | OK | Warm standby; RTO "minutes" is not met by pilot light (tens of minutes). | none |
| disaster-bunker-009 | FIX | Keyed set is data-tier-on, app-servers-off, dns-failover; see block-dns-failover. The blind reviewer left dns-failover out and the page supports that (failover is one option, manual is common). | Remove dns-failover from the keys; pool it as a B&R-level distractor or drop it. |
| disaster-bunker-010 | FIX | Two problems: dns-failover keyed (as above) and ami-copy offered as a wrong option although the pilot-light text also copies AMIs across Regions. Blind reviewer flagged both. | Replace ami-copy and dns-failover in the pool with unambiguous distractors (for example pit-backups, user-routing-policies) and key only cont-replication and data-tier-on. |
| disaster-bunker-011 | FIX | Same dns-failover issue (blind reviewer keyed only cont-replication, app-servers-off). Pool also contains iac-redeploy and pit-backups, which pilot light also uses, but they are correctly "not added". | Remove dns-failover from the key set; add another wrong block from warm standby or active/active. |
| disaster-bunker-012 | OK | At-most warm standby; need is warm standby; ceiling respected. | none |
| disaster-bunker-013 | OK | Cheaper than active/active still allows warm standby. | none |
| disaster-bunker-014 | OK | RTO class decides. | none |
| disaster-bunker-015 | OK | Backup and restore keys include ami-copy; the B&R section says to back up AMIs and that an AMI can be copied across Regions. Blind reviewer left it out; the page supports it, and no distractor in this pool is B&R. | Optional: say "select all that apply" in the story so a 3-key set is expected. |
| disaster-bunker-016 | OK | Backup and restore with continuous backups at an RPO of hours: PITR only lowers RPO, so no conflict. Story is slightly leading ("backup-focused") but the class table decides. | Optional: drop "Pick the backup-focused strategy" wording. |

Counts (rows): OK 24, FIX 6, DROP 0. Scenarios: 12 OK, 4 FIX (006, 009, 010, 011). Rules: 2 FIX (block-ami-copy, block-dns-failover).
