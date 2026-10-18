# Step 7 audit: Step 6 fixes, spaced review, Weak Spots, mock exam

Everything below is built, tested and pushed. Step 8 has not been started.

## Part A: Step 6 fixes

1. **Lab 3 gate.** A warning sits at the top of the lab (running it ends the Free plan's no-charge guarantee, because joining AWS Organizations upgrades the account to Paid). The steps stay hidden until an acknowledgement checkbox is ticked (stored in the save, `labs.progress[id].ack`). A read-only walkthrough is offered beside it (same steps and sources, no ticking, no completion). Lab 3 is scheduled last on the Labs page and in the schedule suggestion (`last: true`; id and number unchanged). The warning cites the Billing-guide plan sentence. e2e covers the gate.
2. **Free plan snapshot.** `scripts/free-plan-snapshot.ts` renders `aws.amazon.com/free/` with Playwright, clicks "Show more" until exhausted and saves `content/labs/free-plan-snapshot.json` with the capture date: **185 offers**, each "Available on both plans" or "Paid plan exclusive". Each lab's services map to snapshot offers through an alias table, and the badge is derived. `npm run check:freeplan` re-renders and reports additions, removals and label changes (exit 1 on any change; network).
   - Badges now: **Free plan compatible** Labs 4, 5, 6, 8, 10, 11 · **Paid plan only** Labs 3 (Organizations rule) and 12 (Athena is "Paid plan exclusive") · **not confirmed** Labs 1, 2, 7, 9, 13, 14.
   - Unmatched services (kept "not confirmed", listed on the Labs and lab pages): AWS IAM, AWS IAM Identity Center, AWS Trusted Advisor, Amazon EC2 Auto Scaling.
3. **Post-guide in labs.** Every lab step, alt, checkpoint and trap is scanned against `content/post-guide.json`; a match must declare `newer` (checked) and shows "Newer than the exam guide". Labelled: Lab 6 (whole lab; steps bucket, distribution, oac-check, bucket-policy, c-oac, c-bucket) and Lab 1 step s2 (passkeys). Lab 6 has a callout: the exam may present origin access identity (OAI) as the answer while AWS recommends origin access control (OAC), with a cited sentence. **Question audit** (`scripts/audit-oai.ts`): 7 options mention OAI/OAC, **0** mark OAI wrong in favour of OAC, **no question changes**.
4. **Re-review.** One fresh reviewer (not a writer or fixer) checked only the steps changed for the 7 high and 47 medium findings: **0 high, 9 medium, 36 low**. All 7 highs judged fixed. The 9 mediums are fixed and logged (`docs/reviews/labs/rereview.md`, `rereview-resolution-*.md`). Still open (no second re-review): Lab 6 may show a flat-rate pricing plan in the wizard that was not checked in the live console; Lab 6's DNS/hosted-zone removal advice has no AWS quote; Lab 3's closed-account step rests on "no page says".
5. **Lab 3 "one-way" claim.** Replaced by the Free Tier FAQ sentence "No, you cannot downgrade your Paid plan to the Free plan." (source added, quote verified by `check:links`); CLAUDE.md carries the same citation.

## Part B: spaced review, maintenance, Weak Spots

- **Save v5** (`MIGRATIONS[4]`, tested on a real v4 save, `src/save/__fixtures__/save-v4-real.json`): `byBullet` (last 10 counted results per bullet), `maint` (last 8 review/mock results per building), `traps` (answers and misses per don't-confuse pair), `reviewDay`, `review` session, `mock`, lab `ack`. `byBullet` is back-filled from `recent`.
- **Intervals:** `1, 2, 4, 7, 14, 30` days by current correct streak (30 repeats); a miss is due the next local day. Due day = local day of the last answer + interval (time-zone aware). Scheduled from `game.history`, never the capped log. Puzzles and `mock-reserve` questions are never reviewed.
- **Cap:** 25 answers per local day; when fewer are due the session is topped up from the weakest bullets (accuracy ascending, bullets with under 3 answers last), least-seen first, skipping anything answered today.
- **Review answers** count in readiness, earn XP (repeat rule), feed `byBullet`, `traps` and `maint`, and never commission.
- **Maintenance:** a commissioned building with at least 5 review/mock results in its last 8 and **below 60%** shows "Needs maintenance" (map card and panel) with a 5-question set, recent misses first. Derived, so it clears when accuracy recovers; commissioning is never removed.
- **Weak Spots (`#/weak`):** bullets ranked by recent accuracy with answer counts ("not enough data" under 3; weak is below 70%), most-missed don't-confuse pairs, weak families (at least 10 answers; also a chip on the Service Atlas), flagged questions, and per weak bullet links to notes, a puzzle and a lab.

## Part C: mock exam

- **Format:** 65 questions, 130 minutes, MC and MR, weights by largest remainder (19 / 17 / 16 / 13), all 65 scored; the page states the real exam has 15 unidentified unscored questions.
- **Draw (`src/game/mockDraw.ts`, lazy chunk):** never post-guide; reserve questions never answered before come first, then live; avoids the last mock's questions, prefers questions not answered in the previous 14 days, and spreads across bullets round-robin.
- **Real reserve usage** (130 reserve questions; 39 / 34 / 31 / 26 by domain; none post-guide): mock 1 = 65 of 65 from the reserve; mock 2 = 64 of 65 (domain 3 has 31 reserve questions for 32 slots, so one live question fills in); mock 3 = 1 reserve question and 64 live. Weights stay exact. Verified against the real bank in `scripts/lib/mockReal.test.ts`.
- **Experience:** timer computed from the saved start (survives reload), auto-submit at zero including when it ran out while the app was closed (`MockGuard` grades it on any page), flags, a review screen with jump links, no feedback until the end, unanswered counts wrong.
- **Results:** raw % overall and by domain, per-bullet weakest first, every question with key, explanations and sources, trap pairs fallen for, history of all mocks (latest 30), plus a note that 720 is a scaled score and scoring is compensatory.
- **Freshness:** a mock counts towards "ready to book" only if at least 50% of its questions were not answered in the 14 days before it started; the numbers and the reason are stored and shown.
- **Ready to book:** the two most recent counting mocks each at least 80% overall with every domain at least 70%. The panel links to the certification page, which names the Official Practice Question Set and Official Practice Exam (the direct Skill Builder URLs are outside the allowed hosts).
- **Dev-only short mock:** `?mock=short` (10 questions) behind `import.meta.env.DEV`; marker `SAA_DEV_MOCK_SHORT` is proven absent from `dist/` by `check:bundle`. Short mocks never count towards ready to book.
- Mock answers count in readiness, earn XP, and never commission.

## Checks (final state)

| Check | Result |
| --- | --- |
| `typecheck`, `lint` | pass |
| `npm test` | 32 files, 488 tests pass |
| `check:content` | OK: 4 domains, 14 tasks, 189 bullets, 69 buildings, 97 roads, 1011 questions |
| `check:links` | OK: 793 sources, 7562 quotes verified |
| `check:cfn` | OK: 5 templates |
| `build` + `check:bundle` | OK: dev hooks absent, no external origins, strict CSP, entry chunk has no reserve tag |
| `check:hygiene` | OK |
| `test:layout` | OK: 74 checks at 390 px and 1280 px |
| `npm run e2e` (with axe, serious/critical fail) | **58 passed**: desktop 1440 px and phone 390 px (tap only), Daily Review session, leaving a review, maintenance set, Weak Spots, Lab 3 gate; mock-desktop and mock-phone: format page, 65-question start and discard, full short mock with a reload mid-mock and the results page, expired-while-closed, expired-while-open |

## Unsure, and deviations

- The mock e2e runs against the Vite dev server (second Playwright web server), because the short mock exists only in dev builds; the other specs run against the production preview.
- Mock 2 uses one live question in domain 3 because the reserve is one short; the draw records reserve use per mock.
- Free plan labels come from a rendered page that AWS can change; `check:freeplan` is the guard, and four services stay unmatched.
- The Official Practice links go through the certification page, not Skill Builder.
- Open items listed under Part A.4 remain open.
- The stop hook will report these commits as "Unverified"; that is expected.

Step 8 is not started; it waits for your approval.
