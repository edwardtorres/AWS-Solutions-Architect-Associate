# Treasury question review

206 questions in 20 buildings (180 live, 26 mock-reserve). Writers: five agents. Reviewers did not write them.

## Blind pass
First pass: 202 of 206 matched the keys; four were flagged (backup-archive-005, cold-cellar-009, storage-market-004, throttle-lb-gate-005).
After the source-review fixes every question was blind-reviewed again from fresh exports: 202 of 206 matched and were unambiguous. Four soft flags, all with the reviewer's picks equal to the key:
- backup-archive-004: the key rests on the documented 90-day minimum for archived snapshots; kept, the documented property decides it.
- cold-cellar-003: stem now says losing the thumbnails in a single Availability Zone failure is acceptable, which settles One Zone-IA.
- nat-toll-008: private NAT is documented as unsupported on regional NAT gateways; kept.
- throttle-lb-gate-005: the Application Load Balancer cross-zone charge wording is documented in the FAQ ("always on") and the User Guide (a target group attribute); the key says on by default and no charge, and the contradiction is logged (c-alb-cross-zone-always-on).

## Source pass (about 50 FIX/DROP, no wrong keys)
- Technically impossible stems: 40 TB and 30 TB single volumes above the 16 TiB sc1/st1 maximum (block-warehouse-001, -009), a 200 GB single PUT (haul-hybrid-customs-006).
- Impossible or invented options replaced: an NLB in front of Lambda, Global Accelerator in front of a bucket, a database endpoint or CloudFront (route-tariff-004 to -010), a snapshot copy to S3 through the console (backup-archive-008), changing a database engine in place and restoring an Oracle snapshot into another engine (engine-exchange-002, -006).
- Unsourced claims removed: the Direct Connect lead time (haul-hybrid-customs-004), "always on" cross-zone wording (throttle-lb-gate-004, -005).
- Near-duplicates replaced with different cost decisions: nat-toll-001, -003, -009, transit-tariff-004, -008, capacity-meter-004, -007, -013, network-cost-audit-006, throttle-lb-gate-007, storage-market-010, -012, backup-archive-009.
- Lifecycle default (since September 2024, objects under 128 KB are not transitioned by default) now drives cold-cellar-010 as a single-answer question.
- counting-house-002 names us-east-1 and cites the AWS-generated cost allocation tags page; service-selection-bureau-007 and -010 state the access pattern and the current capacity mode; Trusted Advisor stems state the support plan.

## Deviations
- capacity-meter has 12 live questions instead of 10 so that eight DynamoDB placement questions and three questions each for RDS Proxy and replication all fit.
- cold-cellar has one multiple-response question of 13 (about 8%); the bank-wide share stays inside the target.
