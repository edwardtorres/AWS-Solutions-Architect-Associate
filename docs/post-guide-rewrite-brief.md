# Post-guide rewrite brief (Step 4 Part A)

Read CLAUDE.md ("Exam-era rule", "Question bank (Step 3)") and docs/question-writing-guide.md first. Then read content/post-guide.json (the registry: features newer than the exam guide, cutoff 2022-08-01, with `patterns` and `predecessorPatterns`).

## The rule (enforced by `npx tsx scripts/check-content.ts`)
1. A question whose text (stem, any option, any explanation) matches a registry feature must declare it in `postGuide: ['feature-id']` (this also adds the `post-guide` tag automatically).
2. If the key rests on the feature, `postGuideKey: ['feature-id']` is also set, and then NO option may match that feature's `predecessorPatterns` (the established exam-era design). In other words: a post-guide feature may never be the key when the exam-era design is a wrong option. Example: DataSync Enhanced mode must not beat "Basic mode task with an on-premises agent"; regional NAT must not beat "one NAT gateway per Availability Zone".
3. A question tagged `mock-reserve` must not be post-guide at all (no `postGuide` field, no registry pattern anywhere in its text).

## What to do for each question listed to you
Open the question, read the check messages (`npx tsx scripts/check-content.ts 2>&1 | grep <question-id>`), and rewrite IN PLACE, keeping the same `id`, `building`, `bullets`, `d` (difficulty), `tags` (including `mock-reserve`, `placement-eligible`, `trap:*`), format (mc or mr, same `select`) and about the same slot balance (you may change `slot`/`slots`; keep the sum of positions balanced in spirit). Choose per question:
- **Exam-era rewrite (preferred):** change the question so the KEY is the exam-era design (for example one NAT gateway per Availability Zone; DataSync Basic mode with an on-premises agent; EFS Bursting or Provisioned throughput; Cluster Autoscaler or Karpenter; reserved instances / Savings Plans; SSE-KMS; ElastiCache for Redis OSS or Memcached; AWS DMS with a replication instance and the AWS Schema Conversion Tool; a hardware or virtual TOTP MFA device; and so on) and remove the post-guide feature from the question completely (delete `postGuide` / `postGuideKey`). It must still test the same outline bullet(s) and be a good, unambiguous SAA-C03 question with 4 (mc) or 5+ (mr) options, a reason for every option, and verbatim AWS `evidence` quotes.
- **Compare only against options that are wrong for other documented reasons:** you may keep the newer feature in the question only if the predecessor design is NOT among the options and the newer feature is a wrong option for another documented reason, or the key is a timeless design. Then keep `postGuide`, drop `postGuideKey`.
- If the question only mentioned the feature in an explanation or evidence and the key does not rest on it, you may simply reword that explanation (and evidence) to remove or neutralise the mention; keep `postGuide` only if a registry pattern still matches.
- For `mock-reserve` questions the result must contain NO registry pattern at all.
Keep difficulty and style rules from the writing guide (no availability wording in a stem/option; no prices; in-scope service names only; correct option not the longest too often). Evidence quotes must be verbatim from the AWS pages: test with `npx tsx scripts/q.ts <url> "<regex>"` / `npx tsx scripts/ctx.ts`. Add sources with `npx tsx scripts/add-source.ts <id> <url> "<title>"` only if needed (AWS pages only).

## Checks to run before handing back
1. `npx tsc -p tsconfig.node.json --noEmit`
2. `npx tsx scripts/check-building.ts <building>` for each building you touched (must print OK)
3. `npx tsx scripts/check-content.ts 2>&1 | grep -E "<your ids>"` must show no line for your questions
4. `npm run -s check:links` at the end (verifies evidence quotes on the live pages)
5. `npx tsx scripts/gen-question-meta.ts` is NOT needed (ids, bullets, difficulty must not change).
Do not touch other buildings' files, the notes, the registry, or the checks. Do not commit. Other agents edit other files in parallel; edit only your files.

## Report back
For each question: id, what the old key was, what the new key is (or what you changed), which option (if any) matches a predecessor, and the final `postGuide` state. Also list anything you could not fix. Do not paste whole questions.
