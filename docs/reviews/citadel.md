# Citadel question review

284 questions in 12 buildings (245 live, 39 mock-reserve). Writers: six agents. Reviewers did not write them.

## Blind pass (stems and options only)
First pass: 284 of 284 picks matched the keys, none flagged ambiguous.
After the source-review fixes (below) every question was blind-reviewed again from fresh exports: 280 of 284 matched and were unambiguous; four were flagged:

| Question | Reviewer concern | Resolution |
| --- | --- | --- |
| key-vault-025 | Adding the team to the key policy looked like a second reading | Stem now says the team is already allowed by the key policy |
| embassy-row-030 | Nothing in the stem made the Object Ownership option necessary | Stem now says the bucket's Object Ownership setting must be compatible with OAC |
| embassy-row-033 | "Add MFA protection to the role" is vague | Kept: this is the wording of the AWS page the key rests on; the reviewer still chose the key |
| gatehouse-008 | Stem did not say whose network ACL carries the deny | Stem now names the backend subnet's own network ACL and the subnet's own CIDR as the source |

## Source pass (key, every explanation, evidence)
23 FIX, 0 DROP, no wrong keys. Fixes made:
- Invented options replaced by real ones: embassy-row-023 (preventive controls), gatehouse-010 and -019, compliance-registry-012, -020, -026.
- Stems tightened or wording corrected: identity-keep-027, federation-bridge-011, embassy-row-031 (LEAST change qualifier), customs-house-015, key-vault-015, wardens-lodge-015, compliance-registry-002, -016, -025.
- Evidence strengthened: embassy-row-008 (full confused-deputy sentence), customs-house-008 (MACsec page), certificate-office-011.
- Question rebuilt because the service is closed to new customers: compliance-registry-015 (CloudTrail Lake) now uses an organization trail, S3 lifecycle expiration and Amazon Athena. CloudTrail Lake is not used anywhere in notes or questions.
- Near-duplicates differentiated: watchtower-009 (managed rule groups instead of a third rate-based rule), watchtower-022 (scenario instead of page wording), embassy-row-007 and -030, charter-hall-008 and -018, federation-bridge-013, customs-house-016.
- Placement tag moved from watchtower-019 (close to a definition) to watchtower-017; eight placement-eligible questions remain.

## Judgement calls left as reviewed
- gatehouse-025 (regional NAT gateway) is documented but newer than the exam guide; kept as a reserve question.
- Several distractor explanations rest on general IAM or VPC behaviour rather than a quoted sentence; no key does.
- Remaining near-duplicate notes (embassy-row-004/-035, charter-hall-014, federation-bridge-001/-005/-019) test different decisions and were accepted.
