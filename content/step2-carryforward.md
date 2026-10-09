# Step 2 carry-forward: status at the end of Step 2

Not displayed in the app. This file records what the Step 1 reviewer passes asked for and what Step 2 did with each item. Items still open go to Step 3 or later.

## "Where the analogy breaks" notes
- Done where a Learn page supports the contrast: Sentinel vs GuardDuty and Inspector vs Defender (Watchtower), Lighthouse vs management groups (Embassy Row), subnets and NSGs (Gatehouse, Grid Planning Office), Azure Backup and Site Recovery (Disaster Bunker, Archive Annex), Front Door vs CloudFront and Global Accelerator (Edge Link Terminal, Cache Edge Breakwater), Private Link and Private Endpoint vs VPC endpoints (Customs House, Grid Planning Office, Route Tariff), File Sync (Haul & Hybrid Customs), resource groups vs cost allocation tags (Ledger Office), Aurora Serverless, Cosmos DB, Event Hubs, Managed Redis.
- Rule applied after review: every "breaks" block states a difference quoted from an AWS page and from a Learn page. Where Learn lists no counterpart the block says only that.
- The Learn claim that an AWS NAT gateway has a single public IP is not repeated; it is recorded as contradiction `c-azure-nat-single-ip`.

## Content and portfolio additions
- Portfolio notes added (ACM in us-east-1 for CloudFront, OAC bucket policy, Lambda execution role, WAF on CloudFront or API Gateway, REST-only usage plans and keys, DynamoDB capacity, CloudFront cost).
- Service coverage: CloudTrail, Network Firewall, Inspector, Security Hub (named Security Hub CSPM on AWS pages; queued as `nv-security-hub-cspm-naming`), Firewall Manager, Amazon MQ, Elastic Beanstalk and OpenSearch Service now appear in notes.
- `nv-quick-naming` resolved: Amazon Quick contains Quick Sight (renamed-services list).
- The AMS label in 2.2 stays as the guide writes it.
- Block Warehouse: the st1/sc1 pairing is not added to the Azure row because the Learn storage page has no HDD row; the Learn table is quoted for what it does list.

## Structural suggestions
- Applied in Part A: Watchtower split (Edge Defense & Threat Detection, Credential Vault & App Access), Purpose-Built Workshop split (Cargo Hall), Foundation cap raised to 5 with Lookout Tower (monitoring primer), Machine Learning family.
- Still open: infrastructure as code (CloudFormation) and TLS / symmetric vs asymmetric crypto Foundation primers; Legacy Wharf is still one building (now with the vision, document, speech and language services added to its notes).
- Bullets cannot move between task statements, so 2.1-K15 (read replicas) stays in Scaling Floodgate.

## New open items found during Step 2
See `content/needs-verification.json` (open entries) and `content/contradictions.json`.
