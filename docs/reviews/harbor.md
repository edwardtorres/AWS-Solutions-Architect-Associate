# Harbor & Levees question review

244 questions in 15 buildings (210 live, 34 mock-reserve). Writers: five agents. Reviewers did not write them.

## Blind pass
First pass: 244 of 244 picks matched the keys, none flagged ambiguous.
After the source-review fixes every question was blind-reviewed again from fresh exports: 243 of 244 matched and were unambiguous. One was flagged:
- purpose-built-workshop-010 (choose three): the catalog (document queries) and product browsing (DynamoDB) overlapped in the stem. Resolved by saying the product pages are served by simple key-based lookups while the catalog documents are managed and queried separately. The key is unchanged.

## Source pass (22 FIX, 0 DROP, no wrong keys)
- Invented options replaced by real ones: scaling-floodgate-005 and -013 (RDS has no automatic read-replica setting), serverless-mill-015 (no edge-optimized HTTP API).
- Factually outdated claim: cache-edge-breakwater-012 said CloudFront has no fixed IPs; CloudFront now offers Anycast static IPs, so the stem now forces Global Accelerator through POST and PUT requests that CloudFront origin failover does not cover.
- Evidence gaps closed: AWS Backup "as frequently as hourly" (disaster-bunker-002, durable-dock-007) with a new source; purpose-built-workshop-010 DynamoDB quote.
- Ambiguity removed: blueprint-hall-007 (qualifier), single-point-watch-008 (cross-zone load balancing off), disaster-bunker-016 (replication configuration with a Filter named in the stem), all "Multi-AZ" wording in scaling-floodgate now says "Multi-AZ DB instance deployment".
- Service Quotas is not on the exam guide's in-scope list, so tide-gauges-001, -003 and -016 were rewritten around CloudWatch alarms on usage metrics, Trusted Advisor service-limit checks and AWS Support quota increases; the checker now rejects the name.
- Near-duplicates replaced: scaling-floodgate-003, legacy-wharf-016 (fourth Route 53 failover question), rebuild-yard-012.

## Left as reviewed
- The session-state-to-ElastiCache and RDS Proxy clusters test different decisions each and were accepted.
