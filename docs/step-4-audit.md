# Step 4 audit: post-guide fix and the core game loop

Status: built, awaiting your approval. Step 5 is not started.

## Part A: post-guide fix
Details and per-question table: `docs/reviews/post-guide.md`. Candidate list: `docs/post-guide-candidates.md`.

- **Cutoff:** 2022-08-01 (your choice). Registry `content/post-guide.json`: **51 post-guide features**, each with a date, a source page and a verbatim date quote (verified by `check:links`: 665 pages, 7,062 quotes). Seven candidates turned out older than the cutoff and are recorded under `preGuide` (S3 Batch Replication for existing objects 2022-02, Organizations backup policies 2020-07, Glue sensitive data detection 2022-04, RDS Multi-AZ DB cluster 2022-03, Cloud WAN 2022-07, plus two unconfirmed: AWS Backup hourly frequency and ECS scaling minimum capacity 0, treated as older). Dates come from What's New posts (month from the URL path, day where the page gives it) or documentation history. Corrections to my first guesses: ALB target group health requirements 2022-11 (not 2023-11), Athena result reuse 2022-11 (not 2022-08), OAC 2022-08-25, DMS Schema Conversion 2022-11.
- **Rule, recorded in CLAUDE.md and enforced by `check:content`** (tested with synthetic banks in `scripts/questionChecks.test.ts`): a question matching a registry feature must declare it (`postGuide`, which adds the `post-guide` tag); a question whose key rests on the feature (`postGuideKey`) fails if an option shows the exam-era design; `post-guide` and `mock-reserve` never go together; note blocks must carry `newer`.
- **Found:** 96 questions matched a registry pattern; 49 broke the rule (38 key violations and 17 post-guide reserve questions; 6 were both). All 49 were rewritten (same ids, bullets, difficulty and tags): the key is now the exam-era design, or the newer feature no longer appears. Examples: transfer-dock-004 is now Basic mode with an on-premises agent; gatehouse-025 is one NAT gateway per Availability Zone; db-cost-desk-005 is reserved DB instances; freight-depot-017 is Provisioned throughput.
- **Mock:** `mock` draws exclude `post-guide` (unit test). The reserve is still 130 questions, 39 / 34 / 31 / 26 by domain; none is post-guide.
- **Notes:** 85 blocks carry a "Newer than the exam guide" label (`src/ui/notes/Inline.tsx`).
- **Reviews:** blind pass on all 49 (48 agree, one ambiguity reworded; second blind pass on the 17 changed after the source pass: 17 of 17 agree). Source pass: 33 OK, 15 FIX, 1 REPLACE, all fixed. The blind reviewers did not browse; the source reviewer checked the pages. Files: `docs/reviews/post-guide/{blind,blind-2,source}`.
- **Bank after the fix:** 1,011 questions (881 live, 130 reserve), domain shares 29.6 / 25.4 / 23.6 / 21.4 (within 2 points), 51 questions tagged `post-guide`, 960 eligible for mocks.

## Part B: the game loop as built
**Lifecycle** (`src/game/lifecycle.ts`, `engine.ts`, `start.ts`)
- planned → surveyed: derived; every prerequisite is stored `commissioned` (by inspection or placement); Foundations start surveyed.
- surveyed → under construction: opened the building's notes (recorded when the notes page opens) and passed a 2-question start-up check, both right. Retry gives new questions (avoids the previous attempt). No daily limit.
- under construction → commissioned: 5-question inspection, 4 or more right.
- Draws (`src/game/draw.ts`): live questions of that building only, never `mock-reserve`; bullets covered first where possible; at least one question at difficulty 2 or 3 in inspections; the previous attempt's questions avoided (a building with fewer than 10 live questions cannot always avoid them); less-seen questions preferred.
- **Inspection lock:** the second failed inspection of one building in one local day locks it until the next local day, with a message. An unfinished inspection is saved and resumed; leaving it deliberately ("Leave this attempt", after a warning) counts as a failure.
- **Placement** (19 portfolio buildings): offered while planned, surveyed or under construction; 5 `placement-eligible` live questions, all 5 right; one attempt per building per local day, recorded when the attempt starts (a reload resumes it; leaving does not give a retry). Passing commissions with `via: placement`, shows a "Placed" chip and unlocks dependents.
- **Scoring:** full credit only; a multiple-response question is correct only if exactly the keyed set is chosen. The key is shown only after the last answer.
- **Local day:** calendar date in the browser's zone (`Intl.DateTimeFormat`), calendar-component arithmetic. Tests cover America/New_York around 1 Nov 2026 (01:30 occurs twice, the 25-hour day, midnight edges) for lock, placement day and streak.

**XP** 10 / 20 / 40 for a correct answer by difficulty 1 / 2 / 3; a later correct answer to the same question earns a quarter (3 / 5 / 10); wrong answers 0; +50 once per building on commissioning. Start-up, inspection and placement answers all earn XP.

**Ranks** Surveyor 0 · Apprentice 150 · Foreman 500 · Mason 1,200 · Builder 2,500 · Architect 4,500 · Master Builder 7,000 · City Planner 10,000 · Chief Architect 13,000.

**Streak** a local day counts once 10 questions (any attempt type) are answered; the streak is consecutive counted days ending today or yesterday; best streak is kept.

**Badges (10)** Citadel, Harbor, Express Quarter and Treasury fully commissioned; all Foundations; all 19 portfolio buildings placed or commissioned; a flawless (5/5) inspection; 7-day streak; 30-day streak; whole city. Evaluated after every attempt, stored with their date.

**Readiness** (Progress page and `src/game/readiness.ts`): per domain = accuracy × coverage. Accuracy = correct share of the last **30** counted answers in the domain; coverage = share of the domain's outline bullets with a correct counted answer within the last **100** counted answers; a domain shows "—" below **10** counted answers. Counted: inspection and placement (review, puzzle, lab and mock are reserved for later steps); **start-up checks never count**. Overall = domains weighted 30 / 26 / 24 / 20, and "—" until all four domains have a value (strict; I did not re-normalise over the domains that have data). Foundations belong to no domain.

**Renderer and results** `src/ui/play/`: radios for multiple choice, checkboxes for multiple response with the stated count (Submit enabled only at exactly that count), 44 px rows, tap and keyboard. Options are shuffled per attempt and stay put within it (`attemptRandom`, dev `?seed=` mixed in only under `import.meta.env.DEV`). Results show my answer beside the key, an explanation for every option, the AWS sources, a link to the related don't-confuse pair (from the `trap:` tag), and **Flag this question** with a short note. Flags are saved locally, listed in Settings, removable, and exported as a text file (question id, my note, my answer, the key) with an on-screen copy.

**Save v2** (`src/save/`): `game` block (notes opened, attempt in progress, per-building start-up/inspection/placement records, XP, seen counts, answered-per-day, best streak, badges, commissioning bonuses, flags, answer log of `[questionId, correct, timestamp, kind]` capped at 4,000). `MIGRATIONS[1]` adds an empty block; `sanitize` validates every field and drops malformed data. v1 exports import through the migration; export/import unchanged; a future-version save is still read-only. `?seed=` stays dev-only (`check:bundle` proves it).

**Other new pieces** `src/questions/meta.ts` is generated (`npm run gen:meta`, id/building/bullets/difficulty only, no keys or tags) so the Progress page never loads the question data; `check:content` fails if it is stale. The attempt-start code (which names the reserve tag) loads with the question bank, so the entry chunk stays free of question data (`check:bundle` OK). Header shows the rank and XP and links to Progress. One `useBuildingStates` hook; the panel shows a "Build this" section (notes first, start-up, inspection, lock message, resume, placement).

## Results (this run)
| Check | Result |
| --- | --- |
| `npm run typecheck`, `npm run lint` | clean |
| `npm test` | 193 tests pass (new: game rules 39 incl. DST, save v2 and migration 5, real-bank draws over all 69 buildings 3, QuestionCard/ResultCard 6, routes, `attemptRandom`) |
| `npm run check:content -- --live` | OK (live exam guide matches) |
| `npm run check:links` | OK: 665 pages, 7,062 quotes |
| `npm run build`, `check:bundle` | OK (dev hooks absent, strict CSP, no external origins, split chunks) |
| `npm run check:hygiene` | OK (commit messages carry no session links or model names) |
| `npm run test:layout` | OK: 74 checks at 390 px and 1280 px |
| `npm run e2e` | **10 of 10 pass**: 5 specs at 1440 px (desktop) and 390 px (phone, touch, `tap()` only): full building flow (notes → start-up → inspection → commissioned → dependent surveyed → progress), failed-twice inspection lock, placement pass, failed placement uses the day, flag a question and export flags |
| axe (serious/critical fail) | clean at both widths on: map with panel open, attempt intro, question, result, progress, locked panel, result with flag, Settings with flags. No sideways scroll asserted on the question, result and progress screens |

## Unsure, deviations, things to decide
1. **Overall readiness is strict** ("—" until all four domains qualify). Say if you prefer re-normalising over available domains.
2. **18 questions keep a post-guide feature as the key** (no exam-era option present, which the rule allows); see `docs/reviews/post-guide.md`. Say if you want them rewritten.
3. **Leaving an inspection counts as a failure** and a start-up check is free to leave; these are my reading of "same-day retry lock".
4. Start-up answers earn XP and count towards the streak (not readiness).
5. Date precision: What's New pages show the month in the URL; most dates are therefore to the month. `aurora-global-switchover` is approximate; two candidates are unconfirmed and treated as pre-guide.
6. The blind reviewers answered from knowledge without browsing; the source reviewer verified against pages. Some rewrites changed topic (same building and bullet) rather than wording.
7. The e2e specs read the key from the bank on the Node side (matching stems) so the app has no test hook.
8. `check:all` now ends with `e2e`; run `npm run build` first.
