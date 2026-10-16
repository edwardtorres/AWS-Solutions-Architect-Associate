# Puzzle writing guide (Step 5)

For puzzle-type authors. Read CLAUDE.md first (allowed sources, banned terms, in-scope services, exam-era and post-guide rules) and `src/puzzles/types.ts` (the contract). Puzzles are practice for SAA-C03: original, rule-based, never exam-dump material.

## What you deliver for your type `<type>`
1. `src/puzzles/<type>/def.ts` exporting `def: PuzzleDef<S>` (your scenario data type `S` is exported too). It holds `rules` (each `{id, text, src, quote}`: a plain-words rule, an id from `content/sources.ts` and a **verbatim** sentence from that AWS page), `fields(s)` (what the player answers: single or multi choice, option ids), `exhibit(s)` (what the player reads: text, code or table sections) and `evaluate(s)`.
2. `evaluate` computes the answer from the scenario with the rules and returns `{answer, trace}` where `trace` lists, in order, the rule ids that decided it and a one-line note each. It returns **`null` (a refusal)** whenever the rules you encoded do not settle the case: unknown condition keys, unsupported features, ties the docs do not break, targets that fall between documented classes, and so on. Never guess. Answers are never written by hand in scenario data.
3. `src/puzzles/<type>/index.ts`: `export { def } from './def'; export { default as scenarios } from '../../../content/puzzles/<type>';`
4. `content/puzzles/<type>.ts`: default export `Scenario<S>[]` (header `id` `<type>-NNN`, `type`, `building`, `bullets`, `difficulty` 1 to 3, `title`, `story`, `data`). Every scenario must be non-refused. Mix difficulties (about 20/55/25). Spread answers so the options are not predictable. Scenarios must be varied (different rules decide them; include scenarios where the obvious guess is wrong).
5. `src/puzzles/<type>/def.test.ts` (Vitest, unit project: `src/**/*.test.ts`): every rule exercised, every refusal path, determinism, and **cases taken directly from AWS documentation examples** (cite the page in a comment).
6. Sources: add any AWS page you need with `npx tsx scripts/add-source.ts <id> <url> "<title>"`. Check quotes with `npx tsx scripts/q.ts <url> "<regex>"` and `npx tsx scripts/ctx.ts <url> "<regex>" <chars>`. Do not use prices, discount figures or numbers you cannot quote. A rule is only encoded if a page states it.

## Hard rules
- Allowed sources: docs.aws.amazon.com and aws.amazon.com only.
- In-scope service names only in any text (the check scans story, exhibit, field prompts, options, rule text and trace notes). No out-of-scope services (CloudShell, CDK, App Runner, Service Quotas, ...). No `scripts/banned-terms.ts` terms, no open `content/needs-verification.json` topics.
- **Post-guide rule:** no text or rule may match a feature in `content/post-guide.json` (checked by pattern). No puzzle may mark an established exam-era design wrong in favour of a newer feature. Anything introduced on or after 2022-08-01 stays out of the puzzle (do not mention it either). If a documented rule is only available through a post-guide page, leave it out.
- No availability wording ("closed to new customers", "deprecated") in puzzle text.
- Each scenario belongs to ONE building and its bullets (the check enforces that bullets belong to the building and that the building is in one domain). Building ids and bullets are in `src/data/buildings.ts` (the lead names suggested buildings below). A puzzle should genuinely practise the bullet it lists.
- Text for the player is plain and short; tables for structured exhibits; no HTML.

## Checks to run before you hand back
1. `npx tsc -p tsconfig.node.json --noEmit` and `npx tsc -p tsconfig.app.json --noEmit`
2. `npx vitest run src/puzzles/<type>`
3. `npx tsx scripts/check-puzzles.ts <type>` (must print OK: schema, sources, minimum count, no refusals, determinism, banned and out-of-scope text, post-guide scan)
4. `npm run -s check:links` (verifies every rule quote on the live pages; slow, run once at the end)
5. `npx eslint src/puzzles content/puzzles`
Do not edit other types' files, the contract, the checks, notes or questions. Do not commit. Report: rules (with sources), refusal paths, scenario counts per building, anything you were unsure of.
