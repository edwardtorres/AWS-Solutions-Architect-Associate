# Post-guide candidates (Step 4 Part A input)

Cutoff: features introduced on or after 2022-08-01 are post-guide. Introduction dates below are from memory and must be confirmed against AWS What's New posts or documentation history pages (certainty H/M/L). "Key" = the key depends on it; "other" = a wrong option, explanation or evidence mentions it. P = placement-eligible, R = mock-reserve.

## Key depends on the feature
| Feature | Date (certainty) | Key questions | Other mentions |
| --- | --- | --- | --- |
| S3 Batch Replication (existing objects) | 2023-02 (H) | archive-annex-016, durable-dock-004 | durable-dock-005, archive-annex-017, -018 |
| EFS Elastic throughput | 2022-11 (H) | freight-depot-017, storage-market-009 (P) | |
| EFS Archive storage class | 2023-11 (H) | storage-market-003 (P), storage-market-009 | storage-market-004 |
| FSx for OpenZFS Intelligent-Tiering | 2025 (M) | storage-market-011 (R) | storage-market-004 |
| DataSync Enhanced mode | 2024-25 (M) | transfer-dock-004 | |
| Transfer Family web app | 2024-25 (M) | transfer-dock-008 | |
| DataSync Azure Blob location | 2022-late (L) | transfer-dock-012 | |
| S3 default SSE-S3 on all new objects | 2023-01 (H) | key-vault-010 | |
| KMS external key store (XKS) | 2022-11 (H) | key-vault-005 | key-vault-003, -004 |
| S3 SSE-C blocked by default on new buckets | 2025-26 (M) | key-vault-015 | |
| DSSE-KMS | 2023-06 (H) | key-vault-016 | key-vault-012 |
| Multiple MFA devices per IAM user / passkeys | 2022-11 (H) / 2024-05 (M) | identity-keep-007, safe-harbor-account-002 | |
| Centralized root access management | 2024-11 (H) | identity-keep-026 (R) | |
| S3 Block Public Access Organizations policy | 2025 (M) | compliance-registry-005 | |
| Lake Formation hybrid access mode | 2022-late (L) | compliance-registry-004 | |
| Lambda SnapStart | 2022-11 (H) | container-yard-004 (P) | container-yard-002, -011 |
| EKS Auto Mode | 2024-12 (H) | container-yard-009, container-dock-015 (R) | |
| Lambda event source maximum concurrency (SQS) | 2023-01 (H) | throttle-lb-gate-007 (P) | |
| ASG instance refresh auto rollback | 2022-late/2023 (L) | rebuild-yard-012 (R) | |
| ALB target group health requirements | 2023-11 (M) | single-point-watch-008 | |
| ElastiCache for Valkey | 2024-10 (H) | cache-pavilion-001 | cache-pavilion-002, -009, database-registry-007, -010 |
| ElastiCache Serverless | 2023-11 (H) | cache-pavilion-003, cache-pavilion-007 (serverless replica reads, L) | |
| DMS Schema Conversion | 2022-12 preview, 2023 GA (M) | database-registry-002, -003, engine-exchange-002, -006 | database-registry-001, -006, engine-exchange-001 |
| DynamoDB on-demand maximum throughput | 2024-05 (H) | database-registry-015 (P) | |
| DynamoDB warm throughput | 2024-11 (H) | tuning-bay-017 (R) | |
| DMS Serverless | 2023-06 (H) | database-registry-016 (R), engine-exchange-007 | |
| Aurora I/O-Optimized | 2023-05 (H) | engine-exchange-005 | |
| Aurora Serverless v2 scale to zero | 2024-11 (H) | service-selection-bureau-004 (P) | service-selection-bureau-005 |
| EventBridge Pipes | 2022-12 (H) | message-quay-004 | blueprint-hall-014 |
| EventBridge Scheduler | 2022-11 (H) | message-quay-020 (R) | |
| Regional NAT gateway | 2025-11 (M-H) | gatehouse-025 (R) | nat-toll-008 |
| VPN Large Bandwidth Tunnel | 2025 (M-L) | transfer-dock-011 | customs-house-006, -010, -018 (R) |
| Database Savings Plans | 2025-12 (H) | db-cost-desk-005, -007 | |
| Cost allocation tag backfill | 2024 (L-M) | ledger-office-009 (R) | |
| Athena query result reuse | 2022-08 (M) | data-lake-reservoir-012 | |
| CloudFront origin access control (OAC) | 2022-08-25 (H) | embassy-row-028, -029, -030, -031 (P), edge-link-terminal-013 (R) | |

## Only a wrong option, explanation or evidence mentions it
S3 Express One Zone (durable-dock-001); on-demand KMS rotation (certificate-office-013); Secrets Manager managed external secrets (wardens-lodge-015); Aurora Serverless v2 zero ACU (service-selection-bureau-005); RDS gp3 storage (tuning-bay-006); lifecycle 128 KB default (cold-cellar-010); Firehose zero buffering (streaming-canal-014); Direct Connect 400 Gbps (transit-tariff-005, -007, -008, edge-link-terminal-014, transfer-dock-003, -009); Security Hub unified/CSPM evidence (watchtower-008, archive-annex-010); Cloud WAN (transit-tariff-004); ECS Managed Instances evidence (engine-works-004); Firehose Iceberg evidence (streaming-canal-012); Aurora DSQL evidence (database-registry-004, -017); simplified automatic recovery (legacy-wharf-010).

## Needs dating (the key may depend on them)
AWS Backup cold storage for EBS (archive-annex-006, backup-archive-005; backup-archive-004 wrong option); Aurora Global Database switchover (read-replica-annex-013); Glue sensitive data detection (refinery-004); target tracking metric math for SQS backlog (scaling-floodgate-019); ECS service auto scaling minimum capacity 0 (container-yard-008); RDS Multi-AZ DB cluster (read-replica-annex-011); AWS Backup hourly frequency (disaster-bunker-002, durable-dock-007, retention-records-006, backup-archive-001); Organizations backup policies by tag (durable-dock-008); NAT gateway up to 8 secondary IPv4 addresses (nat-toll-009); DynamoDB pricing changes (capacity-meter-001, -004, -008, service-selection-bureau-002, -003, -010, database-registry-008, -009).

## Naming-only (not tagged)
Amazon Quick, SageMaker AI, IAM Identity Center organization instance.
