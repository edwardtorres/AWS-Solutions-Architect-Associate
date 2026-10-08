# Carried forward to Step 2 (from the Step 1 reviewer passes)

Not displayed in the app. Each item needs an AWS-docs or Microsoft Learn citation before it becomes a note or a question.

## "Where the analogy breaks" notes to write
- **Sentinel vs GuardDuty** (watchtower): Sentinel is a SIEM/SOAR; GuardDuty is managed threat detection over CloudTrail, VPC flow logs and DNS logs. Security Hub plus Detective is closer to Sentinel. The same Learn page also maps Inspector to Defender for Cloud.
- **Lighthouse and management groups** (embassy-row): Lighthouse is cross-tenant delegated management, not a landing-zone builder; management groups carry RBAC/Policy inheritance, not SCP semantics or consolidated billing.
- **VNet vs VPC** (gatehouse, grid-planning-office): the Learn networking page says an AWS subnet lives in one AZ, while an Azure subnet can span zones. NSGs cover the roles of both security groups and network ACLs.
- **Azure Backup is not DR** (disaster-bunker, archive-annex, retention-records): it maps only to the backup-and-restore tier; Site Recovery is not on the allowed pages.
- **Front Door vs CloudFront vs Global Accelerator**: Front Door uses unicast IPs; Global Accelerator uses static anycast IPs.
- **Private Endpoint vs VPC endpoints** (route-tariff): resembles interface endpoints/PrivateLink only; gateway endpoints (S3, DynamoDB) have no Azure twin and matter for cost.
- **File Sync vs DataSync** (haul-hybrid-customs): File Sync is on-premises cache and sync (closer to S3 File Gateway); DataSync is managed bulk transfer.
- **Resource groups vs cost allocation tags** (ledger-office): a resource group is a mandatory lifecycle container; AWS tags are a billing feature.
- Page-stated caveats: Aurora Serverless vs Azure SQL serverless (different scaling and billing); DynamoDB vs Cosmos DB for NoSQL (not API compatible); MSK vs Event Hubs for Kafka (not a Kafka cluster); Azure Managed Redis vs ElastiCache (no MemoryDB equivalent).
- **Do not repeat** the Learn row's claim that an AWS NAT gateway has a single public IP (nat-toll); AWS docs allow multiple addresses.

## Content and portfolio additions
- Portfolio notes to add: ACM certificate for CloudFront must be in us-east-1 (certificate-office); S3 origin access control bucket policy as a resource policy (embassy-row); Lambda execution role and least privilege (identity-keep); WAF on CloudFront or API Gateway (watchtower). API Gateway usage plans and API keys are REST API only.
- Service coverage gaps among in-scope services: CloudTrail, Network Firewall, Inspector, Security Hub, Firewall Manager, Amazon MQ, Elastic Beanstalk, OpenSearch Service are used by no building. Add them to notes where the bullets justify it.
- Confirm "Amazon Quick" (exam guide) vs "Amazon QuickSight" (Learn page): `nv-quick-naming`.
- The 2.2 bullet "AWS Managed Services (AMS)" is listed with Comprehend/Polly examples; the label is the guide's, keep it verbatim.
- Block-warehouse: add the HDD (st1/sc1) pairing only if it appears on the Learn storage page.

## Structural suggestions not applied in Step 1 (need your call)
- Foundation gaps raised by the blind reviewer: monitoring and audit basics (CloudWatch, CloudTrail, Config); infrastructure as code (CloudFormation); TLS and symmetric vs asymmetric crypto. The 4-Foundation limit is full; a fifth would need a decision.
- Split **Watchtower** (threat defense vs application credentials and user identity), tidy **Legacy Wharf** (AI services, lift-and-shift reliability) and **Purpose-Built Workshop** (grab-bag that gates storage and databases).
- Bullets cannot move between task statements, so 2.1-K15 (read replicas) stays in Scaling Floodgate.
