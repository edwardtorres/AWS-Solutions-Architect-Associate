# Re-review resolution, labs 01 to 03

Check: `npx tsx scripts/check-labs.ts lab-01 lab-02 lab-03` prints OK.

## lab-01
- [low] v1/c1 conflict: fixed (v1 says to skip the list-mfa-devices command if the user was deleted).
- [low] s8 sign-in URL: fixed (s8 says to use the sign-in URL noted in s7).

## lab-02
- [medium] s10 proves nothing: fixed by option (a) in honest form. The text now says the step only confirms the s6 result is unchanged, tells the owner to include the resource's policy if offered, and says the proof is the cited sentence. Option (b) (live upload as the role) was not used: the boundary omits s3:ListAllMyBuckets, so the S3 console would fail for other reasons and the result would not isolate the boundary.
- [low] s6: no action needed (reviewer).

## lab-03
- [medium] c3/c3b order: fixed (move back and delete the OU is now before closing; text says to do it before closing any account and to leave the OU if it cannot be deleted, since no page says whether a closed account can be moved).
- [low] c4 stronger than source: reworded to "no step here undoes the Paid plan upgrade (see s1b)"; s1b and the gate were left as they are.
- [low] s4b: softened to "stays while the organization exists".
- [low] v1 suspended status: fixed (clause added that a closed account may stay listed as suspended).
