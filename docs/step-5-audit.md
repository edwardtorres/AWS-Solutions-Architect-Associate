# Step 5 audit: answer-history fix and the puzzles

Status: built, awaiting your approval. Step 6 is not started. Full generated tables (rules with their AWS pages, all counts): `docs/step-5-puzzle-facts.md`. Review log: `docs/reviews/puzzles.md`.

## CLAUDE.md
The four Step 4 decisions are recorded under "Owner decisions on Step 4 (approved)". New sections: "Answer history and readiness (save v3)" and "Puzzles (Step 5)".

## Part A: answer history (save v3)
- `game.history[itemId]` = `{n, ok, streak, last, lastOk, lastKind}` (times answered, times correct, current correct streak, last answered time, last result, last attempt type). Updated inside `submitAnswer` and the puzzle play; never trimmed. Item ids are question ids or puzzle ids.
- Readiness needs *ordered recent results per domain*, which a per-item summary cannot give, so I added `game.recent["1".."4"]`: the newest 100 non-puzzle results plus the newest 8 puzzle plays per domain, i.e. exactly what the readiness windows (30 accuracy, 100 coverage, puzzle cap 8) can ever look at. `computeReadiness` reads `recent` only. The 4,000-entry `log` is now just an audit trail; nothing depends on it. (Interpretation of "readiness must not depend on log entries trimming can remove"; say if you want it done differently.)
- Migration `MIGRATIONS[2]` (v2 to v3) rebuilds `history` and `recent` from the v2 log (the only record a v2 save has). Domain comes from the building in the question id. `sanitize` validates the new fields.
- **Tested against a real v2 save:** I played a real session in Chromium on the v2 production build (notes, start-up checks, failed and passed inspections, a placement, a flag; 26 answers) and committed the save as `src/save/__fixtures__/save-v2-real.json` (`scripts/capture-save.ts`). Tests: history equals a recount of the log item by item; `recent` holds counted entries only; readiness computed from the old log and from `recent` is identical; a 4,100-entry log keeps `history` complete while `log` trims to 4,000 and `recent` caps at 100; the migration is idempotent; malformed history/recent is dropped.

## Part B: puzzles
**Rules as built.** A play earns XP like a question (10/20/40, repeats a quarter), counts toward the streak, is logged with attempt type `puzzle`, updates `history` and `recent`, and never writes `buildings` (unit and e2e tests). In each domain the 30-answer window skips all but the 8 most recent puzzle plays (unit tests incl. pruning). A domain still needs 10 counted answers, so puzzles alone cannot produce a readiness value. The Workbench opens once a building is surveyed or beyond; planned buildings show it locked in the panel, the list and the puzzle page.

### Counts (122 scenarios)
| Type | Scenarios | Rules | Buildings | Domains | Levels 1/2/3 |
| --- | --- | --- | --- | --- | --- |
| Policy Court | 26 | 39 | identity-keep 10, embassy-row 13, federation-bridge 3 | D1: 26 | 6/13/7 |
| Packet Tracer | 22 | 56 | gatehouse 8, customs-house 5, grid-planning-office 4, route-tariff 5 | D1: 13, D3: 4, D4: 5 | 4/12/6 |
| Disaster Bunker drill | 16 | 22 | disaster-bunker 14, backup-archive 2 | D2: 14, D4: 2 | 5/7/4 |
| Cold Cellar planner | 17 | 25 | cold-cellar 15, storage-market 2 | D4: 17 | 4/9/4 |
| Purchase Planner | 18 | 18 | counting-house 18 | D4: 18 | 3/10/5 |
| Architecture Builder | 9 | 10 | blueprint-hall 4, single-point-watch 3, cache-edge-breakwater 1, gatehouse 1 | D2: 8, D1: 1 | 2/4/3 |
| Qualifier Sprint | 14 | 56 facts (4 per set) | town-charter 14 | Foundation (no domain) | 2/10/2 |

All minimums are met (spec: 15/15/12/12/12/8/12). Domain 3 has only Packet Tracer (4); Domain 2 has Disaster Bunker and Architecture Builder.

### Evaluators: rules and sources
Every rule is `{text, AWS page, verbatim quote}` and the quote is checked by `check:links`. The complete tables are in `docs/step-5-puzzle-facts.md`; the groups and pages:
- **Policy Court (39 rules):** IAM user guide pages for policy evaluation logic (implicit and explicit deny, same-account union, session policies only limit), cross-account evaluation (both sides must allow), permissions boundaries (never grant; identity ∩ boundary; user ARN vs role ARN vs session ARN in a resource policy), SCPs (never grant, allow needed at every level, Deny anywhere wins, only the governed account's principals, not the management account, Allow only with Resource "*", no Principal), trust and key policies, principal and wildcard matching, condition operators and the four supported keys (`aws:SourceIp`, `aws:MultiFactorAuthPresent`, `aws:SecureTransport`, `aws:PrincipalOrgID`). Eight scenarios come from AWS's own documentation examples (Shirley, the Carlos pair, Nikhil logs/secret, the Demo role pair, SCP examples, the MFA/IP/org-ID key examples).
- **Packet Tracer (56 rules):** VPC user guide: route tables (local, main, longest prefix), internet gateway, NAT gateway, gateway and interface endpoints, security groups (stateful, allow-only, group references), network ACLs (association, order, first match, stateless, ephemeral ports Linux 32768-61000 / Windows 49152-65535 / NAT 1024-65535), VPC peering (route on both sides, no overlap, non-transitive, no edge-to-edge through a peer).
- **Disaster Bunker (22 rules):** the Well-Architected reliability pillar (REL13-BP02) and the AWS DR whitepaper: strict cost order backup and restore < pilot light < warm standby < multi-site; documented RPO/RTO classes (hours / 24 h or less; minutes / tens of minutes; seconds / minutes; near zero / potentially zero) and one building-block rule per documented block. No invented numbers.
- **Cold Cellar (25 rules):** S3 user guide: class choice by documented access frequency and retrieval need, minimum storage durations (30/90/180 days), 128 KB minimum billable size for the IA classes, the lifecycle waterfall (supported moves, none back up, none out of Deep Archive), restore before read for archives, One Zone-IA single-AZ resilience, "less expensive" ordering only.
- **Purchase Planner (18 rules):** EC2 purchasing options, Spot (interruption notice), Reserved Instance classes/scope (zonal reserves capacity), Savings Plans types and what each covers, "capacity needs Reserved Instances or Capacity Reservations"; no discount figures in rule or scenario text.
- **Architecture Builder (10 rules):** ELB (nodes per enabled zone, targets reached by private IP), Auto Scaling across zones, NAT gateway in a public subnet and one per zone, RDS Multi-AZ standby in another zone, RDS private placement, ElastiCache replica in another zone, SQS decoupling. Eight checks, each citing its rules; a constructive reference solution proves every scenario is solvable.
- **Qualifier Sprint:** four sourced facts per set (56), each a verbatim AWS sentence.

### Cases the evaluators refuse (return `null`; `check:content` rejects any scenario that hits one)
- **Policy Court:** NotAction/NotResource/NotPrincipal, policy variables, `?` wildcards, mid-segment `*` in an ARN, other condition keys/operators/values, IPv6, more than one boundary/session/resource policy, a session policy on a user, an SCP with no account or a non-"*" Allow resource, service-linked roles and federated-user principals, trust/key policies naming a whole account, and cases where the answer would differ depending on a boundary or session policy the docs do not settle.
- **Packet Tracer:** IPv6, overlapping-CIDR peering, two different faults at once (blame ambiguous), several security groups none of which allows it, partial reply-port NACL coverage, services as traffic source, public-address access from inside the VPC, bad ports, unknown route targets (Transit Gateway), equally specific routes with different targets, a route to an unattached internet gateway, interface endpoints in another VPC, security-group references across un-peered VPCs. DNS, ICMP, Network Firewall and Transit Gateway are never modelled.
- **Disaster Bunker:** RPO/RTO outside the documented class wording, RPO "minutes" with continuous backups (the docs say backup and restore can reach about 5 minutes), unknown cost-constraint kinds or strategies, targets no strategy meets, block pools with fewer than two right or two wrong blocks.
- **Cold Cellar:** stage lists that are empty or do not start at day 0, unstated re-creatability for monthly reads, unstated retrieval need for archive/quarterly reads, quarterly reads without a millisecond need, unsupported moves (up, out of Deep Archive, sideways), the same class twice in a row, a computed day not among the options, moves into an IA class before day 30, objects under 128 KB in a scenario with a later stage.
- **Purchase Planner:** any undocumented extra requirement, a commitment with a short/unknown term, interruptible plus willing to commit, a capacity need with a USD-per-hour commitment or any expected change, Reserved Instance vs EC2 Instance Savings Plan ties, EC2 Instance vs Compute ties without a stated goal, instance-configuration commitments combined with Region/Fargate/Lambda or OS/tenancy/family changes.
- **Architecture Builder:** a palette that cannot satisfy its checks. **Qualifier Sprint:** an answer that is not one of the options.

### Reviewer disagreements and resolutions
Full log: `docs/reviews/puzzles.md`. Summary: four blind rounds (Policy Court 18/25 then 22/25 then 26/26; Packet Tracer 20/22 then 22/22; Disaster Bunker 12/16 then 16/16; Cold Cellar 5/9, 15/17, 14/17, 17/17; Purchase Planner 7/9 then 18/18; Architecture Builder 9/9 from round 2; Qualifier Sprint 1/7, 8/14, 11/14, 13/14, 11/14 with all answers matching) and a source pass plus a re-check; no scenario was dropped, three Sprint sets were replaced, everything else was fixed in place. Main causes: the Policy Court decider definition (fixed by one uniform rule), blame ambiguity in Packet Tracer, building blocks documented for several DR strategies, Standard-IA/One Zone-IA and Glacier ties in Cold Cellar, EC2 Instance vs Compute Savings Plan ties, and Sprint qualifiers whose stories did not state the deciding constraint.

### One sample per type (answers are computed)
**puzzle-policy-court-003: Shirley creates a user** (identity-keep, level 2)
> Shirley should manage only Amazon S3, Amazon CloudWatch and Amazon EC2, so she has a permissions boundary. Later an administrator attached a policy that allows her to create IAM users.

- What is the result of this request? → **Deny**
- Which policy decided it? An explicit Deny: the policy that holds it. Otherwise: the single policy that, if its… → **Permissions boundary: Shirley's permissions boundary**
- Why: The boundary "Shirley's permissions boundary" has no Allow for this action. → No Allow applies to this request, so it is an implicit deny.

**puzzle-packet-tracer-003: The wrong tier in the rule** (gatehouse, level 2)
> The database security group admits the web tier by name. An application server in a different tier tries to open a database connection over the local network.

- Does this connection attempt succeed? → **No, the connection fails**
- Which one component blocks it? Name the first component on the packet's path that cannot carry it (for a route… → **Security group db-sg**
- Why: app-sub has no explicit route table, so it uses the main route table main-rt. → app-sub has no explicit network ACL, so it uses the default nacl-default. → app-sg allows TCP 5432 to db-1 out of app-1. → app-sub outbound: TCP 5432 to db-1: nacl-default allows everything. → main-rt sends db-1 to local (10.0.0.0/16). → db-sub inbound: TCP 5432 from app-1: nacl-default allows everything. → db-sg has no rule that allows TCP 5432 from app-1 into db-1. → The reply to allowed inbound traffic leaves db-1 whatever its outbound rules say. → The client chooses the reply (ephemeral) ports: Linux uses 32768

**puzzle-disaster-bunker-003: Ferry tickets** (disaster-bunker, level 1)
> A ticketing service needs data loss measured in seconds and recovery in minutes. Pick the least costly strategy.

- Which is the least costly DR strategy that meets both targets and the cost constraint? → **Warm standby**
- Which building blocks does your chosen strategy add to those of the cheaper strategies? Select all that apply. → **A scaled-down but fully functional copy of production, always running in the recovery Region | A failover that only needs scaling up, because everything is already deployed and running | A recovery Region that can serve traffic at reduced capacity immediately**
- Why: Cost and complexity rise in the order backup and restore, pilot light, warm standby, multi-site active/active. → An RPO in seconds is first met by Warm standby. → An RTO of minutes is first met by Warm standby. → The stricter target decides, and the least costly strategy meeting both is Warm standby. → Warm standby also uses the blocks of the two cheaper strategies; only what it adds is selected. → Warm standby adds: A scaled-down but fully functional copy of production, always running in the recovery Region. → Warm standby adds: A failover that only needs scaling up, because everything is alr

**puzzle-cold-cellar-003: Thumbnails that can be redrawn** (cold-cellar, level 1)
> A photo site stores generated thumbnails. For the first month they load constantly. Afterwards each thumbnail is fetched about once a month and must still open instantly. If a thumbnail is lost, a job regenerates it from the original photo. Pick the classes and the day of the move.

- Storage class for stage 1 (set when the objects are uploaded): the least expensive class whose documented use … → **S3 Standard**
- Storage class for stage 2: the least expensive class whose documented use case fits → **S3 One Zone-IA**
- Day (counted from object creation) of the one Lifecycle rule that moves objects to stage 2: the earliest day t… → **Day 30**
- Why: Stage 1: Read more than once a month with millisecond access: S3 Standard. → Stage 2: Read about monthly and can be re-created: S3 One Zone-IA, the less expensive of the two infrequent-access classes. → Stage 2: Read about monthly and can be re-created: S3 One Zone-IA, the less expensive of the two infrequent-access classes. → Stage 1 to 2: S3 Standard to S3 One Zone-IA is a supported move.

**puzzle-purchase-planner-003: Steady, but no promises** (counting-house, level 2)
> A production API runs around the clock and has done so for years. Company policy forbids any purchase commitment, and the API cannot be interrupted. The tempting answer is a plan, but the policy decides.

- Which purchasing model does this profile call for? → **On-Demand Instances**
- Why: No commitment is wanted and On-Demand needs none.

**puzzle-architecture-builder-003: Decouple order intake** (blueprint-hall, level 2)
> An order site must keep taking orders even when the order-processing instances are slow. The processing tier is stateless and runs in private subnets across zones.

- Why: The web/app instances must not have public addresses: they sit in private app subnets behind the load balancer. Instances: 2; in private app subnets: 2. → The stateless web tier must survive the loss of one Availability Zone: run instances in at least two zones. Zones with instances: 2. → Order submission must keep working when the processing tier is slow or down: decouple the tiers with a managed queue: put a queue in the regional row, with at least one app instance in a private app subnet as the worker behind it. Queues in the regional row: 1; app instances in private app subnets (the worker

**puzzle-qualifier-sprint-003: The orders database** (town-charter, level 2)
> A small online shop needs a MySQL-compatible relational database for its orders. The load is flat around the clock and will stay that way for years, and the team prefers not to size or resize instances by hand. Every design below stores the orders correctly; read the qualifier to see which one fits.

- LEAST operational overhead: which design fits best? → **An Aurora Serverless v2 DB cluster**
- MOST cost-effective: which design fits best? → **RDS for MySQL, single instance, with a reserved DB instance covering its constant use**
- MOST secure: which design fits best? → **RDS for MySQL, single instance, in private subnets with storage encrypted using a KMS key**
- HIGHEST availability: which design fits best? → **RDS for MySQL, Multi-AZ DB instance deployment**
- Why: LEAST operational overhead: An Aurora Serverless v2 DB cluster → MOST cost-effective: RDS for MySQL, single instance, with a reserved DB instance covering its constant use → MOST secure: RDS for MySQL, single instance, in private subnets with storage encrypted using a KMS key → HIGHEST availability: RDS for MySQL, Multi-AZ DB instance deployment


(Sample 3 of each type; the full exhibits are in `docs/step-5-puzzle-facts.md`.)

## e2e and axe (production build, `vite preview`, strict CSP)
`npm run e2e`: **28 of 28 pass**, 14 at 1440 px (desktop) and 14 at 390 px (phone, touch, `tap()` only). Step 4 flows (5 per width) plus `e2e/puzzles.spec.ts` (9 per width): one puzzle of each of the seven types solved with the computed answer (XP in the header rises, the stored `buildings` object is byte-identical before and after, the building is still Surveyed), a planned building's Workbench is unavailable in the panel, the list and the puzzle page, and the Workbench list opens a puzzle. axe fails on serious/critical violations; it ran on every puzzle page, the Architecture Builder board and every result screen, the planned panel and the Workbench list: all clean. Page-level sideways scroll is asserted on each puzzle and result page. Axe found two real issues that I fixed: a visible-label/accessible-name mismatch on the board's buttons, and wide exhibit tables forcing page-level overflow at 390 px (exhibits now scroll inside their own focusable region).

## Results
| Check | Result |
| --- | --- |
| `npm run typecheck`, `npm run lint` | clean |
| `npm test` | 409 tests pass (new: 64 Policy Court, 32 Packet Tracer, 21 Disaster Bunker, 31 Cold Cellar, 17 Purchase Planner, 11 Architecture Builder, 17 Qualifier Sprint, 7 puzzle plays incl. readiness cap, 9 migration/history, puzzle DOM tests, route tests) |
| `npm run check:content -- --live` | OK (includes puzzle schema, sources, building/bullet links, minimum counts, refusals, determinism, banned terms, out-of-scope and unknown services, post-guide scan, stale meta) |
| `npm run check:links` | OK: 679 pages, 7,288 quotes (puzzle rules and facts included) |
| `npm run build`, `check:bundle` | OK (puzzle code and data are in lazy chunks) |
| `npm run check:hygiene` | OK |
| `npm run test:layout` | OK: 74 checks |
| `npm run e2e` | 28 of 28 |

## Deviations from the prompt and things I was unsure of
1. **S3 default 128 KB lifecycle behaviour is not encoded.** It is post-guide (registry `s3-lifecycle-default-min-size`), and the post-guide rule says no puzzle may prefer a newer feature. I encoded the established minimum billable size (128 KB for the IA classes) and made the evaluator refuse any scenario with objects under 128 KB and a later lifecycle stage; the two small-object scenarios have a single stage. A first version carried the newer rule with a `newer` tag but no trace ever cited it, so it was removed.
2. **Extra decider options in Policy Court:** "No single policy" (and "several"/"both sides" for same-account and cross-account Allows), needed so every Allow/Deny has one defensible answer.
3. **Purchase Planner goal field** ("largest saving" / "most flexible" / none) is a puzzle device that states the need so documented properties decide between EC2 Instance and Compute Savings Plans; the docs' own "up to X%" figures are in rule quotes (not shown to the player), not in any text.
4. **Disaster Bunker** answers use the documented classes and cost order only. Two scenarios sit in `backup-archive`, and Cold Cellar has two in `storage-market`, because their bullets fit.
5. **Qualifier Sprint is the weakest type.** Answers rest on one sourced fact per qualifier and the stories state the deciding constraint, but several winners still rest on a reading, not a sentence that says "best for X": set 013 (overhead winner: S3 hosting vs fewer CloudFront parts; only three distinct answers), set 007 (overhead quote does not separate versioning-only in words), set 009's cost/availability pair. Last blind round (round 5, all 14 sets): every answer matched its key, but the reviewer still flagged three qualifier calls as arguable: 003 overhead (Aurora Serverless v2 vs plain RDS), 005 cost (snapshot archive tier vs a backup plan) and 007 cost (lifecycle rule on noncurrent versions). Earlier rounds flagged different sets, so more rewording was not converging; I left these open and recorded them in `docs/reviews/puzzles.md`. Decision for you: keep the 14 sets, replace the three, or drop Qualifier Sprint.
6. **Reviewers:** most blind reviewers answered from knowledge without browsing; page checks were done by the source reviewers. Rounds 4 and 5 were run only for Cold Cellar and Sprint; the other types' last blind run is round 2 or 3 (later edits there were wording or traces).
7. **Account IDs** in Policy Court exhibits are symbolic (`ACCT_MAIN`): `check:hygiene` correctly rejects real-looking ARNs; the exhibit says they stand for 12-digit IDs.
8. **Puzzle ids** are `puzzle-<type>-NNN`: unprefixed ids collided with question ids for Cold Cellar and Disaster Bunker (a building and a puzzle type share a name), which would have merged their history.
9. **Streak and XP:** puzzle plays count toward the daily streak and use the same XP table; Town Charter (no domain) plays never affect readiness. Say if you want puzzles excluded from the streak.
10. **Writers and reviewers were agents; a few sources I did not re-open myself** (the evaluators' quotes are machine-verified, their readings were reviewed by a second agent).
11. Commit authorship: commits use the owner noreply address required by `CLAUDE.md`; the repo's stop hook asks for a different author, which I did not apply. The Step 5 commits are local and not pushed.
