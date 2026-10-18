# Re-review resolution: labs 04, 05, 06

## lab-04
- [low] stale "keep the default parameter": fixed.
- [low] alt claim about the S3 endpoint vs the closed ACL: fixed (alt reworded).
- [low] c-nat parenthetical unsupported: fixed (kept with the NAT page as a callout).
- [low] v-stacks filter: fixed (added DELETE_IN_PROGRESS, ROLLBACK_COMPLETE, CREATE_FAILED).

## lab-05
- [low] lifecycle vague day values: not changed. The minimum-days sentence is not on the cited pages (reviewer agrees); the step already says it only creates the rule.
- [low] v-bucket 403: fixed (checkpoint mentions Forbidden).

## lab-06
- [medium] WAF order: fixed. The decline instruction is now in `distribution`; `waf` is a check citing the wizard page, with the WAF billing basis as a callout.
- [medium] c-oac unsupported: fixed. Made optional with an alt ("leave it, harmless"); no AWS page documenting OAC deletion was found, so the instruction about where to delete it was dropped.
- [low] list-origin-access-controls verify: not added; c-oac is optional and unsourced, so no check is imposed.
- [low] c-cert weak source: fixed (new source acm-delete). The DNS record / hosted zone removal text has no AWS quote and stays as plain advice.
- [low] wizard pricing plan: partly fixed. Text now says read the first wizard page and do not subscribe to a flat-rate plan. The live wizard was not checked.
- Kept: `newer`, `callout` on `distribution`, lab-level `newer`.
