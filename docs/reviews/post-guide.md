# Post-guide rewrite and review log (Step 4 Part A)

Cutoff: features introduced on or after **2022-08-01**. Registry: `content/post-guide.json` (51 features, 7 candidates recorded under `preGuide`). Rule and checks: CLAUDE.md "Post-guide rule".

## Process
1. Two dating agents dated every candidate from AWS What's New posts and documentation history pages (quotes verified by `check:links`).
2. `scripts/post-guide-tag.ts` tagged every question whose text matches a registry pattern (96 questions); `scripts/post-guide-label.ts` added `newer` labels to 85 note blocks.
3. `check:content` then listed 49 questions that broke the rule (key on a post-guide feature with the exam-era design among the options) or were post-guide and `mock-reserve`. Four writer agents rewrote them (brief: `docs/post-guide-rewrite-brief.md`).
4. Blind pass (`scripts/blind-ids.ts`): a reviewer who saw no keys answered all 49. 48 agreed; `capacity-meter-004` was flagged ambiguous (reserved capacity needs provisioned mode) and reworded ("taken together"). A second blind pass on the 17 questions changed after the source pass: 17 of 17 agree, none ambiguous.
5. Source pass (`source.md`): 33 OK, 15 FIX, 1 REPLACE. All fixed (below). The blind reviewers answered from knowledge without web lookups; the source pass did the page checks.

## Rewrites (same id, building, bullets, difficulty, tags except the new one)
| Question | Old key | New key |
| --- | --- | --- |
| key-vault-005 | KMS external key store | KMS custom key store on CloudHSM |
| key-vault-015 | SSE-C on a new bucket (blocked by default now) | SSE-C on an existing bucket that accepts it, key sent over HTTPS |
| key-vault-016 | DSSE-KMS | SSE-KMS |
| embassy-row-028, -029, -031 | CloudFront OAC | OAI with a bucket policy |
| identity-keep-007 | passkeys / multiple MFA devices | one MFA device per administrator plus `aws:MultiFactorAuthPresent` |
| identity-keep-026 (reserve) | centralized root access | SCP denying the root user |
| gatehouse-025 (reserve) | regional NAT gateway | one NAT gateway per Availability Zone (zonal Elastic IP constraint) |
| customs-house-018 (reserve) | Large Bandwidth Tunnel option | option removed, key unchanged |
| certificate-office-013 | on-demand rotation as a distractor | key unchanged, distractor and evidence reworded, manual-rotation quote added |
| safe-harbor-account-002 | passkey | FIDO security key |
| single-point-watch-008 | ALB target group health requirements | Route 53 failover alias records with a health check |
| scaling-floodgate-019 | metric math backlog | custom backlog-per-instance metric with target tracking |
| rebuild-yard-012 (reserve) | instance refresh auto rollback | Systems Manager State Manager association |
| message-quay-020 (reserve) | EventBridge Scheduler | EventBridge scheduled rule |
| container-dock-015 (reserve) | EKS Auto Mode | EKS managed node group (custom AMI constraint) |
| cache-edge-breakwater-011 (reserve) | Valkey mentioned in an explanation | mention removed |
| container-yard-004, -009, -011 | SnapStart / EKS Auto Mode | provisioned concurrency (EFS mount constraint) / Karpenter / provisioned concurrency |
| freight-depot-017 | EFS Elastic throughput | Provisioned throughput (Bursting a wrong option) |
| read-replica-annex-013 (reserve) | Aurora global database switchover | reader endpoint of the secondary cluster |
| tuning-bay-017 (reserve) | DynamoDB warm throughput | provisioned mode set to the known peak |
| transfer-dock-004 | DataSync Enhanced mode | Basic mode with an on-premises agent (about 20 million files, under the 50 million Basic quota) |
| transfer-dock-009 | 400 Gbps dedicated connection | LAG of two 10 Gbps connections |
| transfer-dock-012 | DataSync Azure Blob location | DataSync agent with an on-premises object-storage source |
| database-registry-009, -015, -016 (016 reserve) | price cut / on-demand maximum throughput / DMS Serverless | provisioned with auto scaling (reworded) / plain on-demand / Schema Conversion Tool plus DMS replication instance |
| streaming-canal-002, -014 (014 reserve) | zero buffering | five-minute buffer (reworded) / larger buffer size and interval |
| edge-link-terminal-013, -014 (both reserve) | OAC / 400 Gbps mention | OAI / hosted connection wrong option |
| cache-pavilion-003, -007 | ElastiCache Serverless | Redis OSS replication group with Multi-AZ / lazy loading |
| storage-market-009, -011 (011 reserve) | EFS Elastic + Archive / FSx OpenZFS Intelligent-Tiering | Bursting + lifecycle to IA / Regional EFS with lifecycle to IA |
| service-selection-bureau-002, -010; capacity-meter-001, -004 | classic key already; DynamoDB price-cut pattern matched | key unchanged, tagged `post-guide`, `postGuideKey` dropped (capacity-meter-004 reworded) |
| nat-toll-008, -009 (009 reserve) | regional NAT gateway | private NAT gateway per zone / one shared NAT gateway (development) |
| engine-exchange-005, -007 | Aurora I/O-Optimized / DMS Serverless | DynamoDB for key-based access / DMS Multi-AZ replication instance |
| ledger-office-009 (reserve) | cost allocation tag backfill | only the management account activates a tag |
| db-cost-desk-005 | Database Savings Plans | reserved DB instances |
| backup-archive-005 | EBS cold storage | AWS Backup EFS plan with cold storage after 30 days |

Mock reserve is unchanged at 130 questions (39 / 34 / 31 / 26 by domain); no reserve question is post-guide.

## Judgement calls to confirm
- 18 questions still carry `postGuideKey` (the newer feature is the key) because no option shows the exam-era design, which the rule allows. They are excluded from the mock. Examples: embassy-row-030 (OAC), cache-pavilion-001 (Valkey), database-registry-002/-003 and engine-exchange-002/-006 (DMS Schema Conversion), storage-market-003 (EFS Archive), transfer-dock-008/-011, message-quay-004, throttle-lb-gate-007. Say if you want them rewritten too.
- DynamoDB pricing: the on-demand price cut (2024-11) is registered; the five questions whose key depends on provisioned or reserved capacity being cheaper keep the classic key and are tagged.
- Undatable or unconfirmed: `aurora-global-switchover` (approximate), ECS service scaling minimum capacity 0 and AWS Backup hourly frequency (`preGuide`, unconfirmed, treated as older).
