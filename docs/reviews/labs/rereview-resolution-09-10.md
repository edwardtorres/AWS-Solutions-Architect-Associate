# Re-review resolution, labs 09 and 10

No medium findings were open for these labs; the lows:

## Lab 09
- wizard quote thin: fixed (now cites the Network Load Balancer intro sentence on the OSI layer, source `nlb-intro`).
- alarm prefix too broad: fixed (`TargetTracking-lab-09-web-tier`).
- c-wait checkpoint for owners who skipped the stack: fixed.
- site step errors right after CREATE_COMPLETE: fixed (wait two minutes and rerun).

## Lab 10
- restore security group: fixed (use the VPC's default security group, never create a new one).
- cleanup steps for the free path: fixed (c-extra, c-wait, c-snaps, c-retained text and checkpoints allow "never created").
- v-db lists every database: fixed (filtered to identifiers starting with "lab"; the stack's database id starts with the stack name lab-10-rds). Not filtered by tag, because that needs a per-database tag call; the filter is a convenience and the checkpoint still says to ignore databases you made elsewhere.
