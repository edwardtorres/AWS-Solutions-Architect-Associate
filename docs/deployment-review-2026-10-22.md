# Region Builder deployment review — 22 October 2026

## Scope

A focused code and production-build review before publishing Region Builder at
`https://edwardtorres.dev/apps/region-builder/`, with a matching Work card and
project analysis in the existing portfolio. This is not a fresh source-by-source
audit of every AWS teaching claim.

## Findings and changes

- **Subpath deployment would break.** The manifest, icons, error-page links and
  offline fallback assumed a dedicated origin. Added an explicit build base,
  scoped manifest identity and service worker, and a repeatable portfolio copy
  command. The portfolio overrides its script-blocking CSP only for this app.
- **Maintenance ordering could violate its priority.** A weighted numeric key
  allowed large seen counts to outweigh categories. Compare category and priority
  separately. Shuffle before stable sorting so comparator results stay consistent;
  apply the same correction to daily-review tie handling. A regression test covers
  high seen counts and the fixed number of shuffle draws.
- **Subpath bundle validation skipped the entry chunk.** Match the generated
  script URL to its build-relative file, fail when missing, and verify that
  question data remains lazy in a subpath build.
- **macOS screenshot/Lighthouse startup mismatch.** Both runners requested an IPv4
  address while the server bound to localhost. Use the server's localhost address.
- **Updates and caching.** Retain prior content-hashed assets in the portfolio so
  already-open tabs can load lazy modules. Revalidate entry files, the manifest
  and worker; cache hashed assets immutably. Prefix the Workbox cache for this app.
- **Install metadata.** Added the apple touch icon link using the build base.

## Validation

- TypeScript and ESLint pass.
- 582 unit/component tests pass across 42 files.
- Content validation passes: 4 domains, 14 tasks, 189 outline bullets, 69 buildings,
  97 roads and 1,013 questions.
- All 78 browser tests pass using installed Chrome on macOS, across desktop and
  phone projects, including quiz, puzzle, lab, review, mock, saves, CSP and offline flows.
- 74 layout checks pass at 390 px (touch) and 1280 px (keyboard/mouse).
- Seven CloudFormation templates pass cfn-lint (the standalone AWS option and labs).
- Root and scoped production builds pass the bundle check.
- The scoped build passes `test:site` at 1440 px and 390 px: assets, icons, manifest,
  worker scope, Cloudflare-style index redirects, offline map/notes/mock, static
  404 links, and worker isolation from the portfolio home page.
- Source hygiene passes over files and existing commit history in the Git checkout.
- The new portfolio card and project page have valid local links and images and
  no horizontal overflow at 1440 px and 390 px. Real production screenshots use a
  clearly identified demonstration save.

## Remaining tradeoffs

The app precaches approximately 4 MB of uncompressed study assets for complete
offline use. Code splitting keeps questions out of the initial entry chunk, but
installation still downloads the full content. Progress remains browser-local;
export/import provides device transfer and backup. Learning outcomes have not
been measured. Content freshness still requires ongoing review. The separate AWS
hosting stack is optional and is not used for the public portfolio deployment.
