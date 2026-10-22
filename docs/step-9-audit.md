# Step 9 audit: final fixes, production hardening, deploy and staying current

**Status.** Parts A to E are built and verified locally, and pushed. The AWS, Cloudflare and GitHub settings belong to the owner and
are not done yet, so the live checks (headers and CSP on the live host, the service worker offline, three live Lighthouse runs,
the deploy itself) are **pending**. The first freshness run has completed and reported findings that need review (Part D). They
are listed below with the exact checks to run. Nothing in this audit claims a live result.

| Part | What it covers | State |
| --- | --- | --- |
| A | Final content fixes (storage-market-009, blueprint-hall-010, the S3 Infrequent Access contradiction) | Done, pushed (c3e30e7) |
| B | Installable app, offline, save protection, error boundary, 404, route safety, Lighthouse | Done, pushed (e933c60) |
| C | CloudFormation stacks, deploy workflow with OIDC, the runbook | Templates and workflows validated; deploy waits for the owner |
| D | Weekly content watch, network exit codes, scope fix | Done; first run completed and opened issue #1 with two findings, not yet reviewed (see below) |
| E | README, screenshots, privacy scan | Done |

## Part A: final content fixes

**A1. storage-market-009 (MR, Treasury).** The owner's instruction assumed the key was Elastic throughput. The file's key was
Bursting throughput, so this was a key change, and it is reported as one.

- Before: key Bursting throughput. After: key "Use Elastic throughput on an Amazon EFS file system", tagged `post-guide`
  (`efs-elastic-throughput`, launched 27 Nov 2022, after the exam guide's August 2022 date).
- The post-guide registry names Provisioned and Bursting throughput as Elastic's predecessors, so neither can be a wrong option.
  The distractor was replaced with "Use Max I/O performance mode on the file system", explained with the EFS performance page
  (Max I/O is not supported with Elastic throughput).
- Evidence: the efs-performance quote "Elastic throughput is the best throughput mode for spiky or unpredictable workloads with
  performance requirements that are difficult to forecast" (verified with `check:links`).
- Blind re-review: a fresh reviewer answered from the keyless export; `score-blind` reports 009 agrees with the new key. Source
  pass: a fresh checker verified the quotes and the explanation against the page.

**A2. service-selection-bureau-010.** No change. The stem already states "low and steady" traffic and forecastable capacity,
which is the condition AWS gives for Provisioned capacity. An optional rewording ("reliably forecast") was not made; it would
need a blind re-review, and the owner has not asked for it.

**A3. blueprint-hall-010.** The key's explanation was rewritten to sentences the Auto Scaling and Elastic Load Balancing pages
state (scaling policies, desired capacity distributed across Availability Zones, routing to healthy targets). A fresh checker
recorded the verdict in `docs/reviews/step-8/ledger/G1-keys.jsonl`. The key set did not change, so no blind re-review.

**A4. The S3 Infrequent Access "minimum duration" contradiction.** The pages differ by direction, not on the billing minimum:

- The storage decision guide: "Amazon S3 no longer applies a 30-day minimum storage duration for transitions to ... Standard-
  Infrequent Access and ... One Zone-Infrequent Access." This is about entering the classes.
- The storage-class and lifecycle pages: objects deleted, overwritten or transitioned to a different class before 30 days are
  charged the remainder of the 30 days. This is about leaving the classes.
- The lifecycle rule ("can't create a single Lifecycle rule that transitions objects from one storage class to another before the
  minimum storage duration period has passed") is about chained transitions and does not conflict.

Changes:

- `content/contradictions.json`: `c-s3-ia-minimum-duration` renamed `c-s3-ia-transition-direction`, with the three readings and
  verdict "resolved" (the difference is direction only).
- `content/needs-verification.json`: both related items point at the new id.
- `content/notes/treasury/cold-cellar.ts`: the billing minimum is stated plainly; the disagreements block cites the new id.
- **Puzzle evaluator (reported before and after):** `src/puzzles/cold-cellar/def.ts` refused any move into Standard-IA or
  One Zone-IA before day 30, which encoded the entry reading. The refusal is removed; the early-leaving charge rule stays.
  The unit test now asserts that the move is computed. No content scenario changed answer: `check:content` rejects any scenario
  that hits a refusal, so no scenario relied on it.
- No question states an entry minimum (grep confirmed).

## Part B: production polish (pushed in e933c60; deploy gating in d725ca9)

**Installable app and offline.** `vite-plugin-pwa` (generateSW, `registerType: 'prompt'`, no injected register script; the app
registers through `virtual:pwa-register`). The manifest reads: name "Region Builder · SAA-C03", short name "Region Builder",
`display: standalone`, theme and background `#0b1a2b`, icons 192 px, 512 px and a 512 px maskable icon; the 180 px apple-touch icon
is linked from the page. Icons were rendered from the favicon glyph with Playwright (`scripts/make-icons.ts`).

- The build precaches 96 entries (about 4.1 MB, including the lazily loaded question chunks, so the app works offline everywhere).
  This is a real first-install cost on a slow phone connection; see deviations.
- e2e: the service worker installs on the first visit, the page reloads offline and opens the City map, and axe is clean
  (`e2e/app-shell.spec.ts`, both widths).
- **Update prompt:** `PwaUpdatePrompt` offers "Reload to update" and "Later". A DOM test covers the three states with the hook
  mocked. It is not exercised end to end, because that needs a second service-worker build.
- **Install help:** on iPhone and iPad outside standalone mode, Settings lists the steps: open in Safari, tap Share, tap Add to
  Home Screen, then Add. The platform check is unit-tested (iPhone, iPad reporting as a Mac, Mac, Android). An e2e test sets an
  iPhone user agent and runs axe on the panel.

**Save protection (save v6).**

- Settings shows the result of `navigator.storage.persisted()` and, on request, `persist()`: granted, not granted, or not
  supported. The Safari note is shown: "Safari may clear site data for sites you have not used for a while. Installing the app
  and exporting a backup both protect your progress."
- `ui.lastExportAt` is stored; `MIGRATIONS[5]` adds it. The backup banner appears when there is progress and no export in the last
  seven days. "Export now" downloads the save and records the date; "Later" hides it for 24 hours (a snooze stored in
  localStorage, read and written in try/catch).
- A failed write is shown as a notice ("This browser could not save your latest change ... Export a backup now.") and is
  e2e-tested with `setItem` forced to throw.

**Error boundary, 404 and routes.**

- `AppErrorBoundary` wraps the app in `main.tsx`. Its fallback reads the raw save directly, so it can export it after a crash,
  and offers Reload and "Back to the map". DOM tests cover rendering, the export, and the no-save case.
- Unknown hash routes show a not-found page with links to the map and progress (e2e, with axe). A missing file gets the static
  `404.html` with status 404 (checked with curl and e2e).
- Route segments are decoded safely: a malformed segment no longer throws during render.

**Accessibility and Lighthouse.** axe runs in every spec that renders a new page. The Lighthouse runner (`scripts/lighthouse.ts`,
`npm run lighthouse`) uses Lighthouse's default mobile preset (mobile emulation, simulated throttling) on the production build,
served by `scripts/serve-prod.ts` with the deploy's security headers and compression.

| Run (local production build) | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| 1 | 95 | 100 | 100 | 100 |
| 2 | 95 | 100 | 100 | 100 |
| 3 | 94 | 100 | 100 | 100 |
| Median (`docs/lighthouse/local-mobile.json`) | 94 | 100 | 100 | 100 |

First measurement, before the server compressed responses: performance 78 (main script 354 KB uncompressed). CloudFront
compresses text responses when the distribution is set to `Compress`, so the server was changed to gzip and brotli the same way,
and the numbers above are measured with that. The local figure is not the live figure: the live run is pending.

## Part C: deploy (templates and workflows; the deploy waits for the owner)

**CloudFormation** (`infra/`, cfn-lint clean on all seven templates in the repository, `check:cfn` covers `infra/`):

| Stack | Resource | Notes |
| --- | --- | --- |
| saa-cert (us-east-1) | `AWS::CertificateManager::Certificate` | DNS validation; its own stack, so the site stack does not wait on Cloudflare |
| saa-site (us-east-1) | `AWS::S3::Bucket` | All four Block Public Access settings, BucketOwnerEnforced, SSE-S3, `DeletionPolicy: Retain` |
| | `AWS::S3::BucketPolicy` | `s3:GetObject` for `cloudfront.amazonaws.com` only when `AWS:SourceArn` is this distribution; denies plain HTTP |
| | `AWS::CloudFront::OriginAccessControl` | SigningBehavior always, sigv4, s3 origin. A comment notes the exam may present OAI, and AWS recommends OAC |
| | `AWS::WAFv2::WebACL` | Scope CLOUDFRONT, default allow, no rules |
| | `AWS::CloudFront::ResponseHeadersPolicy` | The headers in the table below |
| | `AWS::CloudFront::Distribution` | Aliases the site host; ACM certificate; TLS 1.2 2021 minimum; SNI only; HTTP/2 and HTTP/3; IPv6; PriceClass_100; DefaultRootObject `index.html`; `redirect-to-https`; Compress; managed CachingOptimized by default and CachingDisabled for `/index.html`, `/404.html`, `/sw.js` and `/manifest.webmanifest`; 403 and 404 mapped to `/404.html` with status 404; no logging |
| | `AWS::IAM::OIDCProvider` | Only when `CreateGitHubOidcProvider` is true (one per URL per account); audience `sts.amazonaws.com`; no thumbprint (optional in the CloudFormation reference; AWS verifies GitHub's certificate through its trusted CA library) |
| | `AWS::IAM::Role` (deploy) | Trust and permissions below |
| | `AWS::Budgets::Budget` | Monthly, filtered on `user:Project$saa-region-builder`; email alerts at 80% actual and 100% forecast; email and limit are parameters with no default |

Managed cache policy IDs were checked against the AWS page: CachingOptimized `658327ea-f89d-4fab-a63d-7e88639e58f6`,
CachingDisabled `4135ea2d-6df8-44a3-9df3-4b5a84be39ad`.

**Deploy role.**

- Trust: `sts:AssumeRoleWithWebIdentity` from the GitHub OIDC provider, with `token.actions.githubusercontent.com:aud` equal to
  `sts.amazonaws.com` and `token.actions.githubusercontent.com:sub` equal to `repo:<owner/repo>:ref:refs/heads/main`. The
  repository defaults to this one and is a parameter.
- Permissions, and nothing else: `s3:ListBucket` on the bucket; `s3:PutObject` and `s3:DeleteObject` on the bucket's objects;
  `cloudfront:CreateInvalidation` on the distribution. `s3:GetObject` and `s3:GetBucketLocation` are not granted. Add
  `GetBucketLocation` only if a real run shows the CLI needs it.
- A unit test (`scripts/lib/infra.test.ts`, 16 tests) checks the trust conditions, the action list, the bucket's public-access
  settings, that OAC is used and OAI is not, the source-ARN limit, the TLS and price class, and that no 12-digit number or ARN
  with account digits appears in the templates.

**Response headers** (the template's values equal `scripts/lib/securityHeaders.ts`, checked by a unit test, and the local
production server sends the same headers, checked by e2e and curl):

| Header | Value |
| --- | --- |
| Content-Security-Policy | `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'` |
| Strict-Transport-Security | `max-age=31536000` (no includeSubDomains, no preload) |
| X-Content-Type-Options | `nosniff` |
| X-Frame-Options | `DENY` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` |

The build's meta CSP omits `frame-ancestors` (a meta element cannot carry it). e2e fails on any CSP violation in the console.

**Cache rules.** Hashed files under `assets/` are sent with `public, max-age=31536000, immutable`. Everything else is `no-cache`.
The deploy sets these on S3, and CloudFront honours the origin headers on its default behaviour.

**Deploy workflow** (`.github/workflows/deploy.yml`, actionlint clean):

- `check`: `npm ci`, `npm run check`, Chromium with system libraries, `npm run test:layout`, `npm run e2e` on the production build
  served with the deploy headers. It uploads `dist/` as an artifact. Pull requests do not deploy.
- `deploy` (needs `check`; skipped until `AWS_DEPLOY_ROLE_ARN` is set, so the first push to main is not a red run): downloads the
  artifact (the exact bytes that passed), masks the role ARN, bucket and distribution ID before any step can print them, assumes
  the role through OIDC with `id-token: write`, then:
  1. syncs `assets/*` with the immutable header;
  2. copies `*.woff2` with the `font/woff2` type (the CLI guesses types from extensions);
  3. syncs everything else with `no-cache`;
  4. copies `manifest.webmanifest` with `application/manifest+json`;
  5. deletes hashed assets no build references any more, last, after the new `index.html` is live;
  6. invalidates `/`, `/index.html`, `/404.html`, `/sw.js` and `/manifest.webmanifest`.
- `smoke` (after deploy; `continue-on-error`): `npm run e2e:live` against `SITE_URL` at both widths. It reports on the run and
  cannot undo a deploy that has already happened.
- Concurrency group `site-deploy`, not cancelled mid-sync. Third-party actions are pinned to commit SHAs resolved from the
  remote tags: `actions/checkout` v7.0.1 (3d3c42e), `actions/setup-node` v7.1.0 (949feb2), `actions/upload-artifact` v7.0.2
  (cf430e0), `actions/download-artifact` v7.0.0 (37930b1), `aws-actions/configure-aws-credentials` v6.3.0 (e125382).

**Local check of the live path.** `npm run e2e:live` was run against the production build served with the deploy headers on a
local address: 68 of 68 passed (34 tests at each width). This is the pre-deploy rehearsal, not a live result.

**CloudFront pricing (finding).** CloudFormation has no property for a flat-rate pricing plan, so the Free plan is chosen in the
console: CloudFront, Distributions, the new distribution, Update, Pricing plan, Free. I checked the AWS page
(`flat-rate-pricing-plan.html`): subscribing an existing distribution is done from the console; features the page lists as
unsupported must be turned off first (its examples include real-time access logs, Anycast IP list configuration and continuous
deployment). This template enables none of them. Correction to my own earlier note: the page does **not** list Origin Access
Identity as unsupported; the template uses OAC because AWS recommends it. The page's feature table includes OAC and AWS WAF for
the plans; the template attaches a default-allow web ACL.

**Runbook.** `DEPLOY.md` gives the setup order with placeholders only, the console and Cloudflare steps, the verification
commands, the rollback (rerun the deploy workflow from main with `sha` set to an earlier commit: the checks run on that commit,
then it is published), the 403-to-404 behaviour, and teardown.

## Part D: staying current

**Exit codes** (`scripts/lib/network.ts`): 0 unchanged; 1 a real change or a failure the content must answer; 2 a network-class
failure (no connection, timeout, rate limit, 5xx). `check:freshness`, `check:freeplan` and `check:content --live` use them. The
structural STOP in `check:content` and `fetch-official` now exits 1 (it was 2). `isNetworkFailure` is unit-tested: a plain 404,
a page with no main content, a layout change and a bug in our own code are not network failures.

**Bug fixed.** `check:freshness --only <text>` marked every stored page outside the filter as removed and exited 1. A scoped run
now compares only the pages it asked about (`scopeHashFile`, with a regression test).

**The watch** (`scripts/freshness-watch.ts`, `npm run freshness:watch`; `.github/workflows/content-freshness.yml`, Mondays at 06:17
UTC and on demand, permissions `contents: read` and `issues: write`, not a dependency of any deploy):

- Each check runs with three retries and backoff (2, 4, 8 seconds) on exit 2. A network failure is a warning in the job summary,
  never an issue.
- A change produces one report, with the output of each changed check and the hidden marker `content-freshness:<hash>`. The hash
  covers the findings only, so the same findings give the same hash.
- Decision (`decideIssueAction`, unit-tested): no newest issue and findings, create one; the newest issue holds the same hash, do
  nothing; the newest is open and the hash differs (including a clean run), comment; the newest is closed, open a new issue only
  if the findings changed. A clean run with no open issue writes nothing. A run with a warning does not decide a clean result.
  This closed-issue rule goes beyond the plan: it stops the bot reopening findings the owner has already closed.
- It uses only `GITHUB_TOKEN`. `--dry-run` prints the report and makes no GitHub call.

**Reviewed change in the cited pages.** The dry run of the watch (below) found one changed page: `aws-backup/latest/devguide/vault-lock.html`,
whose main text gained a sentence about a third-party assessment for regulated environments. I re-verified every quote on every
cited page with `check:links --fresh` (807 sources, 807 pages, 7,993 quotes; all pass). The affected notes and questions
(archive-annex, compliance-registry, retention-records, two questions) state lock modes, grace time and deletion, all of which
the page still says, so nothing needed rewording. The hash was refreshed for that page only (`--update --only`), and
`check:freshness` now reports all 807 pages unchanged.

**Dry run** (`npm run freshness:watch -- --dry-run`, with the network): the exam guide check is OK; the Free Tier check reports
the offers changed since the snapshot of 2026-10-19 (added: AWS Security Hub, AWS Application Migration Service, Amazon Personalize
(paid plan exclusive), AWS Elemental MediaTailor (paid plan exclusive); removed: AWS IoT TwinMaker). No lab badge was named as
affected. The owner's plan expected the first scheduled run to report only these offer changes; it did not (see below).

**First manual run** (run 39853991305, triggered by hand on `main` at 5a735b6; completed, conclusion success). It opened issue #1,
labelled `content-freshness`, with no comments. It does not match the expectation in the dry run section: it reports two findings.

- **Cited pages: `tgw-how`** (`vpc/latest/tgw/how-transit-gateways-work.html`). Its hash differs from the stored value. A local fetch
  returns the same new hash on two requests, and the runner returns the same hash, so this is a real change on the page, not a
  fetch variant. Three blocks in `grid-planning-office` and question `grid-planning-office-013` cite it. Every quote that cites the
  page still verifies against the live page (`check:links --fresh`: 807 sources, 7,993 quotes, all pass). I did not identify the
  sentence that changed, because the fresh runs overwrote the cached page text. **The hash has not been refreshed, so the watch will
  keep reporting this page until a person reads the change and refreshes it.**
- **Free Tier offers: the list is not stable across renders.** Three renders of the same page gave three different removed sets:
  AWS IoT TwinMaker alone (the dry run); IoT TwinMaker and Amazon Neptune (a later local run); IoT TwinMaker and AWS re:Post (the
  runner). The added offers (Security Hub, Application Migration Service, Personalize, MediaTailor) were the same in each. So the
  "removed" items in issue #1 are not reliable.

Not done: the review of `grid-planning-office` and the hash refresh for `tgw-how`, and any change to how the Free Tier offers are
extracted. Both are for the owner to decide (deviations 20 and 21).

## Part E: README and screenshots

- `README.md`: what the app is, the counts from the checks (4 domains, 14 tasks, 189 bullets, 69 buildings, 97 roads, 1,013
  questions, 807 cited pages and 7,993 verified quotes), the content build process, an architecture diagram (Mermaid), the checks
  table, local commands, deployment and upkeep, the layout, and the attribution and disclaimer.
- Screenshots (`docs/screenshots/`): desktop map and notes at 1440 px, phone map and save protection at 390 px, captured from the
  production build by `npm run screenshots` with a seeded save in the browser only.
- Privacy scan: no 12-digit number and no `arn:aws` with account digits in any tracked file or commit message. The matches that
  remain are deliberate fixtures (hygiene tests that construct a fake account number, placeholder names such as `ACCT_MAIN` in an
  older audit, and localhost test ports in Playwright config). No session link and no private link.

## Owner checklist (AWS, Cloudflare and GitHub: not done by me)

Follow `DEPLOY.md`. In order:

1. **AWS, portfolio account, Paid plan (never the lab account).** Sign in, set the console to us-east-1. IAM, Identity providers:
   is there already a provider for `token.actions.githubusercontent.com`? If yes, note its ARN and use `CreateGitHubOidcProvider=false`.
2. Deploy the certificate stack (`saa-cert`). It waits for validation, so leave the terminal open.
3. **Cloudflare, zone edwardtorres.dev.** Copy the CNAME name and value that ACM shows for the certificate, and add them as a
   record with **DNS only** (grey cloud).
4. When `saa-cert` completes, read `CertificateArn` from its outputs and deploy `saa-site` with `BudgetEmail`, `BudgetLimitUsd` and
   `CertificateArn` (and the OIDC parameters from step 1).
5. **CloudFront console.** Open the new distribution, Update, Pricing plan, Free. Confirm the console shows $0 with no overage.
6. **Billing and Cost Management.** Activate the cost allocation tag `Project` (it can take up to 24 hours to appear).
7. **Cloudflare.** Add a CNAME `saa` pointing at the `DistributionDomainName` output, **DNS only**. Confirm no `saa` record existed.
8. **GitHub repository, Settings, Secrets and variables, Actions, Variables.** Set `AWS_DEPLOY_ROLE_ARN` (output `DeployRoleArn`),
   `AWS_REGION` (us-east-1), `SITE_BUCKET` (output `SiteBucketName`), `CLOUDFRONT_DISTRIBUTION_ID` (output `DistributionId`) and
   `SITE_URL` (`https://saa.edwardtorres.dev/`). Check that Actions is enabled. Setting the first variable un-skips the deploy job.
9. Confirm in ACM that the certificate shows **Issued**, and in CloudFront that `saa.edwardtorres.dev` is an alternate domain name.
   Tell me when both are true and I run the live checks below.

## Live results: pending

When the owner's steps are done, I will run and record:

- `curl -sI https://saa.edwardtorres.dev/` and `/no-such-file.html`: the security headers, the status 404 page, the cache headers.
- `SITE_URL=https://saa.edwardtorres.dev/ npm run e2e:live`: the app specs at both widths.
- The service worker: it installs on the first visit and the app opens offline after a reload.
- `npm run lighthouse -- --url https://saa.edwardtorres.dev/ --runs 3 --out docs/lighthouse/live-mobile.json`: each run and the median.
- The deploy workflow's first real run, and its smoke job.

## Deviations and uncertainties

1. **HTTPS.** The brief asked for HTTPS only. The distribution uses `redirect-to-https`: plain HTTP gets a redirect and is never
   served. It is a one-line change to `https-only` if the owner prefers.
2. **Price class.** PriceClass_100 (North America and Europe edge locations), chosen for cost. Visitors elsewhere are served from
   farther edges.
3. **Pricing plan** is a console step; CloudFormation cannot set it. I cannot verify the console from here.
4. **Stale assets** are deleted last, after the new index is live, not in the same sync as the upload. This is safer for a visitor
   who loaded the old index during the deploy.
5. **`registerSW.js`.** The plan listed it as a non-hashed file to cache-bypass. The build does not produce it, because the app
   registers the service worker through the virtual module. The cache behaviours cover the files that exist.
6. **Exit codes changed** for `check:freshness`, `check:freeplan` and `check:content --live` (2 now means network) and for the
   structural STOP (1 now, was 2). This is documented in `scripts/lib/network.ts`.
7. **The watch treats a crashed check as a finding.** A check that exits 1 because of a script bug is reported as a change, so
   its stack trace would appear in the issue. That is visible, and I chose it over hiding a bug as a warning.
8. **Save v6 migration** is tested on a synthetic v5 save built from the v5 shape. The repository has no real v5 save. The owner can
   export a real save to test the migration on real data.
9. **First-install cost.** The precache is about 4.1 MB (96 entries), including the lazily loaded question chunks, so the app works
   offline from one visit. On a slow phone connection the first visit downloads all of it. Reducing that would mean not precaching
   the question chunks, which would break offline study. I left it as built and flag it for the owner.
10. **Lighthouse** is measured on the local production build with the default mobile preset and simulated throttling. The live
    numbers are pending. Performance is above 90 without changing fonts, so no font subsetting was needed.
11. **iOS** install and Safari's eviction of site data cannot be tested in headless Chromium. The owner checks on an iPhone:
    install from Settings, then confirm the app opens offline.
12. **The update prompt** is covered by a DOM test with the hook mocked. The full flow (a second service-worker build, then Reload)
    has not been exercised end to end.
13. **The closed-issue rule** in the watch is my decision beyond the plan (see Part D).
14. **Action versions.** The pinned action tags are the newest releases on the remote at the time of this step. Re-check them when
    upgrading.
15. **cfn-lint** runs from a pip install with no version pin in CI; 1.57.2 was used here.
16. **The budget email and limit** are parameters with no defaults, so they are never committed.
17. **Licence.** The repository declares no licence. The owner decides this; I have not added one.
18. **Puzzle timing flake.** The workbench DOM test failed once under full-suite load earlier in Step 9 (a 1-second wait), passed on
    rerun, and did not fail in any run recorded here. It is still worth watching.
19. **Browser build.** The installed Playwright expects a Chromium build this environment does not have. The project's
    `CHROMIUM_PATH` lookup falls back to the pre-installed browser here; CI installs Playwright's own build.
20. **The Free Tier offer list is unstable.** Renders of the same page gave different removed offers (see First manual run). The
    watch reports such a change as a finding. The check should confirm a change on two consecutive renders, or wait until the whole
    list has loaded, before it opens or comments on an issue. Not changed here: it changes the watch's behaviour, so it is the
    owner's call.
21. **The Transit Gateway page changed and the change is not reviewed.** The quotes still verify, but no person has read the new text
    against the notes and question that cite the page, and the hash is not refreshed.

## Test results

Every command was run on the tree at the commit before this audit, unless noted.

| Command | Result |
| --- | --- |
| `npm run check` (typecheck, lint, unit tests, content, cfn-lint, build, bundle, hygiene) | Exit 0. Unit tests 562 of 562 in 42 files; check:content OK (4 domains, 14 tasks, 189 bullets, 69 buildings, 97 roads, 1,013 questions); check:cfn 7 templates; check:bundle 94 files; check:hygiene 746 files, 199 commits |
| `npm run check:content -- --live` | Exit 0; live guide matches |
| `npm run check:links -- --fresh` | Exit 0; 807 sources, 807 pages, 7,993 quotes verified, 27 redirect notes |
| `npm run check:freshness` (after the vault-lock refresh) | Exit 0; 807 pages unchanged |
| `npm run test:layout` | Exit 0; 74 checks at 390 px (touch) and 1280 px (keyboard) |
| `npm run e2e` (production build, both widths, axe) | 78 passed, 0 failed |
| `npm run e2e:live` against a local deploy-header server | 68 passed, 0 failed |
| `npm run lighthouse` (three runs, saved) | Median performance 94, accessibility 100, best practices 100, SEO 100 |
| `npm run freshness:watch -- --dry-run` | Ran all three network checks; report as in Part D |
| `npm run check:links -- --fresh` after the first run | Exit 0; 807 sources, 807 pages, 7,993 quotes verified (includes the changed Transit Gateway page) |
| First manual run of content-freshness (GitHub, 5a735b6) | Completed, success; opened issue #1 with two findings (see Part D) |
| Deploy workflow on push (GitHub, 5a735b6) | Completed, success; the deploy job is skipped until `AWS_DEPLOY_ROLE_ARN` is set |
| actionlint (deploy.yml, content-freshness.yml) | Clean |
| `npx eslint .` | Clean |
| Privacy scan (12-digit numbers, `arn:aws`, session and private links) | Only deliberate fixtures (see Part E) |

## Push confirmation

This audit is committed with the rest of Step 9 and pushed to `origin/main`, then fast-forwarded on `claude/serene-carson-6ot1u0`.
The check that `git rev-parse HEAD` equals `origin/main` after the push is reported in the final message of this step.
