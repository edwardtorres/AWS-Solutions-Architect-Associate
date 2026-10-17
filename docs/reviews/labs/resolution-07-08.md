# Resolution: labs 07 and 08

## lab-07
- [medium] Lambda log groups left behind: fixed. Two LogGroup resources with 7-day retention in the template; cleanup text updated; new verify v3 lists log groups.
- [medium] s8 sensitive: fixed (s8 and s11 marked sensitive).
- [low] v2 covered SQS only: fixed. v3 checks Lambda, API, log groups and DELETE_FAILED stacks.
- [low] open API and usage-based note: fixed (goal).
- [low] template source in s3: fixed in wording (saved from the lab page in the app); how the app exposes the file is for the lead to confirm.
- [low] repeated reads in s8/s11: fixed (visibility-timeout 0, text says the good order may reappear).
- [low] container-yard unused: not changed; container-yard is mapped but no bullet of it is claimed, and the guide only lists it for the assignment. No Fargate content added.
- [low] s6 six-times rule: fixed.

## lab-08
- [medium] s7 capacity checkpoint: fixed; compares Scanned with Count and says capacity may be equal at this size.
- [medium] PITR cost: fixed. cost entry `pitr` (pricing page: "DynamoDB charges for PITR based on the size of each DynamoDB table...") on s12 and c2.
- [medium] TableArn: fixed. s3, s8, s13 sensitive.
- [medium] Status GSI caveat: fixed in s8 text as study guidance (low-cardinality caveat). No extra quote added because the step cites the GSI page; the caveat is not an AWS statement.
- [low] s12 query: fixed (adds EarliestRestorableDateTime).
- [low] s9 split: fixed in text (run first command until ACTIVE, then second).
- [low] v1 system backups: fixed with new verify v2 (list-backups).
- [low] c2 pricing page: not changed; the system-backup retention is stated as a billing fact ("at no additional cost") only on the pricing page; the PITR docs page has no such sentence.
- [low] needs lab-01: not mine to change; the lead added `needs: ['lab-01-safe-account']` to both files after my first report (my original had none). Left as is.
