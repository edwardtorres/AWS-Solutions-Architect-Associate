# Source review: Policy Court

Reviewer: source pass. Method: every rule quote was checked against the cached live page (all 35 quotes found verbatim; script run over `rules`), the surrounding page text was read with `scripts/ctx.ts` / `q.ts`, the evaluator was read against each rule, and all 25 scenarios were run through `def.evaluate` (answers and traces listed). `check-puzzles policy-court` passes. No registry feature in `content/post-guide.json` matches any puzzle text; no post-guide dependency found.

## Rules

| Item | Verdict | Issue | Suggested fix |
| --- | --- | --- | --- |
| implicit-deny | OK | Quote verbatim. Rule text omits the root-user exception in the same sentence; the evaluator never models root, so no behaviour gap. | Optional: add "(the account root user is not modelled)". |
| explicit-deny | OK | Quote verbatim; evaluator denies on any matching Deny in any applicable policy, including boundary, session policy, SCP. Page supports "any applicable policy". | None. |
| same-account-union | OK | Quote verbatim. Page also notes other services may need an explicit resource-policy Allow; evaluator refuses nothing for that, but all scenarios use S3/Secrets Manager/STS where the union holds. | None. |
| cross-identity | OK | Quote verbatim, evaluator requires an identity Allow on the principal side (and boundary/session Allow, supported by iam-boundaries). | None. |
| cross-resource | OK | Quote verbatim; evaluator requires a matching resource-policy Allow. | None. |
| cross-both | OK | Quote verbatim. | None. |
| boundary-limits | OK | Quote verbatim; evaluator never grants from a boundary. | None. |
| boundary-intersect | OK | Quote verbatim; evaluator requires an Allow in both. | None. |
| boundary-user-resource | OK | Quote verbatim, matches page. Evaluator applies it only when the resource policy names the user ARN. Trace issue is logged under G3. | See G3. |
| boundary-role-resource | OK | Quote verbatim. Evaluator also applies the "role ARN is limited" logic to role trust policies and key policies naming a role ARN; the page does not say that. No scenario hits it. | Optional: refuse (return null) when `kind` is `role-trust` or `key-policy` and the match is `role`. |
| session-direct | OK | Quote verbatim; page repeats it on the denyallow page. Applied only to a resource policy naming the exact session ARN, same account. | None. |
| session-limits | OK | Quote verbatim. | None. |
| scp-no-grant | OK | Quote verbatim. | None. |
| scp-every-level | OK | Quote verbatim. Evaluator checks an Allow matching the action at each listed level; matches the page's Allow/Deny pages. | None. |
| scp-deny-any-level | OK | Quote verbatim. | None. |
| scp-scope | OK | Quote verbatim (denyallow page). Scenario 014 depends on it and is consistent with the Organizations page ("affect only the member accounts"). | None. |
| scp-management | OK | Quote verbatim. | None. |
| scp-allow-resource | OK | Quote verbatim; page also says Deny may name ARNs, so the evaluator only restricts Allow. | None. |
| trust-exception | OK | Quote verbatim. Evaluator also lets a trust policy that names the user ARN grant without an identity Allow (same account). Page text near the quote supports "resource policy grants directly to the user". | None. |
| principal-session | OK | Quote verbatim. | None. |
| principal-account | OK | Quote verbatim; the next sentence ("Both delegate permissions to the account") is the real support. | Optional: extend the quote to include "Both delegate permissions to the account." |
| principal-all | OK | Quote verbatim. | None. |
| principal-partial | OK | Quote verbatim; refusal only. | None. |
| principal-identity | FIX | Rule text says identity policies, boundaries, session policies and SCPs have no Principal. The quote supports identity-based policies only. SCP support exists on orgs-scp-syntax ("NotPrincipal Principal" unsupported). Nothing supports boundaries and session policies separately. | Reword: "Identity-based policies (and so boundaries and session policies, which are written like them) have no Principal." only if a page says so; otherwise limit the text to identity-based policies and cite orgs-scp-syntax for SCPs. Evaluator behaviour (refuse) is fine. |
| action-wildcard | OK | Quote verbatim; evaluator allows `*` anywhere in an action, refuses `?`. | None. |
| action-case | OK | Quote verbatim; evaluator matches actions case-insensitively. | None. |
| resource-wildcard | FIX | Rule text says `*` stands for any run of characters "including / and :". Quote supports "everything within a segment, including / ". Colon is not stated. Evaluator uses `.*`, which also crosses `:` (no scenario depends on it). Resource matching is case-sensitive with no cited rule (harmless: scenario names are lowercase). | Drop ", and :" from the text, or refuse resource patterns whose `*` would have to match a colon. |
| cond-missing-key | OK | Quote verbatim. | None. |
| cond-ifexists | OK | Quote verbatim; BoolIfExists with absent key is true. | None. |
| cond-ip | FIX | The quote ("resolves to the IP address that the request originates from") says nothing about range matching or NotIpAddress. The page does state: "The value must be in the standard CIDR format" and the table row "NotIpAddress All IP addresses except the specified IP address or range". | Replace or add a second quote with the CIDR sentence and the operator table row. |
| cond-mfa | OK | Quote verbatim. Page warns that `Bool ... false` Deny is unreliable and recommends `...IfExists`; scenarios 007 and 008 follow exactly that. | None. |
| cond-bool | OK | Generic but accurate. | None. |
| cond-tls | OK | Quote verbatim; the next sentence ("The request context returns true or false") and "always included" support the evaluator. | Optional: use the longer quote including "returns true or false". |
| cond-orgid | OK | Quote verbatim; absent for non-members is handled as false, as the rule says. | None. |
| cond-string | OK | Quote verbatim. | None. |
| G1 (field `decider`) | FIX | "Which policy decided it?" is ambiguous for an implicit deny. The IMPLICIT option reads "No policy allows it (implicit deny)", which is literally false in 015, 017, 020 and 024 (some policy does allow the action; it just cannot count). See the notes on the blind-flagged scenarios below. | Change the prompt to: "Which policy decided it? For an implicit deny, pick the policy whose missing Allow blocks the request." Relabel IMPLICIT as "Nothing grants it: no identity-based or resource-based Allow covers this request". For cross-account denies replace the generic option with a side-specific one (see 015, 017). For a trust policy that lacks the Allow, make the trust policy the decider (it is a gate, like a boundary). |
| G2 (exhibit of role trust policies) | FIX | `exhibit()` prints `"Resource": "*"` in the trust policy of scenarios 019 and 020. A real role trust policy cannot contain a Resource element (IAM rejects it as a prohibited field). Players may learn a malformed policy. | In `exhibit()`/`validate()` allow `Resource` to be absent when `resource.kind === 'role-trust'` and omit it in the printed JSON; keep `Resource: "*"` for key policies. Needs a page quote if kept as a rule (iam-eval-denyallow says trust policies "must explicitly allow access for principals" but not the missing Resource). |
| G3 (trace notes) | FIX | Scenario 002 trace contains `boundary-user-resource` ("a boundary does not limit it") although the scenario has no boundary. Same pattern for `session-direct` when no session policy exists. | Emit these notes only when a boundary or session policy is present. |

## Scenarios

Answers shown are the evaluator's (decision / decider). Difficulty counts: 1 = 6, 2 = 14, 3 = 5 (24 / 56 / 20 percent); acceptable. Decider spread: identity 4, several 1, boundary 3, secret 1, implicit 6, scp-ou 2, both-sides 4, bucket 2, session 1, trust none. Implicit is somewhat common but fine.

| Item | Verdict | Issue | Suggested fix |
| --- | --- | --- | --- |
| policy-court-001 | OK | Matches the policy-eval-basics Carlos example (DenyS3Logs with `*log*`). Deny / identity. | None. |
| policy-court-002 | OK | Matches the second half of the same example (both identity and bucket policy allow). Allow / several. Trace note issue is G3. | G3. |
| policy-court-003 | OK | Shirley example: boundary lacks IAM, so implicit deny; removing the boundary flips the result, so "boundary" is the unique decider. Answer is correct. Blind reviewer is right that "boundary vs implicit" can look defensible; that is the G1 wording problem, not a data problem. | G1 prompt/label. |
| policy-court-004 | OK | Matches the Nikhil logs-bucket sentence. Deny / boundary (explicit Deny). | None. |
| policy-court-005 | OK | Matches the Nikhil Secrets Manager sentence. Allow / secret policy. | None. |
| policy-court-006 | OK | Resource policy names a role ARN while the request comes from a role session: page table says this is limited by the boundary. Removing the boundary flips it, so "boundary" is unique and correct. Same wording issue as 003. | G1. Optionally mention in the story that the role has assumed the role (session) so the role-ARN versus session-ARN point is visible. |
| policy-court-007 | OK | BoolIfExists false Deny with no MFA key: matches the cond page recommendation. Deny / identity. | None. |
| policy-court-008 | OK | Bool true Allow with absent key is false, so implicit deny. "No policy allows it" is literally true here (the only Allow does not match). | None. |
| policy-court-009 | OK | IpAddress mismatch gives implicit deny; literal. Bullets (least privilege) are a weak fit but acceptable. | None. |
| policy-court-010 | OK | NotIpAddress Deny does not match inside the range. Allow / identity. | None. |
| policy-court-011 | OK | Only the OU SCP lacks an Allow; removing it flips the result, so scp-ou is unique. Correct per the SCP evaluation page. Same wording issue as 003. | G1. |
| policy-court-012 | OK | Deny in OU SCP overrides. Deny / scp-ou. | None. |
| policy-court-013 | OK | Management account is outside SCPs; Allow / identity. Correct per quote. | None. |
| policy-court-014 | OK | SCP on the bucket account does not apply to an external principal. Both-sides. Consistent with scp-scope and the Organizations page. Story could mislead players into thinking SCPs protect a resource from outsiders; that is the point and is explained by the trace. | None. |
| policy-court-015 | FIX | Result (Deny) is correct. The decider answer "No policy allows it (implicit deny)" is false as worded: the bucket policy allows the account. The failing side is the principal's missing identity Allow. | Make the identity policy of the principal the decider, or provide a cross-account option "Principal side: no identity-based Allow" and use it for this and 017. |
| policy-court-016 | OK | Allow, both sides. Derived from the Demo example (the page's own request is to the `-production-logs` bucket and is denied by DenyS3Logs; this scenario uses the production bucket and PutObject, consistent with "can create and edit"). Bucket and `log` pattern checked: no match. | Optional: add the page's own logs-bucket request as another scenario (explicit Deny, identity). |
| policy-court-017 | FIX | Deny is correct (documented: the role cannot delete). Decider "No policy allows it" is false as worded: the identity policy allows delete; the bucket policy lacks it. | Decider = the bucket policy (the side that lacks the Allow) or the cross-account side option from 015. |
| policy-court-018 | OK | Principal `*` with `aws:PrincipalOrgID`; matches the global condition key example. Allow / both-sides. | None. |
| policy-court-019 | FIX | Result correct (Allow, both sides). Exhibit shows `Resource: "*"` in the trust policy, which is not valid in a real trust policy. | G2. |
| policy-court-020 | FIX | Deny is correct (trust-exception). Decider "No policy allows it" is false as worded: the identity policy allows sts:AssumeRole. It is the trust policy that does not name the user. Also the same G2 invalid Resource element. | Decider = trust policy (G1) and remove Resource from the printed trust policy (G2). |
| policy-court-021 | OK | TLS Deny in the bucket policy overrides the identity Allow. Deny / bucket. | None. |
| policy-court-022 | OK | Rests on one sentence (session ARN named in a resource policy is not limited by the session policy), found on two pages. Answer matches the evaluator. Trace is fine. Difficulty 2 understates it. | Raise to difficulty 3. |
| policy-court-023 | OK | Session policy lacks PutObject; removing it flips the result, so session is unique and correct. Bullet fit: practises session policies, not the federate-a-directory decision. | G1; optional: keep only 1.1-K2 in bullets or retitle. |
| policy-court-024 | FIX | Deny is correct (a session policy never grants). Decider "No policy allows it" is false as worded because the session policy allows DynamoDB. The identity policy is the one missing the Allow. | Decider = identity-based policy of the role (or relabel IMPLICIT as in G1 so that it says session policies cannot grant). Bullet fit as for 023. |
| policy-court-025 | OK | Both policies allow; Allow / identity (the session policy only limits). A reader might expect "several"; the story says "agree" but the trace explains the session does not grant. | Optional: add a sentence to the story or option text: "A session policy never counts as a grant". |

## View on the seven scenarios the blind reviewer flagged

- 003, 006, 011, 023: the keyed answer (boundary / boundary / scp-ou / session) is the unique limiter whose removal turns the result into Allow, and it is the wording AWS uses ("the boundary does not allow it"). Keep the keys; fix the prompt and the IMPLICIT label (G1) so a player knows that a limiter lacking an Allow counts as the decider.
- 020: the key is wrong in kind, not result: the trust policy is the gate that fails, yet the only offered non-policy-specific answer is "No policy allows it". Make the trust policy the decider. Also fix the invalid Resource element (G2).
- 024: the same problem in another form: a session policy that allows but cannot grant. Key the identity policy (the policy missing the Allow), or reword IMPLICIT.
- 025: key is fine. Add a hint that a session policy does not count as a grant.
- 015 and 017 were not flagged by the blind reviewer but share the 020 problem (a side that lacks the Allow) and should be fixed together.

## Counts

Rules 35: OK 32, FIX 3 (principal-identity, resource-wildcard, cond-ip), DROP 0. General evaluator/exhibit items: FIX 3 (G1 decider wording, G2 trust-policy Resource element, G3 trace notes).
Scenarios 25: OK 20, FIX 5 (015, 017, 019, 020, 024), DROP 0.
