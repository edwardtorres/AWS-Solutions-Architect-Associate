# Step 1 audit: Region Builder (SAA-C03)

Generated from the committed data. Branch `claude/serene-carson-6ot1u0`. Step 2 has not been started.

## A. Unsure / deviations / decisions for you

**Deviations from the brief**
1. **Bullet count is 189 (107 Knowledge + 82 Skills), not what a quick read suggests.** Task 2.1 has 16 Knowledge bullets (including "When to use read replicas"). The parser, not a summarizing fetcher, is the source of truth.
2. **Service families.** Cost Management, Containers, Serverless and Developer Tools have no home among your 9 families, so they fold into Management & Governance / Compute (`src/data/families.ts`). Machine Learning (Comprehend, Polly in 2.2) has no family; Legacy Wharf is tagged Networking and Database instead.
3. **Azure tags carry a `background` field.** 113 of 116 tags come from the Learn comparison pages; analytics ones (Fabric, Power BI, Event Hubs) come from your DP-600/PL-300 background, not AZ-900, and are marked `PL-300/DP-600`.
4. **Hash routing** (`#/map/<id>`) instead of path routing, so S3/CloudFront needs no rewrite rules in Step 9.
5. **Extras beyond the brief:** Export/Import save (you chose it), a seeded `shuffle` in `src/lib/rng.ts` (Step 3 needs it), `check:hygiene`, `check:bundle`, `test:layout`, a strict CSP meta in production builds.
6. **Commit trailer:** `Co-Authored-By: Claude <noreply@anthropic.com>`; no session link, model name, or local path in any commit (`check:hygiene` verifies history).
7. **Pinned TypeScript ~6.0** because the current typescript-eslint supports only TS below 6.1; the registry's latest TS is 7.

**Unsure**
- Island placement is cosmetic and assigned in data order (your choice).
- Some groupings are judgement calls; the blind reviewer disliked **Watchtower** (two themes), **Legacy Wharf**, **Purpose-Built Workshop** (grab-bag that also gates storage and databases). Not changed; see `content/step2-carryforward.md`.
- **Foundation gaps** the blind reviewer raised (monitoring/audit basics, infrastructure as code, TLS and crypto basics). The 4-Foundation cap is full; a fifth needs your decision.
- Cross-district roads are heavy (50 of 93). Example: Gatehouse (Citadel) needs Grid Planning Office (Express Quarter).
- **Open verification items** (`content/needs-verification.json`): Azure Regions/AZs and shared responsibility (not on the Learn pages), Azure storage redundancy, and "Amazon Quick" vs "Amazon QuickSight" naming.
- **Out-of-scope for questions:** AWS CloudShell, AWS CDK, CodeBuild/CodeDeploy, FIS. Your labs and Step 9 can still use them as tooling.
- The cert page states only 65 questions and 130 minutes; the 50/15 split, 100-1,000 scale, 720 and compensatory scoring come from the exam guide.
- Safari storage eviction is why Export/Import exists; it is not automatic.

## B. Test and check results
| Check | Result |
|---|---|
| `npm run typecheck` (app and node configs, strict) | pass |
| `npm run lint` (includes the block-body effect rule) | pass |
| `npm test` | 97 tests in 9 files, pass |
| `npm run check:content` / `-- --live` | pass (4 domains, 14 tasks, 189 bullets, 66 buildings, 93 roads); live guide matches the stored outline |
| `npm run build` + `npm run check:bundle` | pass; the check was also run against a dev-mode build and failed as intended |
| `npm run check:hygiene` | pass (63 files, 4 commits) |
| `npm run test:layout` (Chromium) | 38 checks pass at 390 px touch and 1280 px keyboard: no sideways scroll, all targets >= 44 px, panel, atlas, export, future/corrupt saves, no console or CSP errors |

Tree invariants tested: acyclic; every building reachable from a start building; only Foundations have no prerequisites; no road implied by others; every bullet mapped exactly once; buildings have 2-5 bullets from one task; <= 4 Foundations; services in scope; family tags consistent with services. Max prerequisite depth is 7.

## C. Reviewer passes
- **Blind pass** (saw only the outline-derived packet): 25 findings. Applied 12 road changes (new prerequisites such as Charter Hall to Identity Keep, Tide Gauges to Turbine Hall, Counting House to Elastic Mint; removed roads they made redundant). Not applied: regrouping suggestions and a fifth Foundation (your call), moving 2.1-K15 (bullets cannot cross task statements).
- **Source pass** (AWS docs and Learn): all 113 sourced Azure pairs exist on their cited pages. Applied: corrected 6 road reasons and 2 portfolio notes (API Gateway throttling protects the backend rather than being a cost control; usage plans are REST API only; a live static-site bucket is not an archive-tier candidate), added missing in-scope services (RAM, Organizations, Macie, Trusted Advisor, Wavelength, DocumentDB, Neptune, Keyspaces, and others). Analogy-break notes and portfolio additions are queued for Step 2 in `content/step2-carryforward.md`.

## D. Counts
- Dataset: 66 buildings (62 task buildings + 4 Foundations), sizes 2 bullets: 16, 3: 30, 4: 13, 5: 3. Citadel 11, Harbor & Levees 14, Express Quarter 17, Treasury 20.
- Roads: 93, of which 50 cross districts.
- Portfolio-tagged buildings: 15. Azure-tagged buildings: 57 (116 tags, 3 unverified).
- In-scope services: 16 categories, 119 entries (118 unique; Amazon Redshift appears under Analytics and Database). Out-of-scope: 16 categories, 41 entries (one is "All services" for IoT). Technologies and concepts: 13.

## E1. Outline counts

| Domain | Weight | Task | Knowledge | Skills |
|---|---|---|---|---|
| 1. Design Secure Architectures | 30% | 1.1 Design secure access to AWS resources | 5 | 6 |
| 1. Design Secure Architectures | 30% | 1.2 Design secure workloads and applications | 6 | 4 |
| 1. Design Secure Architectures | 30% | 1.3 Determine appropriate data security controls | 4 | 7 |
| 2. Design Resilient Architectures | 26% | 2.1 Design scalable and loosely coupled architectures | 16 | 7 |
| 2. Design Resilient Architectures | 26% | 2.2 Design highly available and/or fault-tolerant architectures | 12 | 8 |
| 3. Design High-Performing Architectures | 24% | 3.1 Determine high-performing and/or scalable storage solutions | 3 | 2 |
| 3. Design High-Performing Architectures | 24% | 3.2 Design high-performing and elastic compute solutions | 6 | 4 |
| 3. Design High-Performing Architectures | 24% | 3.3 Determine high-performing database solutions | 8 | 5 |
| 3. Design High-Performing Architectures | 24% | 3.4 Determine high-performing and/or scalable network architectures | 4 | 4 |
| 3. Design High-Performing Architectures | 24% | 3.5 Determine high-performing data ingestion and transformation solutions | 7 | 7 |
| 4. Design Cost-Optimized Architectures | 20% | 4.1 Design cost-optimized storage solutions | 11 | 10 |
| 4. Design Cost-Optimized Architectures | 20% | 4.2 Design cost-optimized compute solutions | 9 | 6 |
| 4. Design Cost-Optimized Architectures | 20% | 4.3 Design cost-optimized database solutions | 9 | 5 |
| 4. Design Cost-Optimized Architectures | 20% | 4.4 Design cost-optimized network architectures | 7 | 7 |

Totals: 4 domains, 14 tasks, 107 Knowledge + 82 Skills = 189 bullets.

## E2. Buildings

| Building | Skill | Task | Bullets | Families | Portfolio | Azure (AZ-900) |
|---|---|---|---|---|---|---|
| **Pillar Plaza** (Founders' Square) | How the Well-Architected pillars map to the four districts | Foundation | - | Management & Governance | - | Azure Well-Architected Review |
| **Town Charter** (Founders' Square) | Reading SAA scenario questions: keywords like "most cost-effective" and "least operational overhead" | Foundation | - | - | - | - |
| **Safe Harbor Account** (Founders' Square) | A safe practice account: root MFA, a budget and billing alerts | Foundation | - | Security & Identity; Management & Governance | - | - |
| **Surveyor's Grid** (Founders' Square) | IP addressing (CIDR), ports and protocols | Foundation | - | Networking & Content Delivery | - | - |
| **Identity Keep** (The Citadel, A) | IAM users, groups, roles and policies; root-user and MFA hygiene; least privilege | 1.1 | K4 S1 S2 | Security & Identity | - | Azure role-based access control (Azure RBAC); Microsoft Entra ID (multi-factor authentication) |
| **Federation Bridge** (The Citadel, B) | Federated access: IAM Identity Center and directory services with IAM roles | 1.1 | K2 S6 | Security & Identity | - | Microsoft Entra ID; Microsoft Entra Domain Services |
| **Embassy Row** (The Citadel, C) | Multi-account security: Organizations, SCPs, Control Tower, STS cross-account roles, resource policies | 1.1 | K1 S3 S4 S5 | Security & Identity; Management & Governance | - | Azure management groups; Azure Lighthouse / Azure landing zone |
| **Charter Hall** (The Citadel, A) | AWS global infrastructure (Regions, AZs) and the shared responsibility model | 1.1 | K3 K5 | Security & Identity | - | Azure regions and availability zones (unverified); Shared responsibility in the cloud (unverified) |
| **Gatehouse** (The Citadel, B) | VPC security: security groups, network ACLs, route tables, NAT gateways, public and private subnets | 1.2 | K3 S1 S2 | Networking & Content Delivery; Security & Identity | - | Network security groups; Virtual Network; User Defined Routes |
| **Watchtower** (The Citadel, C) | Threat detection and app defense: Shield, WAF, GuardDuty, Macie, Cognito, Secrets Manager | 1.2 | K1 K5 K6 S3 | Security & Identity | - | Azure web application firewall; Azure DDoS Protection; Microsoft Sentinel; Microsoft identity platform and Microsoft Entra External ID |
| **Customs House** (The Citadel, A) | Service endpoints, secure application access, and external connections (VPN, Direct Connect) | 1.2 | K2 K4 S4 | Networking & Content Delivery; Security & Identity | - | VPN Gateway; ExpressRoute; Azure Private Link |
| **Key Vault** (The Citadel, B) | Encryption at rest and key management: AWS KMS, key policies, CloudHSM | 1.3 | K4 S2 S4 | Security & Identity | - | Azure Key Vault / Azure Key Vault Managed HSM |
| **Certificate Office** (The Citadel, C) | Encryption in transit with ACM and TLS; rotating keys and renewing certificates | 1.3 | S3 S7 | Security & Identity | - | Key Vault certificates / Microsoft Cloud PKI |
| **Archive Annex** (The Citadel, A) | Data recovery, retention and classification: backups and replication | 1.3 | K2 K3 S5 | Security & Identity; Storage | - | Azure Backup |
| **Compliance Registry** (The Citadel, B) | Data governance, compliance alignment, and data access/lifecycle/protection policies | 1.3 | K1 S1 S6 | Security & Identity; Management & Governance | - | Microsoft Service Trust Portal; Azure Policy |
| **Blueprint Hall** (Harbor & Levees, A) | Designing event-driven, microservice and multi-tier architectures; stateless vs stateful | 2.1 | K4 K10 S1 | Compute; Application Integration | - | - |
| **Message Quay** (Harbor & Levees, B) | Loose coupling with queues, pub/sub, event buses and workflow orchestration | 2.1 | K5 K11 K16 S3 | Application Integration | - | Azure Event Grid; Azure durable functions / Azure Logic Apps |
| **Serverless Mill** (Harbor & Levees, C) | APIs and serverless patterns: API Gateway, Lambda, Fargate | 2.1 | K1 K12 S5 | Application Integration; Compute | lambda, api-gateway | Azure Functions; Azure API Management |
| **Container Dock** (Harbor & Levees, A) | When to use containers: migrating apps to containers and orchestrating with ECS or EKS | 2.1 | K8 K14 S4 | Compute | - | Azure Kubernetes Service (AKS); Azure Container Registry; Azure Container Instances / Azure Container Apps |
| **Scaling Floodgate** (Harbor & Levees, B) | Horizontal vs vertical scaling, load balancing and when to use read replicas | 2.1 | K6 K9 K15 S2 | Compute; Networking & Content Delivery; Database | - | Azure Virtual Machine Scale Sets; Load Balancer; Application Gateway |
| **Cache & Edge Breakwater** (Harbor & Levees, C) | Caching strategies and CDN edge accelerators | 2.1 | K3 K7 | Networking & Content Delivery; Database | cloudfront | Azure Front Door; Azure Managed Redis |
| **Purpose-Built Workshop** (Harbor & Levees, A) | Choosing purpose-built managed services and storage types (object, file, block) | 2.1 | K2 K13 S6 S7 | Storage; Migration; Application Integration; Security & Identity | - | Blob storage; Azure Files; Managed disks |
| **Island Charts** (Harbor & Levees, B) | Regions, AZs and Route 53; services for HA across AZs and Regions; route tables | 2.2 | K1 K3 S2 | Networking & Content Delivery | - | Azure DNS; Traffic Manager |
| **Single-Point Watch** (Harbor & Levees, C) | Mitigating single points of failure: distributed patterns, load balancers, RDS Proxy | 2.2 | K5 K8 K9 S4 | Networking & Content Delivery; Database; Compute | - | Application Gateway |
| **Disaster Bunker** (Harbor & Levees, A) | DR strategies by RPO and RTO; failover strategies | 2.2 | K4 K6 S6 | Storage; Networking & Content Delivery | - | Azure Backup |
| **Tide Gauges** (Harbor & Levees, B) | Service quotas and throttling, workload visibility (X-Ray), metrics for availability | 2.2 | K10 K12 S3 | Management & Governance; Application Integration | - | Azure Monitor |
| **Rebuild Yard** (Harbor & Levees, C) | Immutable infrastructure and automation that keeps infrastructure intact | 2.2 | K7 S1 | Management & Governance; Compute | - | Azure Resource Manager / Bicep; Azure Automation / Azure Update Manager; Azure Arc |
| **Durable Dock** (Harbor & Levees, A) | Storage durability and replication; data durability and availability strategies | 2.2 | K11 S5 | Storage | - | Azure storage redundancy (LRS, ZRS, GRS) (unverified) |
| **Legacy Wharf** (Harbor & Levees, B) | Improving reliability of legacy apps without code changes; AI and purpose-built managed services | 2.2 | K2 S7 S8 | Networking & Content Delivery; Database | - | - |
| **Freight Depot** (Express Quarter, A) | Matching S3, EFS and EBS (object, file, block) and hybrid storage to performance and scale needs | 3.1 | K1 K2 K3 S1 S2 | Storage | s3-static-hosting | Blob storage; Azure Files; Managed disks |
| **Engine Works** (Express Quarter, B) | Choosing compute: EC2 instance types, Lambda memory, Batch, EMR, Fargate | 3.2 | K1 S3 S4 | Compute; Analytics | lambda | Azure Virtual Machines; Azure Batch |
| **Turbine Hall** (Express Quarter, C) | Elastic scaling: Auto Scaling, scaling metrics and conditions, edge-distributed compute | 3.2 | K2 K4 S2 | Compute; Management & Governance; Networking & Content Delivery | - | Azure Virtual Machine Scale Sets / App Service autoscaling; Azure Monitor |
| **Express Rail Hub** (Express Quarter, A) | Decoupling with queues and pub/sub so components scale independently | 3.2 | K3 S1 | Application Integration | - | - |
| **Serverless & Container Yard** (Express Quarter, B) | Serverless and container orchestration for performance: Lambda, Fargate, ECS, EKS | 3.2 | K5 K6 | Compute | lambda | Azure Kubernetes Service (AKS); Azure Container Apps |
| **Database Registry** (Express Quarter, C) | Choosing database types and engines: Aurora, DynamoDB, RDS engines, homogeneous vs heterogeneous migration | 3.3 | K6 K8 S3 S4 | Database; Migration | dynamodb | Azure Cosmos DB for NoSQL; Azure SQL Database, Azure Database for MySQL/PostgreSQL; Azure Database Migration Service |
| **Read-Replica Annex** (Express Quarter, A) | Database replication and read replicas; AZ and Region placement | 3.3 | K1 K7 S1 | Database | - | - |
| **Cache Pavilion** (Express Quarter, B) | Integrating caching with databases: ElastiCache and caching services | 3.3 | K2 S5 | Database | - | Azure Managed Redis |
| **Tuning Bay** (Express Quarter, C) | Access patterns, capacity planning (capacity units, Provisioned IOPS), connections and proxies | 3.3 | K3 K4 K5 S2 | Database | dynamodb | - |
| **Grid Planning Office** (Express Quarter, A) | Network design: subnet tiers, routing, IP addressing, topology and room to scale | 3.4 | K2 S1 S2 | Networking & Content Delivery | - | Virtual Network; Azure Virtual WAN; Virtual network peering |
| **Express Interchange** (Express Quarter, B) | Load balancing strategy: ALB, NLB and Gateway Load Balancer | 3.4 | K3 S4 | Networking & Content Delivery | - | Load Balancer; Application Gateway |
| **Edge & Link Terminal** (Express Quarter, C) | Edge services, hybrid connection options (VPN, Direct Connect, PrivateLink) and resource placement | 3.4 | K1 K4 S3 | Networking & Content Delivery | cloudfront | Azure Front Door; Azure Front Door / cross-region load balancer; ExpressRoute; VPN Gateway |
| **Data Lake Reservoir** (Express Quarter, A) | Data lakes and analytics: S3, Lake Formation, Athena, Quick visualization | 3.5 | K1 S1 S4 | Analytics; Storage | - | Azure Data Lake Storage; OneLake security and Microsoft Purview in Fabric; Power BI |
| **Streaming Canal** (Express Quarter, B) | Ingestion patterns and streaming architectures: Kinesis, Data Firehose, MSK | 3.5 | K2 K7 S2 | Analytics | - | Azure Event Hubs; Event Hubs for Apache Kafka |
| **Transfer Dock** (Express Quarter, C) | Moving data into AWS: DataSync, Storage Gateway, Transfer Family, Snow Family; sizes and speeds | 3.5 | K3 K6 S3 | Migration; Storage | - | Azure Data Box; Azure Data Box Gateway / Azure File Sync |
| **Refinery** (Express Quarter, A) | Transforming and processing data: Glue, EMR, CSV to Parquet | 3.5 | K4 S5 S7 | Analytics | - | Data Factory in Microsoft Fabric / Azure Data Factory; Azure Databricks |
| **Ingestion Gate** (Express Quarter, B) | Secure access to ingestion access points and ingestion configuration | 3.5 | K5 S6 | Analytics; Migration; Security & Identity; Networking & Content Delivery | - | - |
| **Ledger Office** (The Treasury, A) | Cost visibility: allocation tags, multi-account billing, Cost Explorer, Budgets, Cost and Usage Report, Requester Pays | 4.1 | K1 K2 K3 | Management & Governance; Storage | - | Microsoft Cost Management; Cost details APIs / Cost Management + Billing; Resource Manager resource groups and tags |
| **Block Warehouse** (The Treasury, B) | Right-sizing block storage: HDD vs SSD volume types, storage size and auto scaling | 4.1 | K6 S2 S4 | Storage | - | Managed disks (Standard SSD, Premium SSD, Ultra Disk) |
| **Storage Market** (The Treasury, C) | Most cost-effective storage service for an access pattern: S3, EFS, EBS, FSx | 4.1 | K4 K9 K11 S10 | Storage | s3-static-hosting | Blob storage; Azure Files; Azure NetApp Files |
| **Haul & Hybrid Customs** (The Treasury, A) | Lowest-cost data transfer and migration into AWS storage; hybrid storage; batching uploads | 4.1 | K8 S1 S3 S7 | Migration; Storage | - | Azure Data Box; Azure File Sync |
| **Cold Cellar** (The Treasury, B) | S3 storage classes, tiering and lifecycle rules; data lifecycles | 4.1 | K7 K10 S5 S8 S9 | Storage | s3-static-hosting | Storage cool tier; Storage archive access tier |
| **Backup Archive** (The Treasury, C) | Backup strategies and choosing the right backup or archival solution | 4.1 | K5 S6 | Storage | - | Azure Backup; Storage archive access tier |
| **Counting House** (The Treasury, A) | Compute purchasing options (On-Demand, Spot, Reserved, Savings Plans) and cost tools | 4.2 | K1 K2 K4 | Compute; Management & Governance | - | Microsoft Cost Management |
| **Instance Foundry** (The Treasury, B) | Instance types, families and sizes; right-sizing | 4.2 | K7 S5 S6 | Compute; Management & Governance | - | Azure Virtual Machines; Azure Advisor (Cost category) |
| **Elastic Mint** (The Treasury, C) | Cost-effective compute and scaling: Lambda vs EC2 vs Fargate, hibernation, ALB vs NLB vs GWLB | 4.2 | K8 K9 S1 S2 S3 | Compute; Networking & Content Delivery | lambda | Azure Functions; Azure Virtual Machine Scale Sets |
| **Distribution Office** (The Treasury, A) | Placement and availability classes: Regions and AZs, edge processing, Outposts, production vs non-production | 4.2 | K3 K5 K6 S4 | Compute; Networking & Content Delivery | - | Azure Local (formerly Azure Stack HCI) |
| **DB Cost Desk** (The Treasury, B) | Cost tooling for databases: allocation tags, Cost Explorer, Budgets, Cost and Usage Report | 4.3 | K1 K2 | Management & Governance | - | Microsoft Cost Management |
| **Service Selection Bureau** (The Treasury, C) | Cost-effective database service and type: DynamoDB vs RDS, Aurora Serverless, time-series, columnar | 4.3 | K9 S3 S4 | Database; Analytics | dynamodb | Azure SQL Database serverless; Azure Cosmos DB for NoSQL |
| **Engine Exchange** (The Treasury, A) | Database engine choice and migrating schemas and data across engines (DMS and schema conversion) | 4.3 | K7 S2 S5 | Database; Migration | - | Azure Database Migration Service |
| **Capacity Meter** (The Treasury, B) | Capacity planning, caching, connection proxies and replicas for database cost | 4.3 | K3 K5 K6 K8 | Database | dynamodb | Azure Managed Redis |
| **Retention Records** (The Treasury, C) | Backup and retention policies for databases, including snapshot frequency | 4.3 | K4 S1 | Database; Storage | - | Azure Backup |
| **Network Cost Audit** (The Treasury, A) | Cost tooling and reviewing existing workloads for network optimizations | 4.4 | K1 K2 S5 | Management & Governance; Networking & Content Delivery | - | Microsoft Cost Management; Azure Advisor |
| **Throttle & LB Gate** (The Treasury, B) | Load balancer choice and throttling strategies | 4.4 | K3 S6 | Networking & Content Delivery; Application Integration | api-gateway | Application Gateway; Azure API Management |
| **NAT Toll** (The Treasury, C) | NAT gateway vs NAT instance costs; one shared NAT gateway vs one per AZ | 4.4 | K4 S1 | Networking & Content Delivery; Compute | - | Azure NAT Gateway |
| **Transit Tariff** (The Treasury, A) | Connectivity cost: Direct Connect vs VPN vs internet; bandwidth allocation | 4.4 | K5 S2 S7 | Networking & Content Delivery | - | ExpressRoute; VPN Gateway |
| **Route Tariff** (The Treasury, B) | Routing, peering, Transit Gateway, DNS, endpoints and CDN to minimize transfer cost | 4.4 | K6 K7 S3 S4 | Networking & Content Delivery | cloudfront | Virtual network peering; Azure Virtual WAN; Azure DNS; Azure Front Door; Private Endpoint |

## E3. Roads (93)

| Prerequisite | Unlocks | Reason |
|---|---|---|
| Pillar Plaza | Charter Hall | Shared responsibility and global infrastructure frame every pillar you will design against. |
| Pillar Plaza | Blueprint Hall | Architecture design principles are the Well-Architected pillars applied to a system. |
| Town Charter | Blueprint Hall | Designing from requirements means spotting the scenario keywords that pick between valid designs. |
| Safe Harbor Account | Identity Keep | A protected root user and a practice account come before designing IAM for real. |
| Pillar Plaza | Ledger Office | The cost optimization pillar is the lens for the whole Treasury district. |
| Safe Harbor Account | Ledger Office | A budget and billing alerts exist before you study the tools that analyze spend. |
| Surveyor's Grid | Grid Planning Office | Subnet and routing design needs CIDR, ports and protocol fundamentals first. |
| Charter Hall | Identity Keep | The shared responsibility model explains why you configure IAM and root-user controls at all. |
| Charter Hall | Grid Planning Office | VPCs live in a Region and subnets are bound to one AZ, so you need the global-infrastructure model. |
| Surveyor's Grid | Express Interchange | Layer 4 vs Layer 7 load balancing needs ports, protocols and TCP vs HTTP basics. |
| Identity Keep | Federation Bridge | Federated users still land in IAM roles, so roles and policies come first. |
| Identity Keep | Embassy Row | Cross-account roles, SCPs and resource policies are extensions of IAM policy evaluation. |
| Identity Keep | Key Vault | Key policies work with IAM policies and decide who can use a KMS key. |
| Federation Bridge | Watchtower | Cognito and IAM Identity Center are the identity pieces that application defense builds on. |
| Key Vault | Compliance Registry | Encryption and key policies are core evidence for compliance requirements. |
| Key Vault | Certificate Office | Key rotation and certificate renewal both sit on the key-management concepts covered first. |
| Grid Planning Office | Gatehouse | Security groups, NACLs and NAT gateways only make sense inside a designed VPC with subnets and routes. |
| Gatehouse | Watchtower | Edge defenses and threat detection build on knowing your VPC traffic paths and logs. |
| Gatehouse | Customs House | VPN, Direct Connect and endpoints attach to a VPC with route tables and security controls. |
| Embassy Row | Compliance Registry | Organization-wide governance, Config and Artifact build on a multi-account security strategy. |
| Archive Annex | Compliance Registry | Retention, recovery and classification requirements feed compliance-driven data policies. |
| Freight Depot | Archive Annex | Backup, replication and retention policies are applied to the storage services you must already know. |
| Blueprint Hall | Message Quay | Loose coupling is how event-driven and multi-tier designs avoid tight dependencies. |
| Blueprint Hall | Serverless Mill | Knowing stateless design explains when API Gateway plus Lambda fits. |
| Blueprint Hall | Container Dock | Microservice design principles motivate moving applications into containers. |
| Blueprint Hall | Scaling Floodgate | Scaling and load balancing decisions depend on the tiers and statelessness of the design. |
| Blueprint Hall | Cache & Edge Breakwater | Cache placement depends on where the tiers and hot data are in the architecture. |
| Blueprint Hall | Purpose-Built Workshop | Choosing purpose-built services starts from the requirements of each tier. |
| Grid Planning Office | Island Charts | Multi-AZ design needs subnets per AZ and route tables to reason about failover. |
| Island Charts | Single-Point Watch | Finding single points of failure starts with spreading components across AZs and Regions. |
| Database Registry | Single-Point Watch | RDS Proxy and Multi-AZ failover are database features used to remove single points of failure. |
| Scaling Floodgate | Single-Point Watch | Load balancers and Auto Scaling groups are the main tools for removing single points of failure. |
| Single-Point Watch | Disaster Bunker | DR strategies extend in-Region high availability across Regions. |
| Durable Dock | Disaster Bunker | Backup, replication and durability features are the building blocks of every DR tier. |
| Read-Replica Annex | Disaster Bunker | Cross-Region replicas are a standard pilot light and warm standby building block. |
| Freight Depot | Durable Dock | Durability and replication choices depend on knowing each storage service. |
| Single-Point Watch | Tide Gauges | Availability metrics and tracing are chosen once you know which failures you are guarding against. |
| Scaling Floodgate | Rebuild Yard | Immutable infrastructure is replaced through Auto Scaling groups and load balancers. |
| Single-Point Watch | Legacy Wharf | Legacy apps gain reliability from load balancers and proxies placed in front of them. |
| Purpose-Built Workshop | Freight Depot | Performance-driven storage choice builds on the object, file and block distinctions. |
| Serverless Mill | Engine Works | Compute selection compares serverless against the other compute options. |
| Container Dock | Engine Works | Compute selection compares containers against the other compute options. |
| Tide Gauges | Turbine Hall | Scaling actions are driven by the CloudWatch metrics and conditions you learn to choose there. |
| Engine Works | Turbine Hall | Scaling policies are written for a chosen compute type. |
| Message Quay | Express Rail Hub | Decoupling for independent scaling uses the queue and pub/sub patterns. |
| Engine Works | Refinery | EMR is one of the compute options for data processing, introduced under compute selection. |
| Engine Works | Serverless & Container Yard | Performance tuning of serverless and containers builds on the compute option trade-offs. |
| Purpose-Built Workshop | Database Registry | Choosing among database types builds on matching purpose-built services to workloads. |
| Database Registry | Read-Replica Annex | Read replicas are a feature of RDS and Aurora engines, so you must know those options first. |
| Scaling Floodgate | Read-Replica Annex | Replicas are a read-scaling strategy, introduced alongside other scaling methods. |
| Database Registry | Cache Pavilion | You cache in front of a database whose access pattern you already understand. |
| Cache & Edge Breakwater | Cache Pavilion | Database caching applies the general caching strategies. |
| Database Registry | Tuning Bay | Capacity planning is specific to the database type and engine chosen. |
| Scaling Floodgate | Express Interchange | Choosing between ALB, NLB and GWLB builds on load balancing concepts. |
| Customs House | Edge & Link Terminal | VPN, Direct Connect and PrivateLink options build on the connectivity basics. |
| Cache & Edge Breakwater | Edge & Link Terminal | CloudFront and Global Accelerator are the edge accelerators introduced there. |
| Freight Depot | Data Lake Reservoir | A data lake is built on S3, so storage fundamentals come first. |
| Message Quay | Streaming Canal | Streaming architectures extend queuing and messaging concepts. |
| Freight Depot | Transfer Dock | Transfer services deliver data to storage services you already need to understand. |
| Data Lake Reservoir | Refinery | You transform data that already lands in a lake. |
| Streaming Canal | Ingestion Gate | Securing ingestion endpoints requires knowing the ingestion services. |
| Customs House | Ingestion Gate | Private access to ingestion endpoints uses service endpoints and PrivateLink. |
| Ledger Office | Counting House | Compute purchasing decisions are made with the same cost-visibility tools. |
| Engine Works | Instance Foundry | Right-sizing instances requires knowing the compute options and their families. |
| Instance Foundry | Counting House | Reserved Instances and EC2 Instance Savings Plans commit to a family; Compute Savings Plans commit to hourly spend. |
| Counting House | Elastic Mint | Cost-effective compute needs the Spot, Reserved and Savings Plans purchasing options. |
| Turbine Hall | Elastic Mint | Cost-effective elasticity builds on scaling methods and metrics. |
| Express Interchange | Elastic Mint | Picking ALB, NLB or GWLB for cost builds on load balancing strategy. |
| Island Charts | Distribution Office | Placement and availability classes rely on the Region and AZ model. |
| Counting House | Distribution Office | Availability classes for non-production workloads are a purchasing and cost decision. |
| Freight Depot | Block Warehouse | Block volume cost choices start from knowing what EBS is for. |
| Freight Depot | Storage Market | Comparing storage services on cost requires understanding each service. |
| Transfer Dock | Haul & Hybrid Customs | Lowest-cost transfer chooses among the transfer services you already know. |
| Storage Market | Cold Cellar | Storage classes and lifecycle rules refine the choice of S3 once S3 has been selected. |
| Cold Cellar | Backup Archive | Archival tiers such as Glacier cost least to store but add retrieval time, cost and minimum duration. |
| Archive Annex | Backup Archive | Backup cost choices follow the backup and recovery requirements. |
| Ledger Office | DB Cost Desk | The same cost tools are applied to database spend. |
| Database Registry | Service Selection Bureau | Comparing database services on cost starts from knowing each type. |
| DB Cost Desk | Service Selection Bureau | Cost-effective database selection uses the cost tooling to compare options. |
| Database Registry | Engine Exchange | Choosing and migrating between engines builds on knowing engines and their migration paths. |
| Tuning Bay | Capacity Meter | Cost-driven capacity planning refines performance capacity planning. |
| Cache Pavilion | Capacity Meter | Caching is a cost lever for database capacity. |
| Read-Replica Annex | Capacity Meter | Replica count and placement affect database capacity cost. |
| Archive Annex | Retention Records | Retention policy decisions follow data retention and recovery requirements. |
| Database Registry | Retention Records | Snapshot and retention settings are specific to each database service. |
| Ledger Office | Network Cost Audit | Network cost reviews use the same cost-visibility tools. |
| Grid Planning Office | Network Cost Audit | Reviewing network optimizations needs the topology and routing model. |
| Express Interchange | Throttle & LB Gate | Load balancer choice for cost builds on load balancing strategy. |
| Tide Gauges | Throttle & LB Gate | Throttling strategies build on understanding service quotas and throttling limits. |
| Serverless Mill | Throttle & LB Gate | API Gateway throttling protects a backend from overload, one of several throttling strategies. |
| Gatehouse | NAT Toll | NAT gateways are components of VPC design, so you must know what they do before costing them. |
| Customs House | Transit Tariff | Comparing connection costs builds on knowing the VPN and Direct Connect options. |
| Edge & Link Terminal | Route Tariff | Minimizing transfer cost uses edge, CDN and endpoint options from network design. |

## E4. Foundations

- **Pillar Plaza**: The exam guide says the exam validates design "based on the AWS Well-Architected Framework", and its four domains mirror four pillars, but no bullet teaches the pillars themselves.
- **Town Charter**: Scenario keywords decide which of several valid designs is the answer, a test-taking skill no outline bullet covers.
- **Safe Harbor Account**: Later labs run in a real account; a budget, alerts and a protected root user must exist before anything billable is created.
- **Surveyor's Grid**: Tasks 1.2 and 3.4 assume you can read a CIDR block and reason about ports and protocols ("IP addressing", "control ports, protocols"), but no bullet teaches them.

## E5. Service lists

In scope: 16 categories, 119 entries (118 unique). Out of scope: 16 categories, 41 entries. Technologies and concepts: 13.
