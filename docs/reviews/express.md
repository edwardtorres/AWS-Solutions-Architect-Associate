# Express Quarter question review

227 questions in 17 buildings (196 live, 31 mock-reserve). Writers: five agents. Reviewers did not write them.

## Blind pass
First pass: 226 of 227 matched the keys, one flagged (engine-works-010, second key arguable).
After the source-review fixes every question was blind-reviewed again from fresh exports: 225 of 227 matched and were unambiguous. Two flagged:
- freight-depot-020 (choose two, FSx for Windows File Server and FSx for NetApp ONTAP): the reviewer's picks matched the key; it flagged ambiguity only because Windows alone is the classic answer. Kept: both services are documented SMB services and the stem says "TWO".
- tuning-bay-005 (capacity arithmetic): the reviewer treated a 2 KB write as 1 write capacity unit. A write unit covers 1 KB, so 2 KB is 2 units (600 RCU and 600 WCU); the source reviewer worked the same arithmetic from the quoted unit sizes and agreed with the key. Kept.

## Source pass (26 FIX, 8 DROP-and-replace, no wrong keys)
- Application Auto Scaling is not on the exam guide's in-scope list: the checker now rejects it in stems and options, and container-yard-008, -010, -012, turbine-hall-006 and serverless-mill-012 were reworded as service auto scaling, scheduled scaling and target tracking.
- Invented or impossible options replaced: a VPN between VPCs through virtual private gateways (grid-planning-office-010, -011, edge-link-terminal-009), "turn off health checks" (express-interchange-009), the retired DMS Fleet Advisor (database-registry-016).
- Near-duplicates replaced with different decisions: express-interchange-001, -003, edge-link-terminal-006, -014, transfer-dock-004, -009, -014, refinery-001, -010, ingestion-gate-006, -008, tuning-bay-001, -002, -008, -015, freight-depot-018, express-rail-hub-003, container-yard-012.
- Wrong numbers corrected: tuning-bay-017 (default per-table quota), grid-planning-office-002 (reserved addresses), streaming-canal-010 (stem now gives the throughput that forces both keys).
- Bullet 3.5-S4 (visualization strategies) was not actually tested by four data-lake-reservoir questions; they were replaced with real dashboard-serving decisions (CTAS summary tables, Athena result reuse, Redshift concurrency scaling, column grants to the dashboard role) without naming the Amazon Quick service, whose naming item is still open.
- cache-pavilion-005 now rests on the documented DAX parameter group (record-ttl-millis).

## Left as reviewed
- transfer-dock-011 and transfer-dock/transit-tariff Large Bandwidth Tunnel questions rely on a recent but generally available feature; kept (one live question in transfer-dock and one in transit-tariff); the quoted VPN tunnel options page documents it with no preview label.
