# Resolution of review findings, labs 09 and 10

## Lab 09
- [medium] EBS and ALB public IPv4 costs: fixed. New `ebs` cost (EBS pricing page), `ipv4` widened to load balancer nodes and instances (ELB pricing quote); both on stack and cleanup steps.
- [medium] DELETE_FAILED / leftovers: fixed. New verify step `v-stack` (failed stack deletions, VPC by tag); ASG list filtered by the lab tag; scaling alarm check added.
- [medium] wizard quote: fixed. Cites the ELB page naming the three types; removed the "do not choose Network" clause.
- [medium] stack not sensitive: fixed (`sensitive: true`).
- [low] template hand-over and weak quotes: fixed (save as .yaml, Upload a template file quote; template step quote replaced).
- [low] ec2 cost quote: not changed beyond rewording the basis; I found no quotable sentence saying running instances are billed, so the basis now says to read the running row.
- [low] alarms: fixed as suggested (no billing claim, removed with the policy, verify checks them).
- [low] t3.small: fixed (only t3.micro allowed).
- [low] goal: fixed (instance, not zone).
- [low] site step: fixed (CloudShell loop of ten requests).
- [low] terminate checkpoint: no change needed. [low] needs: removed.

## Lab 10
- [high] restore settings: fixed; class, single-AZ, not public, lab subnet group/VPC, minimum storage, no extra monitoring named, delete right after.
- [high] stack deletion: fixed. c-stack says replica first; new c-wait step with DELETE_FAILED handling; v-db lists DELETE_FAILED stacks.
- [medium] storage cost: fixed (`rds-storage`, listed on stack, replica, restore, c-extra, c-stack).
- [medium] replica ambiguity: fixed (db.t3.micro, single-AZ, same Region, cross-Region warning).
- [medium] sensitive: fixed on stack, snapshot, replica, restore.
- [medium] retained backups query: fixed (Status retained filter, chosen Region only stated).
- [low] deletion-policy wording, password rule, fixed identifier and MultiAz parameter: fixed (reworded, 12 to 40 letters and digits, identifier removed, parameter removed).
- [low] bullets: kept 2.2-S1, the stack step now says rebuilding from the file is the automation. 2.2-S4 kept (Multi-AZ failover reading).
- [low] c-snaps final snapshot wording: not changed; c-extra already says to clear final snapshot, and the template uses Delete.
- Also removed the snap-rule step (its point moved into the backups checkpoint) to stay at 18 steps; `needs` emptied because lab 01 is unused.
