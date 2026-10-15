# Step 3 audit: Step 2 fixes and the question bank

Status: finished and waiting for your review. I have not started Step 4. All checks pass (results at the end).

## 1. Part A: fixes from the Step 2 review

### A1. S3 minimum durations (`c-s3-ia-minimum-duration`)
Not a contradiction. The comparison table on the S3 storage classes page (`storage-class-intro.html`) lists: S3 Standard-IA and One Zone-IA 30 days; S3 Glacier Instant Retrieval and Flexible Retrieval 90 days; S3 Glacier Deep Archive 180 days; 128 KB minimum billable object size for Standard-IA, One Zone-IA and Glacier Instant Retrieval. The other page (the storage decision guide) says S3 "no longer applies a 30-day minimum storage duration for transitions to" Standard-IA and One Zone-IA: that is the lifecycle-transition rule (how long an object must sit before a rule may move it), a different rule from the minimum billable duration. I removed the contradiction entry (no BANNED_TERMS entry existed for it), rewrote the Cold Cellar blocks to state the table values and the transition rule separately, and updated the S3 storage-class pair. A related unsourced claim (a minimum time in Standard before a transition) was dropped (`nv-s3-ia-min-time-in-standard`).

### A2. Verification queue verdicts (each with the AWS sentence)
| Item | Verdict | AWS sentence / resolution | Source |
| --- | --- | --- | --- |
| nv-aws-auto-scaling-plans | dropped | No allowed page says scaling plans are current or recommended. The documentation only says: "You can migrate from a scaling plan to Amazon EC2 Auto Scaling and Application Auto Scaling scaling policies." The notes state only that migration path. | https://docs.aws.amazon.com/autoscaling/plans/userguide/migrate-scaling-plan.html |
| nv-snow-family-availability | confirmed | "AWS Snowball Edge is no longer available to new customers." and "New customers should explore AWS DataSync for online transfers, AWS Data Transfer Terminal for secure physical transfers, or AWS Partner solutions." AWS Snow Family is on the exam guide in-scope list, so it follows the exam-era rule. The availability of other Snow devices is not stated on an allowed page and is not claimed. | https://docs.aws.amazon.com/snowball/latest/developer-guide/whatisedge.html |
| nv-s3-ia-minimum-duration | confirmed | The comparison table on the S3 storage classes page lists a 30-day minimum storage duration and a 128 KB minimum billable object size for S3 Standard-IA and S3 One Zone-IA, 90 days for S3 Glacier Instant Retrieval and Flexible Retrieval (128 KB minimum size for Instant Retrieval), and 180 days for Deep Archive. The storage decision guide sentence "Amazon S3 no longer applies a 30-day minimum storage duration for transitions to Amazon S3 Standard-Infrequent Access and Amazon S3 One Zone-Infrequent Access" is about … | https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html |
| nv-timestream-liveanalytics | confirmed | The Timestream for LiveAnalytics availability change page (2026-10-09) states AWS closed new customer access, that existing workloads are not affected, and recommends Timestream for InfluxDB for new customers. The notes quote it (source timestream-availability). |  |
| nv-ga-no-cache | dropped | No AWS page says Global Accelerator does not cache. The FAQ says: "Global Accelerator improves performance for a wide range of applications over TCP or UDP by proxying packets at the edge to applications running in one or more AWS Regions" and "CloudFront improves performance for both cacheable content (such as images and videos) and dynamic content". The notes state only those contrasts. | https://aws.amazon.com/global-accelerator/faqs/ |
| nv-multiaz-failover-endpoint | corrected | Failover: "Amazon RDS handles failovers automatically so you can resume database operations as quickly as possible without administrative intervention." and "The failover mechanism automatically changes the Domain Name System (DNS) record of the DB instance to point to the standby DB instance." Promotion is a step you take: "You can use read replica promotion as a data recovery scheme if the primary DB instance fails." No sentence found that a read replica has its own endpoint, so that part is dropped. | https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.Failover.html |
| nv-security-hub-cspm-naming | corrected | It is not a plain rename. AWS now has two products: the unified AWS Security Hub (generally available with near-real-time analytics and risk prioritization), which "automatically aggregates and correlates signals from Amazon GuardDuty, Amazon Inspector, AWS Security Hub Cloud Security Posture Management (AWS Security Hub CSPM), and Amazon Macie", and AWS Security Hub CSPM, which "provides automated security best practice checks to help you understand your overall security posture across your AWS accounts". The … | https://aws.amazon.com/blogs/aws/aws-security-hub-now-generally-available-with-near-real-time-analytics-and-risk-prioritization/ |
| nv-shield-advanced-cost-protection | confirmed | "AWS Shield Advanced comes with DDoS cost protection to safeguard against scaling charges resulting from DDoS-related usage spikes on protected EC2, ELB, CloudFront, Global Accelerator, and Route 53 resources." and "If any of these protected resources scale up in response to a DDoS attack, you can request Shield Advanced service credits through your regular AWS Support channel." | https://aws.amazon.com/shield/features/ |
| nv-apigw-edge-acm-region | confirmed | "To use an ACM certificate with an edge-optimized custom domain name, you must request or import the certificate in the US East (N. Virginia) – us-east-1 Region." | https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-specify-certificate-for-custom-domain-name.html |
| nv-dx-lead-time-macsec | corrected | MACsec is confirmed: "For dedicated connections of 10 or 100 Gbps, you can use MAC security (MACsec) as an encryption option." and "AWS Direct Connect is not encrypted by default." Lead time: no page says "weeks"; the classic connection procedure says "It can take up to 72 business hours for AWS to review your request and provision a port for your connection." The weeks claim is dropped. | https://docs.aws.amazon.com/whitepapers/latest/aws-vpc-connectivity-options/aws-direct-connect.html |
| nv-aurora-serverless-v1-eol-date | dropped | No current AWS page that could be fetched states an end-of-life date for Aurora Serverless v1 (the v1 and upgrade pages redirect to a directory page). The date is not used. The notes keep only the sentence about the deprecated product. | https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html |
| nv-database-savings-plans-terms | corrected | The Database Savings Plans pricing page says the plans apply "regardless of engine, instance family, size, deployment option, or AWS Region with no upfront payment", so the All/Partial/No upfront options on the general Savings Plans page do not apply to them. A term length specific to Database Savings Plans is not stated on an allowed page, so the notes give none. | https://aws.amazon.com/savingsplans/database-pricing/ |
| nv-cost-allocation-tags-retroactive | corrected | Activation applies going forward by default, but AWS lets you backfill: "Management account users can request a backfill of cost allocation tags for up to twelve months." and "the Project tag is retroactively activated for the prior months". AWS-generated tags: "After the tag is activated, AWS starts applying the tag to resources that are created after the AWS-generated tag is activated." Tag keys can take up to 24 hours to appear and activate. | https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-allocation-backfill.html |
| nv-s3-ia-min-time-in-standard | dropped | No allowed page states a minimum time in S3 Standard before a lifecycle rule can transition objects into Standard-IA or One Zone-IA, and the storage decision guide says S3 no longer applies a 30-day minimum storage duration for transitions to those classes. The claim is not used. | https://docs.aws.amazon.com/decision-guides/latest/decision-guides/choosing-aws-storage-service.html |

Still open (kept out of notes and questions through `keywords` in the queue file, which the question check enforces): nv-quick-naming, nv-ams-label, nv-firehose-eventhubs-capture.

### A3. Exam-era rule
Recorded in CLAUDE.md and `content/exam-era.json`. In-scope services whose status changed (Snow Family devices, FSx File Gateway, Aurora Serverless v1) may be answers only with a stated availability and source and never when the answer depends on the status; the question checks enforce this (`era` field, availability source in evidence, no status wording in any stem or option). No question uses them as a key. Services not on the in-scope list (App Runner, Timestream, Elastic Disaster Recovery, and, found during review, Service Quotas, Application Auto Scaling and Amazon MemoryDB) are rejected in stems and options by the checker; notes keep App Runner and Timestream as context only. The notes for Snow Family, App Runner, FSx File Gateway, Timestream for LiveAnalytics and Aurora Serverless v1 carry the availability wording with its source. CloudTrail Lake is also closed to new customers (found in review); no note or question uses it.

### A4. Status labels
All ten `deprecated` labels were audited. A new status `closed` ("Closed to new customers") now exists next to preview, deprecated and retired. Changes: mixed blocks were split so the label sits only on the specific claim in freight-depot (FSx File Gateway, closed), ingestion-gate, transfer-dock and haul-hybrid-customs (Snowball Edge, closed), container-dock (App Runner, closed), network-cost-audit and service-selection-bureau (Aurora Serverless v1, deprecated) and the Timestream closure blocks in purpose-built-workshop, database-registry and service-selection-bureau (closed). Labels left unchanged: tuning-bay (deprecated claim already a single sentence).

### A5. Carry-forward
Infrastructure as code and TLS primers are closed in `content/step2-carryforward.md`: covered by Rebuild Yard (immutable infrastructure, CloudFormation) and Certificate Office (TLS certificates, ACM). No new Foundation.

### A6. Source re-read of the last Step 2 edit round
Two independent source reviewers re-read every block changed in the last round. Square/Citadel/Harbor: 9 findings fixed (embassy-row same-account rule, two Azure comparison claims, Shield Response Team support-plan condition, two unsupported "closest match" claims, alias record, an unquoted EC2 contrast). Express/Treasury: 39 findings fixed (Learn wording attributed to Learn, unsourced causal claims trimmed, missing quotes added, "AWS-operated" Local Zones wording removed, throughput qualifiers restored). Results are in `docs/reviews/step2-reread/`.

## 2. The question bank

**1,011 questions: 881 live and 130 mock-reserve, over 69 buildings.** 50 Foundation questions (10 for each of the five Foundations) plus 961 domain questions. Full counts per bullet, building and domain are in `docs/step-3-stats.md` (generated; every one of the 189 bullets has at least 3 live questions and every building at least 8).

### Domain shares (Foundations excluded)
| Domain | Total | Share | Live | Live share | Reserve |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 Secure (Citadel) | 284 | 29.6% | 245 | 29.5% | 39 |
| 2 Resilient (Harbor) | 244 | 25.4% | 210 | 25.3% | 34 |
| 3 High-Performing (Express) | 227 | 23.6% | 196 | 23.6% | 31 |
| 4 Cost-Optimized (Treasury) | 206 | 21.4% | 180 | 21.7% | 26 |
Targets 30/26/24/20, tolerance 2 points: all within. About 930 was your choice; the total is 961 domain questions because the hard minimums (3 per bullet, 8 per building) in Treasury (64 bullets, 20 buildings) force the size.

### Mix
- Format: 815 multiple choice (80.6%), 196 multiple response (19.4%).
- Difficulty: level 1 199 (19.7%), level 2 536 (53.0%), level 3 276 (27.3%).
- Multiple choice answer positions (authored order, shuffled again at render time): option 1 28.0%, option 2 25.9%, option 3 24.4%, option 4 21.7%; the correct option is strictly the longest in 17.2% (limits 35% and 40%). Per district the same ranges hold (see stats file). Multiple response: each position is correct in 36% to 47% of the questions that have it (limit 60%).
- Placement-eligible: 152 (8 on each of the 19 portfolio buildings). Mock reserve: 130, domain-weighted 39/34/31/26 (30.0/26.2/23.8/20.0%), drawn only from buildings that keep their live minimum.
- Trap tags: all 22 don't-confuse pairs are covered (counts in the stats file; for example Direct Connect vs VPN 21, Multi-AZ vs read replicas 20, EBS/EFS/FSx 19, ALB/NLB/GWLB 18).

### Mechanics
New checks in `check:content` (tested in `scripts/questionChecks.test.ts`): per-bullet and per-building minimums, domain shares, missing explanation or evidence, source host, out-of-scope or unknown service names, answer-position skew, longest-correct share, near-duplicate stems (bank-wide), banned terms and open queue items, "all/none of the above", duplicate ids, placement minimum, level-3 share, exam-era rule, availability wording in stems, and a scan that only `src/questions/*` imports question data. `check:links` verifies every evidence quote (7,021 quotes) on the live pages. `src/questions/pool.ts` has the draw modes; a unit test proves no mode except `mock` can return a reserve question. The browser is under Settings only, behind a warning, with no route, and `check:bundle` proves the question data and the reserve tag are absent from the entry chunk; the 390 px and 1280 px layout tests cover it.

## 3. Review results
Every district was reviewed by agents that did not write the questions: a blind pass (stems and options only, shuffled, no keys) and a source pass (key, every explanation, every cited page). After the fixes each district was blind-reviewed again. Logs with every disagreement and resolution: `docs/reviews/square.md`, `citadel.md`, `harbor.md`, `express.md`, `treasury.md` (and the per-building JSON files).

- Blind agreement, first pass: 1,006 of 1,011 keys matched with no ambiguity flag. Five were flagged (engine-works-010; backup-archive-005, cold-cellar-009, storage-market-004 and throttle-lb-gate-005 in Treasury); all five were resolved. After the source-review fixes, every Citadel, Harbor, Express and Treasury question was blind-reviewed again from fresh exports: 11 soft flags (Citadel 4, Harbor 1, Express 2, Treasury 4), each resolved by a stem clarification or a documented reason, logged in the district files. Founders' Square was not re-blinded after its eight source-review edits; those edits only clarified stems and distractors.
- Source pass: no wrong key was found. 142 of 1,011 questions (14%) were marked FIX or DROP: Square 8, Citadel 21, Harbor 21, Express 42, Treasury 50. The most common causes were an invented or impossible distractor, a near-duplicate, a stem that left two options defensible, a missing or irrelevant quote, and wrong numbers.
- Replaced rather than deleted: the 12 DROP verdicts (Express 6, Treasury 6) and the near-duplicate FIX items were rewritten to test a different decision with the same id, bullet and tags, so counts stay as planned. Nothing was dropped without a replacement.
- Systemic findings that became checker rules: Service Quotas, Application Auto Scaling and Amazon MemoryDB are not in the exam guide's in-scope list; CloudFront now offers static (Anycast) IPs, so no "CloudFront has no fixed IPs" distractor; CloudTrail Lake is closed to new customers; literal URLs in stems tripped the external-origin bundle check.

## 4. Eight sample questions (four domains, four multiple response)
#### embassy-row-019 (multiple choice, level 3; bullets 1.1-S4; tags none)

An administrator detaches the FullAWSAccess SCP from the organization root and attaches a new SCP whose only statement denies organizations:LeaveOrganization. Afterward, users and roles in every member account lose access to all services. Which change restores access while keeping the restriction with the LEAST amount of change?

- **A.** Add an Allow statement for the needed services to the new SCP so that an allow exists at the root
- **B.** Attach the AdministratorAccess IAM policy to every user and role in the member accounts
- **C.** Move all member accounts into a new OU directly under the root
- **D.** Attach the new deny SCP to each OU instead of the root

**Key:** A

- A (correct): A permission needs an explicit allow at every level, and a deny-only SCP at the root blocks every service.
- B (wrong): IAM policies cannot grant what the SCPs do not allow, and the change would be repeated in every account.
- C (wrong): The new OU still sits under a root that has no allowing SCP, so every action stays blocked.
- D (wrong): Without an allow at the root and at each level, access stays blocked, and there are more attachments to maintain.

Evidence sources: orgs-scp-eval

#### key-vault-007 (multiple response, choose 2, level 2; bullets 1.3-K4; tags trap:kms-vs-cloudhsm)

A company runs a payment signing application against an AWS CloudHSM cluster because the application needs single-tenant HSMs. The cluster must stay available if one Availability Zone fails, and throughput must grow as load increases. Which TWO actions meet these requirements? (Choose two.)

- **A.** Create a second cluster in the same Availability Zone as the first one
- **B.** Place the HSMs of the cluster in at least two Availability Zones
- **C.** Create IAM roles for the HSM users so that AWS recovers the cluster after an outage
- **D.** Add more HSMs to the cluster as load grows
- **E.** Replace the cluster with AWS managed KMS keys that provide the same single-tenant HSMs

**Key:** B and D

- A (wrong): Both clusters would fail together if that Availability Zone failed, so availability is not improved.
- B (correct): Spreading the HSMs of a cluster across Availability Zones provides redundancy and high availability.
- C (wrong): The company controls its own HSM user management outside of IAM roles, and IAM roles do not add availability.
- D (correct): Adding more HSMs to a cluster provides higher performance.
- E (wrong): AWS managed keys are in the standard key store and do not provide single-tenant HSMs under the company's control.

Evidence sources: cloudhsm-clusters, cloudhsm

#### scaling-floodgate-010 (multiple response, choose 2, level 3; bullets 2.1-K9, 2.1-S2; tags none)

A web application runs in an Auto Scaling group behind an Application Load Balancer with a target tracking policy. New instances take several minutes to warm their caches. During scale-out, each new instance immediately receives a full share of requests and responds slowly, and the group then scales out again because the new instances report unrepresentative metrics. Which TWO actions address these problems with the LEAST operational overhead? (Choose two.)

- **A.** Enable slow start mode on the target group
- **B.** Switch the target group to the least outstanding requests routing algorithm
- **C.** Set an instance warmup time for the target tracking scaling policy
- **D.** Increase the deregistration delay on the target group
- **E.** Turn on sticky sessions so that users stay on the instances that are already warm

**Key:** A and C

- A (correct): Slow start gives new targets time to warm up by increasing the requests they receive gradually instead of sending a full share at once.
- B (wrong): Slow start cannot be enabled with the least outstanding requests algorithm, so this blocks the fix for the overloaded new instances.
- C (correct): A warming instance is not counted in the aggregated metrics of the group, so unrepresentative values do not trigger further scale-out.
- D (wrong): The delay applies when targets are removed and has no effect on how new instances are warmed up.
- E (wrong): Stickiness binds a session to a target and does not limit how many new requests a freshly registered instance receives or what its metrics report.

Evidence sources: alb-target-attrs, asg-target-tracking

#### database-registry-013 (multiple response, choose 2, level 3; bullets 3.3-K8, 3.3-S4; tags placement-eligible)

A company is designing a subscription platform on AWS. Order management needs a relational model with SQL joins across customers, plans and invoices. The user-preference service reads and writes one small record per user by user ID, with traffic that is hard to predict and no need for joins. Which TWO choices BEST fit these requirements? (Choose two.)

- **A.** Store the order management data in an Amazon DynamoDB table and rebuild the joins in application code
- **B.** Store the order management data in Amazon Redshift and run the order transactions there
- **C.** Store the order management data in an Amazon Aurora cluster
- **D.** Store the user preferences in Amazon Aurora on one large writer instance sized for the peak
- **E.** Store the user preferences in an Amazon DynamoDB table in on-demand mode

**Key:** C and E

- A (wrong): NoSQL databases have different access patterns than relational ones, so the joins would be rebuilt by hand.
- B (wrong): Redshift is a data warehouse for large-scale analytics and not a transactional database for order processing.
- C (correct): Structured business objects that need SQL joins fit a relational database such as Aurora.
- D (wrong): The writer would be sized by guesswork for traffic that is hard to predict, and it sits idle in quiet periods.
- E (correct): Lookups by user ID fit a key-value database, and on-demand mode absorbs unpredictable traffic without capacity planning.

Evidence sources: msa-data-store, database-decision, dynamodb-capacity

#### transfer-dock-004 (multiple choice, level 3; bullets 3.5-K6, 3.5-S3; tags none)

A company must copy a dataset of about 400 million small files from an on-premises NFS server to Amazon S3 as quickly as possible, with the LEAST operational effort. The company has chosen AWS DataSync for the copy. Which DataSync configuration meets these requirements?

- **A.** A Basic mode task that uses an agent deployed on premises to read from the NFS server
- **B.** Many Basic mode tasks that an operator splits by directory and starts one after another
- **C.** A task that reads the NFS server through an AWS Transfer Family SFTP endpoint without an agent
- **D.** An Enhanced mode task that uses an Enhanced mode agent deployed on premises to read from the NFS server

**Key:** D

- A (wrong): Basic mode tasks are subject to quotas on the number of files and prepare, transfer and verify the data sequentially, which is slower for a dataset this large.
- B (wrong): This adds manual splitting and scheduling work, and each Basic mode task still prepares, transfers and verifies sequentially.
- C (wrong): Transfer Family is a separate file transfer service, and it is not a DataSync source location, so the copy would not run as a DataSync task.
- D (correct): Enhanced mode handles virtually unlimited numbers of objects and lists, prepares, transfers and verifies the data in parallel.

Evidence sources: datasync-modes

#### cold-cellar-010 (multiple choice, level 3; bullets 4.1-K10, 4.1-S8; tags placement-eligible, trap:s3-storage-classes)

An Amazon S3 bucket holds 6 million event files of about 12 KB each and a set of 200 MB report archives. A lifecycle rule moves every object to S3 Standard-IA after 30 days. Weeks later the archives are in Standard-IA, but every 12 KB event file is still in S3 Standard and no error was reported. The company wants lower storage cost for the event data without paying transition request charges that exceed the savings. Which solution is the MOST cost-effective?

- **A.** Change the lifecycle rule so that it moves the event files to S3 Glacier Flexible Retrieval instead
- **B.** Add an object size filter that allows the 12 KB files to be transitioned, and keep the 6 million files as separate objects
- **C.** Combine the event files into larger objects before storing them, and let the lifecycle rule transition the larger objects
- **D.** Upload the event files directly to S3 Intelligent-Tiering so that S3 moves them to the cheaper access tiers

**Key:** C

- A (wrong): The default behavior prevents objects smaller than 128 KB from being transitioned to any storage class, so the files would still stay in S3 Standard.
- B (wrong): A transition request is charged for each object, so 6 million transitions can exceed the savings, and transitioning objects under 128 KB is not recommended.
- C (correct): By default, lifecycle does not transition objects smaller than 128 KB, and aggregating many small objects into fewer large ones reduces overhead costs.
- D (wrong): Objects smaller than 128 KB are not monitored and are not eligible for auto-tiering, so the files would not reach the cheaper tiers.

Evidence sources: s3-lifecycle-transitions, s3-storage-classes

#### storage-market-009 (multiple response, choose 2, level 3; bullets 4.1-K9; tags placement-eligible)

A content team shares a Linux file system over NFS. It is accessed in unpredictable bursts, its average throughput is a small fraction of its peak, and most files are not read for months. The company wants the LOWEST cost without changing the applications. Which TWO actions meet these requirements? (Choose two.)

- **A.** Use Provisioned throughput set to the peak the team expects
- **B.** Keep every file in the Standard storage class so that all reads are served from one class
- **C.** Use Elastic throughput on an Amazon EFS file system
- **D.** Move the files to Amazon S3 and have the applications call the S3 API
- **E.** Turn on EFS lifecycle management to move unused files to the Infrequent Access and Archive classes

**Key:** C and E

- A (wrong): You are charged for the throughput enabled for the file system, even when bursts are rare.
- B (wrong): Rarely read files would stay in the most expensive class instead of moving to cheaper ones.
- C (correct): Elastic throughput suits spiky or unpredictable workloads, and the company pays only for the data read or written.
- D (wrong): The applications must not change, and S3 is not mounted over NFS.
- E (correct): Files that are not accessed move to lower-cost classes based on when they were last accessed.

Evidence sources: efs-performance, efs-lifecycle

#### pillar-plaza-005 (multiple choice, level 2; bullets none (Foundation); tags none)

A company serves its web application from one very large Amazon EC2 instance. Every failure or reboot takes the whole site down. The reviewers want a design change that follows the Reliability design principles. Which solution is the BEST fit?

- **A.** Move the application to the largest available instance size in its current zone
- **B.** Attach additional EBS volumes to the existing instance to add more storage
- **C.** Take a manual snapshot of the instance every week and keep it in Amazon S3
- **D.** Use several smaller instances in an Auto Scaling group behind a load balancer

**Key:** D

- A (wrong): One bigger instance is still a single point of failure, so a failure still takes the site down.
- B (wrong): More volumes add storage, not a second compute resource, so the instance remains a single point of failure.
- C (wrong): Snapshots help recovery, but the site still goes down on every failure and recovery is manual.
- D (correct): Spreading requests across multiple smaller resources reduces the impact of a single failure on the overall workload.

Evidence sources: waf-rel-dp



## 5. Things I am unsure about, and deviations
- **Reviewer independence.** The blind and source reviewers are agents of the same model family as the writers, working from the same AWS pages. They caught many real defects, but they are not a human exam candidate. Blind agreement on the final bank is high, which can mean the questions are clear or that the reviewers share the writers' blind spots. A pass by you on a sample (or a timed practice run in Step 4) is the best remaining check.
- **Newer features.** A few questions rest on features newer than the SAA-C03 guide: regional NAT gateway, Large Bandwidth Tunnel on transit gateway VPNs, DynamoDB warm throughput and on-demand maximum throughput, FSx for OpenZFS Intelligent-Tiering, EKS Auto Mode. All are documented and not labelled preview; none is a reserve question that decides a mock on its own. Say if you want them removed.
- **Cost questions without prices.** Cost items are decided from documented properties (minimum durations, whether a transfer is charged, which option avoids an idle resource), never from current rates; some Domain 4 items are therefore close to design questions.
- **Data-lake visualization (3.5-S4).** The original four questions did not test the bullet. The replacements test the data-serving side of dashboards (summary tables, result reuse, concurrency scaling, column permissions for the dashboard role) without naming the BI service, because the Amazon Quick naming item is still open.
- **Town Charter, question 1** tests how unanswered questions are scored. It is sourced to the exam guide and kept as a level 1 Foundation question.
- **capacity-meter has 12 live questions** (planned 10) so that 8 DynamoDB placement questions and 3 questions each for RDS Proxy and replication fit; cold-cellar has one multiple-response question of 13.
- **Deviation from the plan sizes:** 961 domain questions instead of "about 930" (hard minimums), 130 reserve questions as planned.
- **Weekly usage limits** interrupted the agents several times; every interrupted run was resumed from saved work and all files pass the checks, so nothing was lost.
- Commits use your noreply address and contain no model name; `check:hygiene` passes on 93 commits.

## 6. Check results (final run)
| Check | Result |
| --- | --- |
| `tsc` app and node projects | clean |
| `npm run lint` | clean |
| `npm test` (Vitest, unit and DOM) | 13 files, 136 tests pass |
| `npm run check:content` and `-- --live` | OK (4 domains, 14 tasks, 189 bullets, 69 buildings, 97 roads, 1,011 questions) |
| `npm run check:links` | OK (607 sources, 7,021 quotes verified) |
| `npm run build` and `check:bundle` | OK (dev hooks absent, no external origins, strict CSP, local fonts, split chunks, question data in lazy chunks only) |
| `npm run check:hygiene` | OK (452 files, 93 commits) |
| `npm run test:layout` | OK (74 checks at 390 px and 1280 px, including the question browser) |

I will not start Step 4 until you approve this step.
