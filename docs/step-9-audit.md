# Step 9 audit: final fixes, production hardening, deploy and staying current

**Status.** Parts A to E are built and verified locally. The AWS, Cloudflare and GitHub settings belong to the owner and are not
done yet, so the live checks (headers and CSP on the live host, the service worker offline, three live Lighthouse runs, the deploy
itself) are **pending**. Nothing in this audit claims a live result. The owner reviewed the Step 9 audit and asked for six
corrections before the account steps; they are recorded in **Review corrections** below, with before and after for each.

| Part | What it covers | State |
| --- | --- | --- |
| A | Final content fixes (storage-market-009, blueprint-hall-010, the S3 Infrequent Access change) | Done; storage-market-009 reverted to its Step 8 key and the S3 change added to the registry (see Review corrections) |
| B | Installable app, offline, save protection, error boundary, 404, route safety, Lighthouse | Done, pushed (e933c60) |
| C | CloudFormation stacks, deploy workflow with OIDC, the runbook | Templates and workflows validated; the web ACL stays, for the pricing plan; deploy waits for the owner |
| D | Weekly content watch, network exit codes, paragraph history, Free Tier and Transit Gateway checks | Done. Transit Gateway reviewed and refreshed. The Free Tier list is confirmed for now but has varied between runs (see Part D and deviation 20) |
| E | README, screenshots, privacy scan | Done |

## Part A: final content fixes

**A1. storage-market-009 (MR, Treasury).** Part A changed the key from Bursting throughput to Elastic throughput, a key change that was
tagged post-guide. The owner's review reverted it: the question is back in its Step 8 state, with the Bursting key that the stem
describes. The before and after are in Review corrections, item 1.

- Key: "Use Bursting throughput on an Amazon EFS file system", with lifecycle management to the Infrequent Access class as the second
  key. Stem, distractors and answer slots as in Step 8. No post-guide tag.
- Evidence: two efs-performance quotes state that Bursting throughput is for throughput that scales with the amount of storage. The
  stem's "throughput needs grow with the amount of data stored" describes that property.
- Blind re-review: a fresh reviewer answered the keyless export (`docs/reviews/treasury/blind-storage-market.json`) with A and E, and
  `score-blind` agrees for 009.

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

- `content/contradictions.json`: `c-s3-ia-minimum-duration` renamed `c-s3-ia-transition-direction`, with the readings and verdict
  "resolved". The review added the What's New reading and its date (Review corrections, item 2).
- `content/needs-verification.json`: both related items point at the new id.
- `content/notes/treasury/cold-cellar.ts`: the billing minimum is stated plainly; the disagreements block cites the new id.
- **Puzzle evaluator:** `src/puzzles/cold-cellar/def.ts` refuses a move into Standard-IA or One Zone-IA before day 30 again, so no
  scenario is computed under either reading. The early-leaving charge rule is unchanged. The test "refuses a move into an
  infrequent-access class before day 30" is restored. Before and after: Review corrections, item 2.
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
| | `AWS::WAFv2::WebACL` | Scope CLOUDFRONT, default allow, no rules. Kept, because a pricing plan requires it (Review corrections, item 3) |
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
Identity as unsupported; the template uses OAC because AWS recommends it. The page's feature table includes OAC and AWS WAF for the plans. The page also says a pricing plan requires a web ACL on the distribution, so the template keeps its default-allow web ACL. DEPLOY.md, step 5, quotes the sentences.

**Runbook.** `DEPLOY.md` gives the setup order with placeholders only, the console and Cloudflare steps, the verification
commands, the rollback (rerun the deploy workflow from main with `sha` set to an earlier commit: the checks run on that commit,
then it is published), the 403-to-404 behaviour, and teardown.

## Part D: staying current

**Exit codes** (`scripts/lib/network.ts`): 0 unchanged; 1 a real change or a failure the content must answer; 2 a network-class
failure (no connection, timeout, rate limit, 5xx). 3 an unstable read: the source was still changing, or two renders disagree. It is a warning ("unstable read"), never a finding or an issue. `check:freshness`, `check:freeplan` and `check:content --live` use them. The
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

**Reviewed change in the cited pages.** The first dry run found one changed page, `aws-backup/latest/devguide/vault-lock.html`, which
gained a sentence about a third-party assessment for regulated environments. Every quote on every cited page was re-verified with
`check:links --fresh`. The affected notes and questions (archive-annex, compliance-registry, retention-records and two questions)
state lock modes, grace time and deletion, all still on the page, so nothing needed rewording. That page's hash was refreshed alone.

**Other pages changed in this review.** Two more hashes moved: `how-transit-gateways-work` (Review corrections, item 5) and
`eb-what-is`, the EventBridge overview, whose wording changed for four quotes (item 5). The new What's New page for the S3 change
(`s3-removes-30-day`, item 2) has its hash stored. `check:freshness` reports 808 pages unchanged after these refreshes.

**Paragraph history.** `check:freshness --update` stores, for each cited quote, the paragraph around it (the smallest text block on the
page that contains the quote) in `content/page-paragraphs.json`. The store is 1,042,372 bytes for 808 pages, about 1.0 MB, under the
2 MB limit. A changed page's report prints the old and new text of each changed cited paragraph, and says when a quote is no longer on
the page; the report stops at 50,000 characters. `check:bundle` checks that 40 sampled cited paragraphs are absent from `dist/`.
History starts with this update, so the Transit Gateway change cannot be compared paragraph by paragraph.

**The first manual run** (run 39853991305 on 5a735b6, which opened issue #1) reported two findings. The Transit Gateway page is reviewed
and refreshed (Review corrections, item 5). The Free Tier list varied between renders; the check now counts only offers that two renders
agree on (item 4).

**Dry run** (`npm run freshness:watch -- --dry-run`, before this review): the exam guide check was OK. The Free Tier check listed four
added offers (AWS Security Hub, AWS Application Migration Service, Amazon Personalize, AWS Elemental MediaTailor) and one removal (AWS
IoT TwinMaker) against the 2026-10-19 snapshot. The removal did not hold in the later runs of this review (item 4). No lab badge changed.

## Part E: README and screenshots

- `README.md`: what the app is, the counts from the checks (4 domains, 14 tasks, 189 bullets, 69 buildings, 97 roads, 1,013
  questions, 807 cited pages and 7,993 verified quotes), the content build process, an architecture diagram (Mermaid), the checks
  table, local commands, deployment and upkeep, the layout, and the attribution and disclaimer.
- Screenshots (`docs/screenshots/`): desktop map and notes at 1440 px, phone map and save protection at 390 px, captured from the
  production build by `npm run screenshots` with a seeded save in the browser only.
- Privacy scan: no 12-digit number and no `arn:aws` with account digits in any tracked file or commit message. The matches that
  remain are deliberate fixtures (hygiene tests that construct a fake account number, placeholder names such as `ACCT_MAIN` in an
  older audit, and localhost test ports in Playwright config). No session link and no private link.

## Review corrections

The owner reviewed this audit before the account steps and asked for six corrections. Each item gives the state before and after.

**1. storage-market-009 back to its Step 8 state.**

- Before: key "Use Elastic throughput on an Amazon EFS file system", tagged `post-guide` (`efs-elastic-throughput`); distractor
  "Use Max I/O performance mode on the file system"; evidence the Elastic quote.
- After: key "Use Bursting throughput on an Amazon EFS file system", the Step 8 key; Step 8 stem ("Its throughput needs grow with the
  amount of data stored"); Step 8 distractors (Provisioned throughput, the Standard class, the S3 API); no `postGuide` tag; slots
  `[2, 4]`. Evidence: the two efs-performance Bursting quotes, verified with `check:links`.
- Blind re-review: a fresh reviewer answered the keyless export of this Step 8 question with A and E. `score-blind storage-market`
  agrees for 009.

**2. S3 Infrequent Access change: registry entry, refusal and note.**

- Before: no registry entry; the Cold Cellar evaluator computed a move into Standard-IA or One Zone-IA before day 30; the Cold Cellar
  note had no "newer" label or block for the change; the contradiction `c-s3-ia-transition-direction` said the difference was
  direction only.
- After:
  - Registry: `s3-ia-day-zero` in `content/post-guide.json`, introduced 2026-07-16. The date quote is "Jul 16, 2026" from the
    What's New post (`pg-s3-ia-day-zero`). Its patterns match the change wording ("as soon as the day they are created", "without the
    previous 30-day minimum retention"), not billing text.
  - Evaluator: the refusal `if ((to === 'standard-ia' || to === 'onezone-ia') && p.from < 30) return null;` is restored, with its test.
    The early-leaving charge rule is unchanged. `check:content` rejects a scenario that hits a refusal, and none does.
  - Cold Cellar note: the disagreements block is labelled "newer". A new block, labelled "Newer than the exam guide", says the exam may
    expect objects to stay 30 days in S3 Standard before a lifecycle transition to Standard-IA or One Zone-IA, and cites the storage
    decision guide and the What's New post. The billing minimum (30 days, the pro-rated charge, the 128 KB minimum) is stated as before.
  - Other citers: the S3 decision-guide block in `content/dont-confuse.ts` carries `s3-ia-day-zero`.
  - Contradictions: `c-s3-ia-transition-direction` records the What's New reading and its date (before and after 16 July 2026); the
    verdict stays "resolved". `nv-s3-ia-minimum-duration` and `nv-s3-ia-min-time-in-standard` have updated resolutions.

**3. WAF web ACL: kept, with the sentences relied on.**

- Before: the web ACL's description said the Free pricing plan "includes" one. DEPLOY.md did not explain the web ACL or its teardown.
- After: kept. The description says a pricing plan requires the web ACL and covers its charges. DEPLOY.md, step 5, quotes the
  sentences below. Teardown switches the distribution to pay-as-you-go first. `scripts/lib/infra.test.ts` asserts that the
  distribution is attached to the web ACL, which is CLOUDFRONT scope with default allow.
- Sentences relied on, from the CloudFront flat-rate pricing plan page (cached copy):
  - "You must have a AWS WAF Web ACL associated with your distribution if you're using a pricing plan."
  - "Your plan covers costs for: … The AWS WAF web ACL, custom rules, AWS Managed Rules, and request fees for the web ACL associated with your distribution."
  - "This resource cannot be removed or disassociated from your distribution unless you switch to pay-as-you-go pricing for that distribution."
- Reading: these sentences say "a pricing plan" and do not name the Free plan on the web ACL line. The page covers the flat-rate plans,
  and the Free plan is one of them, so the requirement applies to it. The console has not been checked, so if it says the Free plan
  does not need a web ACL, the template drops it.

**4. Free Tier watch: two renders must agree.**

- Before: one read of the page, taken once the "Show N more" buttons were gone, counted every difference. The first dry run counted
  TwinMaker as removed; the later runs did not.
- After: `renderOffers` waits until the offer count is the same on two reads three seconds apart. `check:freeplan` renders twice and
  counts only changes that both renders report the same way (`confirmDiffs`). A change only one render shows is named as unstable and
  is not counted. Two renders that disagree exit 3, an unstable read, which is a warning. Unit tests cover agreement, disagreement and
  duplicate cards. CLAUDE.md records the render variance.
- Runs (`npm run check:freeplan`, each run makes two renders):
  - Runs 1 and 2, against the working snapshot of 2026-10-22 before the update: both exit 1 with the same confirmed change, "+ AWS
    re:Post" and "+ AWS IoT TwinMaker", both "Available on both plans". The runs match.
  - The snapshot update (`scripts/free-plan-snapshot.ts`, two renders): saved 186 offers dated 2026-10-22, with no unstable name.
  - Runs 3 and 4, after the update: both exit 0, "186 offers, no change since the snapshot of 2026-10-22". The runs match.
- Against the committed snapshot (2026-10-19, 185 entries): four offers were added (AWS Application Migration Service and AWS Security
  Hub, both plans; Amazon Personalize and AWS Elemental MediaTailor, paid plan exclusive). Three names that had two identical copies
  now have one each (AWS Budgets, AWS Global Accelerator, Amazon Application Recovery Controller), which matches the page's total of
  186. AWS IoT TwinMaker and AWS re:Post are in both snapshots, so the removal in the dry run did not hold.
- Lab badges: `npm run gen:meta` after the update changed no line of `src/labs/meta.ts`, so no lab badge changed. AWS Budgets is in
  labs 1 and 14, and its label did not change.
- Issue #1 is closed after the outcome comment, because the last two runs agree with the snapshot. The list changed between runs
  earlier in this review, so the weekly watch may report it again (deviation 20).

**5. Transit Gateway page and the grid-planning-office claims.**

- Read against the current page: the three `grid-planning-office` blocks that cite `tgw-how` (lines 55, 78 and 90 of
  `content/notes/express/grid-planning-office.ts`) rest on the sentence "A transit gateway scales elastically based on the volume of
  network traffic." Line 78 shortens it to "scales elastically based on traffic", which still holds. Each cited quote verifies verbatim
  on the current page (`check:links --fresh`). No note wording changed.
- Question `grid-planning-office-013`. Before: the key read "Modify the attachment to enable the third Availability Zone by specifying a
  subnet in it", and the page does not say "modify". After: the key reads "Enable the third Availability Zone for the attachment by
  specifying one subnet in it", with the added evidence "To enable each Availability Zone, you specify exactly one subnet." Deviation 22
  covers what the source pass could not settle.
- Hash: `how-transit-gateways-work` is refreshed (`5b408ed35ea870903b4a`). `eb-what-is` (EventBridge) was refreshed too. The request
  was for the Transit Gateway hash only; the EventBridge change broke four verbatim quotes in `content/notes/harbor/message-quay.ts`
  and `content/dont-confuse.ts`, and their claims now use the page's wording ("subscribers that you create", "rules and targets that you
  write"). That is beyond the request and is reported as deviation 23.
- The page's document history has a "1:1 NAT for transit gateways" entry dated 22 October 2026. That is the likely source of the change.
  It is not confirmed, because no earlier text was stored.
- Issue #1 received an outcome comment (below), and it is closed after item 4.

**6. Paragraph history for the weekly report.**

- Before: a changed page was reported by its hash alone.
- After: `content/page-paragraphs.json` holds the paragraphs for 808 pages (1,042,372 bytes). `check:freshness` prints the old and new
  text of each changed cited paragraph and says when a quote is gone. The report stops at 50,000 characters. `check:bundle` proves that
  40 sampled paragraphs are absent from `dist/`.
- Tested: `paragraphsFor` on fixtures (a quote in a list item; a quote split across two elements is reported as not found), the
  changed-paragraph report, the store round trip, and `--only`. A temporary run with a forced hash and an altered stored paragraph
  showed the report, and both data files were restored from backups afterwards.
- Limit: no earlier text is stored for the Transit Gateway page, so its change cannot be shown paragraph by paragraph.

## Owner checklist (AWS, Cloudflare and GitHub: not done by me)

Follow `DEPLOY.md`. In order:

1. **AWS, portfolio account, Paid plan (never the lab account).** Sign in, set the console to us-east-1. IAM, Identity providers:
   is there already a provider for `token.actions.githubusercontent.com`? If yes, note its ARN and use `CreateGitHubOidcProvider=false`.
2. Deploy the certificate stack (`saa-cert`). It waits for validation, so leave the terminal open.
3. **Cloudflare, zone edwardtorres.dev.** Copy the CNAME name and value that ACM shows for the certificate, and add them as a
   record with **DNS only** (grey cloud).
4. When `saa-cert` completes, read `CertificateArn` from its outputs and deploy `saa-site` with `BudgetEmail`, `BudgetLimitUsd` and
   `CertificateArn` (and the OIDC parameters from step 1).
5. **CloudFront console.** Open the new distribution, Update, Pricing plan, Free. The web ACL stays attached: the pricing plan requires it
   and covers its charges (DEPLOY.md, step 5). Confirm the console shows $0 with no overage. If the console says the Free plan does not
   need a web ACL, tell me and the template drops it.
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
20. **The Free Tier offer list varies between runs.** Within a run the two renders agree, and the watch counts only what they agree on.
    Across runs it has changed: the first dry run removed TwinMaker, a later run removed TwinMaker and Neptune, another removed
    TwinMaker and re:Post, and before the update in this review the snapshot differed from two renders that agreed with each
    other. I did not find the cause without browser diagnostics. The last two runs agree with the snapshot, so issue #1 is closed.
    Decision for the owner: stabilise the extraction (for example, a fixed set of expected cards), agree a multi-day rule, or review
    each change before the snapshot moves.
21. **The Transit Gateway page changed.** Its hash is refreshed. The change is not identified: the page's "1:1 NAT for transit gateways"
    entry (22 October 2026) is the likely source, not confirmed. Every claim that cites the page holds against its current text
    (Review corrections, item 5). Paragraph history starts with this update, so this change cannot be diffed (item 6).
22. **Question grid-planning-office-013 is supported by inference.** The page says "To enable each Availability Zone, you specify exactly
    one subnet." A source pass judged the key supported by that sentence, but not stated directly. The stem does not mention route
    tables, and a reviewer may ask whether the subnet's route table also matters for the zone to reach the transit gateway. The owner
    decides whether the stem should name it.
23. **The EventBridge overview changed.** Four quotes no longer matched and their claims were reworded to the page's wording (Review
    corrections, item 5). This was beyond the request, so it is listed here.
24. **One background freshness run printed 807 pages, not 808.** A direct rerun printed 808 pages and exit 0. The hash file and the
    paragraph store both list 808 URLs. I did not find the cause. The weekly watch will show whether it recurs.

## Test results

Every command was run on the tree at the commit before this audit, unless noted.

| Command | Result |
| --- | --- |
| `npm run check` (typecheck, lint, unit tests, content, cfn-lint, build, bundle, hygiene) | Exit 0. Unit tests 580 of 580 in 42 files; check:content OK (4 domains, 14 tasks, 189 bullets, 69 buildings, 97 roads, 1,013 questions); check:cfn 7 templates; check:bundle 94 files, 40 cited paragraphs absent; check:hygiene 749 files, 205 commits |
| `npm run check:content -- --live` | Exit 0; live guide matches; content checks pass against the Free Tier snapshot after the update |
| `npm run check:links -- --fresh` | Exit 0; 808 sources, 808 pages, 7,995 quotes verified, 27 redirect notes |
| `npm run check:freshness` | Exit 0; 808 pages unchanged (one background run printed 807, deviation 24) |
| `npm run check:freeplan`, two runs before the snapshot update | Both exit 1 with the same confirmed change (+ AWS re:Post, + AWS IoT TwinMaker) |
| `npm run check:freeplan`, two runs after the update | Both exit 0; 186 offers, no change since 2026-10-22 |
| `npm run gen:meta` after the update | `src/labs/meta.ts` unchanged; no lab badge changed |
| `npm run test:layout` | Exit 0; 74 checks at 390 px (touch) and 1280 px (keyboard) |
| `npm run e2e` (production build, both widths, axe) | 78 passed, 0 failed |
| `npx tsx scripts/score-blind.ts storage-market` | 009 agrees. The other 11 storage-market questions have no entry in the blind file, as before this review, so the command exits 1 |
| First manual run of content-freshness (GitHub, 5a735b6) | Completed, success; opened issue #1 with two findings (Part D) |
| Deploy workflow on push (GitHub, 5a735b6) | Completed, success; the deploy job is skipped until `AWS_DEPLOY_ROLE_ARN` is set |
| actionlint (workflows) | Last run clean; the workflows did not change in this review, so it was not re-run |
| Privacy scan (12-digit numbers, `arn:aws`, session and private links) | Covered by `npm run check:hygiene`; only deliberate fixtures (Part E) |

Every command above was run on the working tree for this review, before the commit, unless noted.

## Push confirmation

This audit is committed with the rest of Step 9 and pushed to `origin/main`, then fast-forwarded on `claude/serene-carson-6ot1u0`.
The check that `git rev-parse HEAD` equals `origin/main` after the push is reported in the final message of this step.
