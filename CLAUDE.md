# Region Builder: AWS Certified Solutions Architect – Associate (SAA-C03)

A game-style study app. The player is the chief architect building a city inside an AWS Region, spread across three islands (Availability Zones). It is built in steps; **each step ends with an audit that the owner reviews. Do not start the next step until they approve.**

## Stack
Vite + React 19 + TypeScript (`strict`, `noUncheckedIndexedAccess`) + Tailwind v4. No backend; progress is saved in `localStorage` under a **versioned save schema with migrations** (`src/save/`). Vitest for unit and DOM tests, ESLint flat config, Playwright (Chromium) for the layout test. Hash routing (`#/map`, `#/atlas`, `#/<view>/<buildingId>`) so static hosting needs no rewrite rules.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server (dev-only hooks enabled) |
| `npm run build` / `npm run preview` | Typecheck and production build / serve it |
| `npm run typecheck` · `npm run lint` · `npm test` | Types, lint, Vitest |
| `npm run check:content` (`-- --live`) | App structure vs `scripts/official-outline.json`; `--live` also diffs the live exam guide |
| `npm run check:links` | Network: every cited URL returns 200, every `#anchor` exists, every quote appears verbatim on its page (page text cached in `.cache/`, git-ignored). Also in `check:all` |
| `npm run check:bundle` | Proves dev hooks are absent from `dist/`, no external origins, strict CSP, local fonts, split chunks |
| `npm run check:hygiene` | No private links, session links, tokens, account IDs or local paths in files or commits |
| `npm run test:layout` | Playwright at 390 px (touch) and 1280 px (keyboard): no sideways scroll, targets ≥ 44 px, panels, saves |
| `npm run check` / `npm run check:all` | Everything offline / plus the layout test |
| `npm run fetch:official` | Regenerates the official data files (outline, services, short names) from the live guide |
| `npx tsx scripts/add-source.ts <id> <url> "<title>" [azure]` | Adds one entry to `content/sources.ts` (locks the file, refuses a duplicate id or URL) |
| `npx tsx scripts/q.ts <url> "<regex>"` · `npx tsx scripts/ctx.ts <url> "<regex>" <chars>` | Research helpers: matching sentences / text around a match |

## Git rules
- Commit as the GitHub noreply address `12915571+edwardtorres@users.noreply.github.com`.
- **Never commit** private links, session links, tokens, AWS account IDs, or local file paths. `npm run check:hygiene` enforces this on files and commit history.
- No model name in commits or files.

## Exam facts (SAA-C03)
Source for each fact is named; the content check (`--live`) re-verifies them.
- **65 questions: 50 scored, 15 unscored.** Unscored questions are not identified. *Exam guide* ("Exam content", "Unscored content"). The certification page states only the 65 total.
- **130 minutes.** *Certification page* (`aws.amazon.com/certification/certified-solutions-architect-associate/`).
- **Question types:** multiple choice (1 correct of 4) and multiple response (2 or more correct of 5 or more options). *Exam guide*, "Response types". Unanswered counts as incorrect; no penalty for guessing.
- **Scaled score 100–1,000; minimum passing score 720** (a scaled score, not a percentage). *Exam guide*, "Exam results".
- **Compensatory scoring:** no need to pass each section, only the overall exam. *Exam guide*.
- **Domains and weights of scored content:** 1 Design Secure Architectures 30% · 2 Design Resilient Architectures 26% · 3 Design High-Performing Architectures 24% · 4 Design Cost-Optimized Architectures 20%. 14 task statements: 3 / 2 / 5 / 4.
- Recommended experience: 1+ year designing cloud solutions on AWS (no prerequisites).
- Official outline recorded verbatim: `scripts/official-outline.json` (189 bullets: every "Knowledge of" and "Skills in" bullet, tagged). In-scope, out-of-scope, technologies/concepts lists and the short-service-names note: `scripts/official-services.json`.
- **Questions may use only in-scope services.** Note that AWS CloudShell, AWS CDK, CodeBuild/CodeDeploy and Fault Injection Simulator are *out of scope*: labs may use them as tooling, questions never.
- **Never use exam dumps.**

## Allowed sources
`docs.aws.amazon.com` and `aws.amazon.com` (FAQs, pricing pages, the Well-Architected Framework). The one exception is `learn.microsoft.com`, **only** for Azure comparison notes (the AWS-to-Azure comparison pages). If something cannot be verified, flag it in `content/needs-verification.json` instead of guessing. `check:content` fails on any other source host.

## Lessons from previous study apps (apply from the start)
1. **Shuffle every question format at render time** and keep source files balanced (answer positions, multiple-response positions). Use `shuffle()` from `src/lib/rng.ts`.
2. **Debug and test hooks (such as `?seed=`) work only in dev builds**, behind `import.meta.env.DEV`; `check:bundle` proves they are absent from production (it fails if a dev build is checked).
3. **React effects always use block bodies.** A one-line `useEffect(() => scrollTo())` returned scrollTo()'s Promise and crashed a page on current Chrome. The `no-restricted-syntax` rule in `eslint.config.js` rejects expression-bodied `useEffect`/`useLayoutEffect`/`useInsertionEffect`; `src/lintRule.test.ts` proves it fires.
4. **Self-hosted fonts and no external origins** (strict CSP meta in production, offline PWA later). No inline `style=` attributes. **Code-split by feature** (`React.lazy`).
5. **Every fact cites an allowed source.** Keep the needs-verification queue; use `BANNED_TERMS` (`scripts/banned-terms.ts`) for disputed claims; show contradictions between docs both ways (`content/contradictions.json`) while keeping them out of questions.
6. **Content is reviewed by separate reviewer agents**: a blind pass, then a source pass.

## Platform
The owner studies on an iPhone and on Windows/Mac desktop browsers. Every interaction must work by tap and keyboard at **390 px with no page-level sideways scroll**. Future labs use the AWS console and CloudShell in the browser, so they need no OS-specific tools.

## The game
- **Districts = exam domains:** Citadel (Secure), Harbor & Levees (Resilient), Express Quarter (High-Performing), Treasury (Cost-Optimized). Founders' Square holds the Foundations. Islands A/B/C are the three AZs; placement is cosmetic.
- **Buildings** group 2–5 outline bullets from one task statement; every bullet belongs to exactly one building. At most 5 **Foundations** cover background the outline assumes but no bullet teaches.
- **States:** planned (locked) · surveyed (idle) · under construction (running) · commissioned (certified). Only the last two are stored; planned/surveyed are derived from prerequisite roads.
- **Roads** are prerequisites with a one-line reason. Rules (tested): acyclic, every building reachable from a start building, no road implied by other roads.
- **Service families:** Security & Identity, Networking & Content Delivery, Compute, Storage, Database, Application Integration, Analytics, Management & Governance, Migration. The Service Atlas groups buildings by family; links across districts are computed from shared families. Deviation: Cost Management, Containers, Serverless and Developer Tools fold into the closest family (`src/data/families.ts`); Machine Learning has no family.
- **Carryover tags:** *portfolio* (S3 static hosting, CloudFront, Lambda, API Gateway, DynamoDB; later steps add a placement check on SAA-level design decisions, never definitions) and *Azure crosswalk* (concept pairs from the Microsoft Learn comparison pages; Step 2 adds the short note, including where the analogy breaks).

## Naming rule (renamed services)
Questions use the service names from the exam guide's in-scope list and the short-names list (`scripts/official-short-names.json`, diffed by `check:content -- --live`). Notes show the current name beside any rename, written `{{rename:id}}`, with sources for both names. `content/renamed-services.ts` holds each verified rename (IAM Identity Center, SageMaker AI, Amazon Quick, Amazon Data Firehose). A note that uses an old or other name outside that list fails `check:content`.

## Notes model (Step 2)
Notes for every building live in `content/notes/<district>/<building>.ts` (lazy chunk per district through `src/content/district-*.ts`). A note is built from blocks `b(text, sourceIds, quotes, opts)`: every block cites pages from `content/sources.ts` and carries verbatim quotes that `check:links` verifies against the live page. Checks (`check:content`): a number or number-word in prose must appear in a quote of the same block; no prices; deprecated/retired/preview words need a `status` label and a quote that says so; old service names need `{{rename:id}}`; Microsoft Learn sources only inside "Coming from Azure" blocks (each needs an AWS source too); each glossary term is defined once (`content/glossary.ts`) and used; no unused source; the required "don't confuse" pairs exist (`content/dont-confuse.ts`, list in `scripts/lib/notesChecks.ts`); `scripts/banned-terms.ts` blocks disputed claims. Where two pages disagree, both readings go in `content/contradictions.json`; what cannot be confirmed goes in `content/needs-verification.json` and is kept out of the notes. In the UI, "In a design" blocks and scenario cues are labelled study guidance, not AWS statements.

## Layout
`scripts/` official data + content/bundle/hygiene/layout checks · `content/` sources, glossary, don't-confuse pairs, renamed services, needs-verification queue, contradictions, notes per district · `src/data/` buildings, roads, districts, families, outline · `src/save/` save schema v1, migrations, store · `src/ui/` map, panel, atlas, save menu, `src/ui/notes/` notes, glossary and don't-confuse pages · `src/dev/` dev-only hooks · `src/lib/` graph, rng, routing.

## Roadmap (build one step at a time, audit after each)
1. **Done (approved):** scaffold, official outline + content check, skill tree, city map + Service Atlas, save v1.
2. **Done (awaiting approval):** Step 1 fixes (69 buildings, Machine Learning family, Foundation cap 5), notes for every building (audit in `docs/step-2-audit.md`). Scope: notes for every building, sourced from AWS docs, with "don't confuse" pairs (security groups vs network ACLs, gateway vs interface endpoints, ALB vs NLB vs GWLB, S3 storage classes, RDS Multi-AZ vs read replicas, SQS vs SNS vs EventBridge vs Kinesis, Savings Plans vs Reserved Instances vs Spot, EBS vs EFS vs FSx, KMS vs CloudHSM, Shield vs WAF, Direct Connect vs Site-to-Site VPN, CloudFront vs Global Accelerator), scenario keyword cues, and Azure crosswalk notes.
3. Question bank: multiple choice (1 of 4) and multiple response only, AWS scenario style, weighted 30/26/24/20, in-scope services only, independent review.
4. Core game loop: lifecycle, inspections with a same-day retry lock, placement checks, XP, ranks, streaks, badges, readiness weighted by domain (excluding start-up checks), save migrations.
5. Puzzles with computed answers: IAM policy evaluator (explicit deny, SCPs, permission boundaries, resource policies), VPC traffic tracer (security groups, NACLs, route tables), DR strategy picker by RTO/RPO, S3 lifecycle planner, architecture builder, cost-choice scenarios with no hardcoded prices.
6. Hands-on labs in a real AWS account with cost guardrails (budget and alerts first, free-tier-friendly, cost warnings, cleanup steps), building on the portfolio projects.
7. Spaced review, Weak Spots, and a mock exam (65 questions, 130 minutes, MC and MR only, domain-weighted, freshness rule, ready-to-book rule, note that 720 is a scaled score).
8. Full claim fact-check against AWS docs, `verifiedAt` dates, `check:freshness` (compare content hashes where pages publish no dates).
9. Deploy to `saa.edwardtorres.dev`: S3 + CloudFront with Origin Access Control, infrastructure as code, GitHub Actions via an OIDC role (no long-lived keys), Cloudflare DNS; weekly freshness workflow; portfolio README.

Also deferred: an optional DP-600/PL-300 carryover for the analytics buildings (tags currently marked `PL-300/DP-600`).
