# Resolution of the re-review for labs 11 to 14

## Lab 11
- [medium] s11 SSE-KMS default: fixed (step tells the owner to leave Log file SSE-KMS encryption turned off; wording avoids creating an untracked key).
- [medium] c4/c4b delete all Config items: fixed (rule loop limited to names starting lab11, rule named lab11-s3-public in s13; recorder and delivery channel steps list first, run only if s12 created them; s12 says to skip if Config is already set up).
- [medium] s12 cited a landing page: fixed (cites the Config concepts page for recorder and delivery channel; "free" and "holds no data" claims dropped). The console setup subpage has no extractable text, so a bucket or role sentence could not be quoted.
- [low] c4b delivery-channel quote: not changed (no page sentence found for the delete command; the step also asks the owner to confirm the list). s13 note: not changed (informational).

## Lab 12
- Athena Paid plan: fixed (first step says plainly this lab needs a Paid plan account because the Free Tier page labels Athena Paid plan exclusive; no new quote, as that page is rendered by scripts).
- [low] v1 checkpoint and s2 wording: fixed. c3 policy path: not changed (informational, source says the wizard uses an inline policy).

## Lab 13
- [medium] s10 DST: fixed (assignment line added).
- [low] DST overwritten by placeholder: fixed (text says to edit the first line every time). s4 off-case: fixed (says cross-Region steps may not work and points to the alt/page).

## Lab 14
- [low] s5 irreversibility: fixed. c5, c6 optional: fixed. Scriptable tag check: not changed (no page documents the command).

Sensitive flags: steps printing ARNs were already marked; no change needed. Check: `npx tsx scripts/check-labs.ts lab-01 lab-11 lab-12 lab-13 lab-14` prints OK.
