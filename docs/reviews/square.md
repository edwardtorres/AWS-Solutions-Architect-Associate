# Founders' Square question review

50 questions (10 for each of the 5 Foundations). Writers: two agents. Reviewers: a blind agent and a source agent that did not write them.

## Blind pass
Answered from stems and options only. 50 of 50 picks matched the keys; none flagged ambiguous. Notes the reviewer left (assumptions behind safe-harbor-account-009, town-charter-006 and -009, safe-harbor-account-002) were passed to the source pass; 009 was rewritten (below).

## Source pass: 6 FIX, 0 DROP, 44 OK (all evidence quotes verbatim)
| Question | Finding | Resolution |
| --- | --- | --- |
| town-charter-007 | Stem never mentions the application; two distractors strawmen | Stem names the application on Amazon EC2; two distractors replaced (role with s3:* on all resources; SSE-S3) |
| town-charter-008 | Stem put the Application Load Balancer in one Availability Zone (needs at least two) | Stem says the instances run in one Availability Zone |
| town-charter-009 | Stem required keeping the processing code, key needs code changes | Constraint dropped; sqs-what-is buffering quote added |
| town-charter-010 | One distractor (manual OS patching) not a real alternative | Replaced by a DynamoDB option that fails a stated requirement (database must stay relational) |
| safe-harbor-account-005 | Evidence came from the Organizations paragraph, stem is a standalone account | Evidence now the root-user task list; explicit-deny quote added |
| safe-harbor-account-009 | Meta "which statement" question tied to enforcement status | Rewritten as a standalone-account scenario about registering MFA for the root user |
| surveyors-grid-003 | Explanation implied .2 is that subnet's DNS server | Explanation and evidence use "base of each subnet range plus two" |
| surveyors-grid-007 | Evidence did not say SSH is TCP 22 | Added the EC2 security group rules page (ec2-sg-use-cases) and its SSH/RDP rows |
Minor notes also applied: town-charter-002, -006, lookout-tower-005, safe-harbor-account-010.

## Judgement calls
- town-charter-001 (how unanswered questions are scored) is sourced to the exam guide, which is an allowed source and the Foundation teaches exam technique. Kept at difficulty 1, never in the reserve.
- surveyors-grid-004 and -010 use subnet-size arithmetic from documented inputs (reserved addresses, block sizes). Accepted by the source reviewer.
