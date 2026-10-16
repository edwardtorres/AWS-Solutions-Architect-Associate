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
| `npm run e2e` | Playwright against the production preview at 1440 px and 390 px (touch, `tap()` only) with axe (fails on serious/critical): building flow, inspection lock, placement, flags. Run `npm run build` first. Also in `check:all` |
| `npm run gen:meta` | Regenerates `src/questions/meta.ts` (id, building, bullets, difficulty; no keys). `check:content` fails if it is stale |
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

## Exam-era rule (services whose status changed)
If a service is on the exam guide's in-scope list and AWS docs still describe the capability, it may be a correct answer, and the explanation must state its current availability with a source (for example "closed to new customers"). Never write a question whose answer depends on the availability status itself. Services not on the in-scope list (App Runner, Timestream, Elastic Disaster Recovery) are never answers and never appear in a stem or option; notes may name them as context only. `content/exam-era.json` records each case with its AWS sentence and source id. Status labels (`preview`, `deprecated`, `retired`, `closed`) sit on the specific claim, never on a block whose main point is current.

## Question bank (Step 3)
Questions live in `content/questions/<district>/<building>.ts`, built with `mc()` and `mr()` from `content/questions/helpers.ts` (multiple choice: 1 correct of 4; multiple response: 2 or 3 correct of 5 or more; about 80/20). Each question has a building, outline bullets (none for Foundations), difficulty 1 to 3, tags (`placement-eligible`, `mock-reserve`, `trap:<pair-id>`), an explanation for every option, and verbatim AWS-page `evidence` quotes that `check:links` verifies. Options are stored in an authored order that the checks keep balanced and are shuffled at render time (`src/questions/present.ts`). The writer rules are in `docs/question-writing-guide.md`; per-building targets in `docs/question-plan.json`; review logs in `docs/reviews/`.
- **Size and weighting:** at least 3 live questions per bullet and 8 per building; domain shares within 2 points of 30/26/24/20 (Foundations excluded); difficulty about 20/55/25 with level 3 at 22% or more; at least 8 `placement-eligible` questions on every portfolio building (design decisions beyond the projects, never definitions).
- **Mock reserve:** questions tagged `mock-reserve` are never reachable by any draw except the `mock` mode in `src/questions/pool.ts`. Only `src/questions/*` may import question data (ESLint rule plus a scan in `check:content`); `check:bundle` proves the question data and the tag are absent from the entry chunk.
- **Answer-key access:** there is no route. The browser opens only from Settings behind a warning, holds its state in memory and never lists the reserve.
- **Question rules (checked):** in-scope service names only (also not Service Quotas, Application Auto Scaling or any out-of-scope name); no availability wording in a stem or option; no "all/none of the above"; no open needs-verification item or banned term; exam-era services carry `era` and the availability source; answer positions balanced (no position over 35% of MC, 60% of MR; correct option strictly longest in at most 40%); no near-duplicate stems (checked bank-wide).
- **Review per district:** writers, then a blind pass (`scripts/export-blind.ts`, `scripts/score-blind.ts`), then a source pass; every dispute is fixed or replaced and logged in `docs/reviews/<district>.md`. Helpers: `scripts/check-building.ts`, `scripts/rebalance-slots.ts`, `scripts/questions-stats.ts`.

## Post-guide rule (features newer than the exam guide)
The exam guide dates from August 2022. A feature AWS introduced on or after **2022-08-01** is *post-guide*. `content/post-guide.json` is the registry (id, name, introduced, certainty, source + verbatim date quote, `patterns`, `predecessorPatterns`; `preGuide` records candidates that turned out older). Rules, enforced by `check:content`:
- A question whose text (stem, options, explanations) matches a registry feature must declare it in `postGuide` (adds the `post-guide` tag). Every note block that matches carries `newer: [...]`, shown as a "Newer than the exam guide" label.
- **A post-guide feature may never be the key when the established design is a wrong option.** A question with `postGuideKey` fails if any option matches that feature's `predecessorPatterns` (for example DataSync Enhanced mode must not beat a Basic mode task with an on-premises agent; regional NAT must not beat one NAT gateway per Availability Zone). Rewrite to test the exam-era design, or compare the newer feature only with options that are wrong for other documented reasons.
- `post-guide` and `mock-reserve` never go together, and `mock` draws exclude `post-guide` (`src/questions/pool.ts`).
- Use `scripts/post-guide-scan.ts` to list matches, `scripts/post-guide-tag.ts` / `post-guide-label.ts` to add declarations. Dates come from AWS What's New / documentation history pages; anything undatable is treated as post-guide.

## Game loop (Step 4)
- **Lifecycle:** planned (a prerequisite is not commissioned) → surveyed (derived) → under construction after opening the building's notes and passing a 2-question start-up check (both right; new draw on retry, no daily limit) → commissioned by a 5-question inspection at 4/5 or better. A second failed inspection of one building on one local day locks its inspections until the next local day; leaving an unfinished inspection counts as a failure. Draws use the building's live questions only (never `mock-reserve`), cover each bullet where possible, include one at difficulty 2 or 3 and avoid the previous attempt's questions.
- **Placement** (19 portfolio buildings only, even while planned): 5 `placement-eligible` live questions, all 5 right; one attempt started per building per local day (counted at start; a reload resumes it). Passing commissions with a visible "Placed" mark and unlocks dependents.
- **Scoring: full credit only.** A multiple-response question is correct only if exactly the keyed set is chosen. The key is shown only after the attempt is finished.
- **Local day** = the calendar date in the browser's time zone (`Intl.DateTimeFormat`); day arithmetic uses calendar components, so 23/25-hour days (for example 1 Nov 2026) behave like any other day.
- **XP:** a correct answer earns 10 / 20 / 40 by difficulty 1 / 2 / 3, any later answer to the same question a quarter (3 / 5 / 10); +50 once per building on commissioning. **Ranks:** Surveyor 0 · Apprentice 150 · Foreman 500 · Mason 1,200 · Builder 2,500 · Architect 4,500 · Master Builder 7,000 · City Planner 10,000 · Chief Architect 13,000. **Streak:** a local day counts at 10 answered questions. **Badges:** four districts, Foundations, all portfolio buildings, a flawless (5/5) inspection, 7- and 30-day streaks, whole city.
- **Readiness** per domain = accuracy over the last **30** counted answers × bullet coverage (share of the domain's bullets answered correctly within the last **100** counted answers), "—" below **10** counted answers; overall weights 30/26/24/20 and is "—" until all four domains have a value. Counted: inspection, placement (later review, puzzle, lab, mock). Start-up checks never count.
- **Save v2:** `game` block (notes opened, attempts in progress, XP, seen counts, days, badges, flags, compact answer log capped at 4,000); migration chain in `src/save/migrate.ts`. Flags are local, listed in Settings and exportable as text.
- Engine in `src/game/` (pure functions over the save, injectable clock and city); UI in `src/ui/play/` and `src/ui/ProgressPage.tsx`.

## Owner decisions on Step 4 (approved)
- **Overall readiness stays strict:** "—" until all four domains have a value; it is not re-normalised over the domains that have data.
- **The 18 post-guide keys with no exam-era option stay.** A newer feature may be the key when no option shows the established design; those questions are tagged `post-guide` and excluded from mocks.
- **Leaving an unfinished inspection counts as a failed inspection** (it counts toward the same-day lock).
- **Start-up checks keep XP and streak credit** but never count towards readiness.

## Layout
`scripts/` official data + content/bundle/hygiene/layout checks · `content/` sources, glossary, don't-confuse pairs, renamed services, needs-verification queue, contradictions, notes per district · `src/data/` buildings, roads, districts, families, outline · `src/save/` save schema v1, migrations, store · `src/ui/` map, panel, atlas, save menu, `src/ui/notes/` notes, glossary and don't-confuse pages · `src/dev/` dev-only hooks · `src/lib/` graph, rng, routing.

## Roadmap (build one step at a time, audit after each)
1. **Done (approved):** scaffold, official outline + content check, skill tree, city map + Service Atlas, save v1.
2. **Done (approved):** Step 1 fixes (69 buildings, Machine Learning family, Foundation cap 5), notes for every building (audit in `docs/step-2-audit.md`). Scope: notes for every building, sourced from AWS docs, with "don't confuse" pairs (security groups vs network ACLs, gateway vs interface endpoints, ALB vs NLB vs GWLB, S3 storage classes, RDS Multi-AZ vs read replicas, SQS vs SNS vs EventBridge vs Kinesis, Savings Plans vs Reserved Instances vs Spot, EBS vs EFS vs FSx, KMS vs CloudHSM, Shield vs WAF, Direct Connect vs Site-to-Site VPN, CloudFront vs Global Accelerator), scenario keyword cues, and Azure crosswalk notes.
3. **Done (awaiting approval):** question bank (audit in `docs/step-3-audit.md`): multiple choice and multiple response only, AWS scenario style, weighted 30/26/24/20, in-scope services only, independent review.
4. **Done (awaiting approval):** core game loop (audit in `docs/step-4-audit.md`): lifecycle, inspections with a same-day retry lock, placement checks, XP, ranks, streaks, badges, readiness weighted by domain (excluding start-up checks), save migrations.
5. Puzzles with computed answers: IAM policy evaluator (explicit deny, SCPs, permission boundaries, resource policies), VPC traffic tracer (security groups, NACLs, route tables), DR strategy picker by RTO/RPO, S3 lifecycle planner, architecture builder, cost-choice scenarios with no hardcoded prices.
6. Hands-on labs in a real AWS account with cost guardrails (budget and alerts first, free-tier-friendly, cost warnings, cleanup steps), building on the portfolio projects.
7. Spaced review, Weak Spots, and a mock exam (65 questions, 130 minutes, MC and MR only, domain-weighted, freshness rule, ready-to-book rule, note that 720 is a scaled score).
8. Full claim fact-check against AWS docs, `verifiedAt` dates, `check:freshness` (compare content hashes where pages publish no dates).
9. Deploy to `saa.edwardtorres.dev`: S3 + CloudFront with Origin Access Control, infrastructure as code, GitHub Actions via an OIDC role (no long-lived keys), Cloudflare DNS; weekly freshness workflow; portfolio README.

Also deferred: an optional DP-600/PL-300 carryover for the analytics buildings (tags currently marked `PL-300/DP-600`).
