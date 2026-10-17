# Resolution of review-11-14

Rule used for badges: a billable step is kind `check` (with a checkpoint) or `optional` with an alt, because the lab checker rejects a non-optional `do` step that carries a cost badge.

## Lab 11
- [high] CloudWatch cost entry: fixed (`cloudwatch`, badged on s4, s5, s8, c1).
- [high] c3 deleted nothing: fixed (trail named lab11-trail in s11, `delete-trail` in c3).
- [medium] c5 buckets: fixed (loop with `s3 rb --force`, names re-derived by prefix).
- [medium] trail cost basis: fixed (trail and S3 split; basis reworded to the quote).
- [medium] s12 cited recorder page: fixed (cites the Config getting-started page; delivery channel and service-linked role mentioned; global-IAM default claim dropped).
- [medium] c4: fixed (rules deleted first and polled in c4, recorder and channel in c4b, names read from the CLI, extra-CI sentence added).
- [medium] v1 delivery channel: fixed.
- [low] Region sentence s2, s4 claim, s10 claim, s9 recheck hint, s7 notes warning: fixed. 2.2-K12 bullet dropped. Plan badge: no change (honest as is). Sensitive: no change needed.

## Lab 12
- [high] cost entries: fixed (`lab12-s3`, `glue-crawler`, `athena`; badges on s2, s4, s7, s9, s10, s12; cleanup c1, c2, c4). Those steps are kind `check` rather than optional because the lab cannot work without them.
- [medium] s4 source: fixed (S3 upload page; data is stated as made up). Athena minimum hedge kept in s12.
- [medium] s6 role naming and schedule: fixed (owner writes down the wizard's role name; c3 and v1 use it; no schedule claim).
- [medium] s8: fixed (quote now states a result location must be set).
- [medium] c4 variable: fixed (bucket found by prefix).
- [low] v1 Athena default bucket: fixed. s9 loose CloudWatch-metric quote: not changed (no AWS page describes the console statistic figure that I could quote). Bullets and Glue "free" note in services.ts: not changed (services.ts is not a lab file; suggestion passed to the lead).

## Lab 13
- [high] native DynamoDB backups: fixed (listed and deleted in both Regions in c4, listed in v1, console untick warning).
- [medium] s4: fixed (check only, cites the default-on sentence, no setting label).
- [medium] tables not badged: fixed (`ddb-tables` on s2, s10, c4).
- [medium] ARN screens: fixed (s7 to s10, c4, v1 marked sensitive).
- [medium] s8 retention: fixed. c2 to c4 DST reminder and copy-job wait: fixed (DST set in the code of c2, c3, c4, v1). s3 SRC and AWS_REGION: removed.
- [low] c3 role claim softened; s11 RPO/RTO wording; backup-copy basis reworded. c1 quote: not changed (no sentence about plan deletion found on the cited page). Trap and plan badge: no change.

## Lab 14
- [medium] c3/v1 bundle: fixed (c3 tag deactivation, c4 Compute Optimizer opt-out by CLI per its page, c5 Cost Explorer, c6 Cost Anomaly Detection; v1 checks enrollment status). The `Inactive` status value is the CLI value and is not quoted by the page: unverified.
- [medium] $BUCKET after a day: fixed (name written down; c2 finds it by prefix).
- [medium] Cost Anomaly Detection: fixed (s5 and c6; the page says you can opt out, so the "cannot remove" suggestion was not followed).
- [medium] s9/s10 hedges: fixed.
- [low] s12 banner/empty list, s13 claim, trap text, s7 notes warning: fixed. s11 and plan badge: no change.
