# Lab writing guide (Step 6)

Labs run in the owner's own AWS account. Claude Code cannot run them, so every step must be checkable against an AWS page. One lab = one file `content/labs/lab-NN-slug.ts` (default export a `Lab`, type in `src/labs/types.ts`) plus optional CloudFormation templates in `content/labs/templates/`.

## The loop
1. Research each AWS page with `npx tsx scripts/q.ts <url> "<regex>"` (sentences that match) and `npx tsx scripts/ctx.ts <url> "<regex>" <chars>` (text around a match). Allowed hosts: `docs.aws.amazon.com`, `aws.amazon.com` (tutorials, FAQs, pricing *pages for billing basis only*).
2. Add each page once: `npx tsx scripts/add-source.ts <id> <url> "<title>"` (the URL may end in `#section-anchor`; the anchor must exist, it is checked). It refuses a duplicate id or URL: if the URL already exists, reuse that id (`grep -n <url-part> content/sources.ts`).
3. Write the lab file and templates, then run `npx tsx scripts/check-labs.ts <lab-id-prefix>`: schema checks, cfn-lint on the lab's templates, and every verbatim quote fetched from its page. Fix until it prints OK.
4. **Do not run git commands that change the tree** (no checkout, stash, reset, commit, restore). Other writers work in the same checkout; the lead commits. Edit only your own lab files, templates, new sources (through add-source) and your notes file `docs/reviews/labs-notes/<your-labs>.md`.

## Rules (the checks enforce most of them)
- **Every step cites a source id and one verbatim sentence (`quote`, at least 25 characters) from that page.** Link to the *section* (anchor URL) instead of writing click paths. No "choose X > Y > Z" chains.
- **Never state prices, rates or free-tier quantities** (no `$`, no "USD", no "per hour 0.xx"). Billing *basis* only, in the page's own words (for example "charged for each hour the NAT gateway is available").
- **"Bills while running" badges** (`Lab.costs`): every resource that bills while it exists (NAT gateway, load balancer, RDS/Aurora instance, interface endpoint, Transit Gateway attachment, Elastic IP, KMS customer managed key, running EC2 instances, Config recorder, etc.) needs a `costs` entry (resource, documented basis, source, quote) and each `do` step that creates it lists the cost id and is `optional: true` with an `alt` (the free or cheaper way to learn the same thing) unless the lab truly cannot work without it. A `cleanup` step must list the cost id it removes.
- **Cleanup and verification last.** Steps of kind `cleanup` (the checklist, one per resource or stack) then exactly one or more `verify` steps, the last step being a `verify`: a CloudShell command (`code`) or console page (`checkpoint`) that proves nothing billable remains. Where a template creates the scaffolding, a cleanup step must say to delete the stack.
- **Checkpoints** (`kind: 'check'` needs one; other steps may add one): what the owner sees on their own screen, worded without values they cannot predict (no IDs, no counts, no timestamps).
- **Privacy:** never write an account ID, an ARN with a 12-digit account number, an access key, or an email address anywhere (use placeholders such as `<account-id>` only in prose, never digits). Mark every step whose screen shows such values `sensitive: true` (the app warns not to paste them into problem notes). Templates must not contain them either.
- **Traps:** where the lab shows a "don't confuse" pair (ids in `content/dont-confuse.ts`: sqs-sns-eventbridge-kinesis, kds-vs-firehose, kms-vs-cloudhsm, sse-s3-kms-c, gateway-vs-interface-endpoints, direct-connect-vs-vpn, shield-vs-waf, secrets-manager-vs-parameter-store, sg-vs-nacl, iam-roles-vs-resource-policies, scp-boundary-identity, dr-strategies, aurora-vs-rds, multi-az-vs-read-replicas, peering-tgw-privatelink, alb-nlb-gwlb, cloudfront-vs-global-accelerator, instance-store-vs-ebs, ebs-efs-fsx, s3-storage-classes, savings-plans-ri-spot, nat-gateway-vs-instance) add a `LabTrap` pointing at the step where the difference shows, with its own source and quote.
- **Plan badge** is derived from `services` (names must be keys of `SERVICE_PLANS` in `content/labs/services.ts`; if you use a service not in the table, add it with `plan: 'unconfirmed'`, `evidence: 'none'` unless you can verify it from an AWS page and quote it). Do not claim "Free plan compatible" yourself; never guess. A lab with billable resources can never be derived as free. AWS Organizations is Paid plan only (a Free plan account upgrades itself on joining; source `free-tier-plans`), and IAM Identity Center's organization instance needs Organizations.
- **Step order** must work: prerequisites first, nothing used before it exists. `needs` lists earlier lab ids whose *results* this lab needs (avoid dependencies on resources that a previous lab's cleanup deleted; give each lab its own scaffolding via its own template instead).
- **Region:** assume a single Region of the owner's choice; say "your chosen Region" and tell them to stay in it. CloudShell and CloudFormation are fine as tooling.
- **Text style:** imperative, short. `goal` one or two sentences. Each lab 10 to 18 steps (cleanup and verify included). `minutes` is an honest estimate, 30 to 120.
- **Bullets:** `buildings` are the assigned buildings (see the table in your brief); `bullets` are 3 to 8 outline bullets of those buildings that the lab really practises (`docs/lab-outline-bullets.tsv` has the text; the checker also needs at least 9 live questions on them for the debrief).
- Banned terms and disputed claims: if two AWS pages disagree, do not use the claim; add it to `content/needs-verification.json` or `content/contradictions.json` format entries and say so in your notes file.

## Minimal example (shape only)
```ts
import type { Lab } from '../../src/labs/types';

const lab: Lab = {
  id: 'lab-99-example',
  n: 99,
  title: 'Example',
  goal: 'One or two sentences.',
  minutes: 45,
  buildings: ['identity-keep'],
  bullets: ['1.1-S1'],
  needs: [],
  services: ['AWS IAM'],
  costs: [{ id: 'nat', resource: 'NAT gateway', basis: 'Charged for each hour the gateway is available (page wording).', src: 'source-id', quote: 'Verbatim sentence from the page.' }],
  steps: [
    { id: 's1', text: 'Open the section and do X.', src: 'source-id', quote: 'Verbatim sentence from the page that supports this step.', checkpoint: 'You see Y.' },
    { id: 's2', kind: 'do', optional: true, costs: ['nat'], text: 'Create a NAT gateway.', alt: 'Skip it: the S3 gateway endpoint already reaches S3 for free.', src: 'source-id', quote: '...' },
    { id: 'c1', kind: 'cleanup', text: 'Delete the NAT gateway.', costs: ['nat'], src: 'source-id', quote: '...' },
    { id: 'v1', kind: 'verify', text: 'Confirm none remain.', code: 'aws ec2 describe-nat-gateways --query "NatGateways[?State!=\'deleted\'].NatGatewayId"', checkpoint: 'The list is empty.', src: 'source-id', quote: '...' },
  ],
  traps: [],
};
export default lab;
```

## Lab assignments
| # | Lab | Mapped buildings (pick bullets within them) | Notes |
|---|-----|---------------------------------------------|-------|
| 01 | Safe account | identity-keep, federation-bridge | Root MFA, no root use afterwards, no root access keys, an administrative identity, AWS Budgets budget with alerts, CloudTrail event history visible. **Free-plan caveat:** IAM Identity Center's organization instance requires AWS Organizations, which upgrades a Free-plan account (page `enable-identity-center`: "If you use a free tier account, creating an AWS organization automatically upgrades your account to a paid plan"; an *account instance* cannot give console access). Default path: an IAM group with administrator permissions and an IAM user with MFA; Identity Center is an optional note for Paid plan accounts. |
| 02 | IAM in practice | identity-keep, embassy-row, charter-hall | Role + trust policy, permissions boundary, resource policy, IAM policy simulator; pairs with Policy Court. Trap: scp-boundary-identity or iam-roles-vs-resource-policies. |
| 03 | Multi-account basics | embassy-row | Organizations + an SCP. **Paid plan only**; optional to run in a throwaway account; say so first. Trap: scp-boundary-identity. |
| 04 | VPC from scratch | gatehouse, watchtower, customs-house, nat-toll | CloudFormation template: public and private subnets in two AZs, route tables, security group vs network ACL, free S3 gateway endpoint; NAT gateway optional ("bills while running"). Traps: sg-vs-nacl, gateway-vs-interface-endpoints. |
| 05 | S3 security and storage | key-vault, archive-annex, cold-cellar | Block Public Access, bucket policy, SSE-S3 vs SSE-KMS, versioning, lifecycle rules. Trap: sse-s3-kms-c or s3-storage-classes. |
| 06 | CloudFront in front of S3 | certificate-office, cache-edge-breakwater, edge-link-terminal | OAC, default CloudFront domain; ACM certificate with a custom domain is **optional** (needs a domain the owner controls). Trap: cloudfront-vs-global-accelerator. |
| 07 | Serverless and decoupling | message-quay, serverless-mill, container-yard | API Gateway + Lambda + SQS with a DLQ + SNS or EventBridge. Trap: sqs-sns-eventbridge-kinesis. |
| 08 | DynamoDB design | database-registry, tuning-bay, db-cost-desk | Capacity modes, a GSI, TTL, point-in-time recovery. |
| 09 | A scalable web tier | scaling-floodgate, blueprint-hall, single-point-watch, throttle-lb-gate | Launch template, ASG over two AZs, ALB, target tracking. Own template (VPC + ALB + ASG). Everything here bills while running: instances optional only as far as the lab allows; keep it short and say so. Trap: alb-nlb-gwlb. |
| 10 | RDS | read-replica-annex, single-point-watch, db-cost-desk, rebuild-yard | Backups and snapshots, encryption, read replica vs Multi-AZ; DB instances bill while they exist, so make the billable parts optional with a read-only alternative (reading the docs/console create wizard without creating). Trap: multi-az-vs-read-replicas. |
| 11 | Monitoring and audit | compliance-registry, tide-gauges, watchtower | CloudWatch metrics, logs, alarms; CloudTrail; an AWS Config rule (the recorder bills: optional). |
| 12 | Data lake | data-lake-reservoir, refinery, ingestion-gate | S3, Glue crawler, Athena, CTAS to Parquet. |
| 13 | Backup and DR drill | backup-archive, disaster-bunker, durable-dock | AWS Backup plan, cross-Region copy, test restore. Trap: dr-strategies. |
| 14 | Cost tools | ledger-office, capacity-meter, counting-house, service-selection-bureau | Cost allocation tags, Cost Explorer, Budgets, Trusted Advisor or Compute Optimizer checks available on the plan (say honestly what is not available on the Free plan if you cannot confirm it). Trap: savings-plans-ri-spot. |
