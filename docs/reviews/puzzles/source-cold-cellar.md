# Source review: cold-cellar

Pages: `s3-storage-classes` (storage-class-intro), `s3-glacier-classes`, `s3-lifecycle-transitions`. All 27 rule quotes were checked against the cached live text: every quote is present verbatim. Post-guide: only `small-no-move` matches `s3-lifecycle-default-min-size` (declared `newer`). No scenario answer depends on it: every multi-stage scenario uses objects of 512 KB or more, and the two objects under 128 KB (011: 40 KB, 012: 100 KB) have one stage, so no Lifecycle rule is involved; `classFor` refuses small objects with more than one stage. Their answer (S3 Standard) rests on the older, pre-guide minimum-billable-size / "suitable for objects larger than 128 KB" statement. Evaluator: waterfall, minimum-duration arithmetic (earliest = day entered + minimum, then max with the stage start) and refusals behave as the rules say; hand-checked 001, 006, 007, 014, 015, 017 (for example 015: Standard-IA day 30, Glacier Instant Retrieval day 75, Glacier Deep Archive day 165).

## Rules

| item | verdict | issue | suggested fix |
| --- | --- | --- | --- |
| cls-standard | OK | Quote on page. | none |
| cls-standard-ia | FIX | Text adds "per-GB retrieval fees apply to it", which the quote does not say. | Delete that clause or add a quote from the page that states it. |
| cls-onezone-recreatable, cls-onezone-cheaper, cls-onezone-loss | OK | Quotes on page; text matches. | none |
| cls-intelligent-tiering | OK | Quote on page. Stories 005 and 013 also say Intelligent-Tiering avoids "retrieval fees", which no quoted sentence supports. | Remove the retrieval-fee wording from the stories or add a quote. |
| cls-glacier-ir, cls-glacier-ir-rare | OK | Both quotes on page. | none |
| cls-glacier-fr | OK | Quote is "portions of the data might need to be retrieved in minutes". Note the Glacier page's table lists Flexible Retrieval as accessed "Semi-annually" and Deep Archive "Annually", so a frequency of "a few times a year" is not a documented class (see 008). | none for the rule |
| cls-glacier-da | OK | Quote on page ("accessed less than once a year with retrieval times of hours"). It is what settles the blind reviewer's Deep Archive vs Flexible Retrieval doubt in 001 and 006: with "less than once a year" and "hours fine" the documented class is Deep Archive. | none |
| restore-first | OK | Quote on page. | none |
| min-duration-ia | OK | Quote on page (delete case); the page also covers transitions. | none |
| min-duration-glacier | OK | Quote is a flattened table row; verbatim today but brittle. Text matches (90/90/180). | Optional: use the Lifecycle page sentences ("The minimal storage duration period is 90 days ... and 180 days") as a second quote. |
| single-rule-min-duration, single-rule-example | OK | Quotes on page. The page example is for Glacier Instant Retrieval; applying the same principle to the 30-day classes is an extension, but the page says "Certain storage classes have a minimum object storage duration" generally. | none |
| waterfall, wf-standard, wf-standard-ia, wf-intelligent-tiering, wf-onezone-ia, wf-glacier-ir, wf-glacier-fr, wf-glacier-da | OK | All quotes on page; texts match. wf-intelligent-tiering is the Frequent/Infrequent tiers only, which is how the evaluator uses it. | none |
| min-billable-size | FIX | Text says S3 Standard-IA, One Zone-IA and Glacier Instant Retrieval charge the 128 KB minimum and "S3 Standard has no minimum". The quote is in the Standard-IA/One Zone-IA paragraph only; Glacier Instant Retrieval and Standard are not supported by it. | Limit the text to Standard-IA and One Zone-IA and drop the Standard clause. |
| ia-larger-objects | OK | Quote on page. This is the sentence that actually decides 011 and 012. | none |
| small-no-move | FIX | A newer (Sept 2024) rule that no trace uses; it only documents why multi-stage small objects are refused. Post-guide guide says to leave newer rules out. | Remove the rule and keep only the code comment and refusal. |
| Field prompts (all scenarios) | FIX | The class fields say only "Storage class for stage N"; no criterion (lowest cost that fits the documented guidance). Without it several scenarios are ties the docs do not break (One Zone-IA vs Standard-IA; Flexible Retrieval vs Instant Retrieval or Deep Archive when hours are fine). | Add to the prompt: "the least expensive class whose documented use case fits"; `cls-onezone-cheaper` then breaks the One Zone-IA tie. |

## Scenarios

| item | verdict | issue | suggested fix |
| --- | --- | --- | --- |
| cold-cellar-001 | OK | Standard, Standard-IA (day 30), Deep Archive (day 60: Standard-IA minimum 30 days after day 30, later than stage start 45). My view on the blind doubt: Deep Archive is the documented class for "less than once a year, hours fine"; Flexible Retrieval is documented for minutes. The day 60 is the point of the puzzle and follows the minimum-duration rule. | Prompt criterion (see above). |
| cold-cellar-002 | OK | Standard then Deep Archive at day 30. | none |
| cold-cellar-003 | FIX | One Zone-IA vs Standard-IA for re-creatable monthly data is a tie unless the prompt asks for the cheaper class (see 014). | Add the cost criterion to the prompt. |
| cold-cellar-004 | OK | Non-recreatable monthly: Standard-IA, day 30. | none |
| cold-cellar-005 | OK | Intelligent-Tiering by the documented unknown-pattern wording. | Drop "retrieval fees" from the story. |
| cold-cellar-006 | OK | Standard, Glacier Instant Retrieval (day 30), Deep Archive at day 120 (90 + 30). My view on the blind doubt: same as 001, Deep Archive is the documented class for "less than once a year, hours acceptable"; Flexible Retrieval is not the documented match. Waterfall Glacier Instant Retrieval to Deep Archive is supported. | none |
| cold-cellar-007 | FIX | Story says the analysts accept "a restore of minutes to hours", but the exhibit's retrieval need reads "A restore may take minutes, no longer". Also "a few times a year" is not a documented frequency (Glacier page: Flexible Retrieval semi-annually, Instant Retrieval quarterly). | Make story and exhibit agree (minutes) and say "about twice a year" or use the documented wording. |
| cold-cellar-008 | FIX | "A few times a year, hours allowed" maps to Flexible Retrieval, but the docs do not define that frequency, and Deep Archive and Instant Retrieval both still fit "hours allowed". The story's own hint about "cheapest-sounding archive" shows the tie. | Say "about twice a year" (semi-annual) or add the cost criterion and a quote that orders the classes. |
| cold-cellar-009 | OK | Less than once a year but restore in minutes: Flexible Retrieval (Deep Archive is hours). Standard to Flexible Retrieval at day 60. | none |
| cold-cellar-010 | OK | Rare plus milliseconds: Glacier Instant Retrieval. | none |
| cold-cellar-011 | OK | 40 KB, monthly, one stage: Standard. Decided by the pre-guide minimum-billable-size sentence; no lifecycle rule involved, so the 128 KB lifecycle default never decides. | none |
| cold-cellar-012 | OK | My view on the blind answer (One Zone-IA): the key (Standard) is the documented one. The page says the IA classes are "suitable for objects larger than 128 KB" and bill 128 KB for smaller ones; the story names the trap on purpose. Again the pre-guide sentence decides; no lifecycle rule. | Add the cost criterion so "to save money" is explicit. |
| cold-cellar-013 | OK | Intelligent-Tiering then Deep Archive at day 180 (Intelligent-Tiering to Deep Archive is in the waterfall; no minimum). | Drop "no retrieval fees" or cite it. |
| cold-cellar-014 | FIX | My view on the blind doubt: stage 2 One Zone-IA vs Standard-IA is a tie the docs break only through "less expensive than S3 Standard-IA" plus "can re-create", and the prompt never asks for the cheapest. Stage 3 has the same issue as 008 (few times a year, minutes fine: Flexible Retrieval vs Instant Retrieval). The supported transition One Zone-IA to Flexible Retrieval and day 60 (30 + 30) are correct. | Cost criterion in the prompt and documented frequency wording ("about twice a year"). |
| cold-cellar-015 | OK | Four stages, days 30 / 75 / 165 follow the minimum-duration rule and the waterfall. | none |
| cold-cellar-016 | OK | Upload directly to Standard-IA, Deep Archive at day 90 (30-day minimum already passed). | none |
| cold-cellar-017 | OK | Standard-IA day 30, Glacier Instant Retrieval at day 60 (30 + 30, after stage start 40). | none |

Counts (rows): OK 25, FIX 8, DROP 0. Scenarios: 13 OK, 4 FIX (003, 007, 008, 014). Rules and prompts: 4 FIX (cls-standard-ia, min-billable-size, small-no-move, field prompts).
