# Resolution of review findings, labs 01 to 03

Check: `npx tsx scripts/check-labs.ts lab-01 lab-02 lab-03` prints OK.

## lab-01
- [medium] s10 email wording: fixed (type your own address, never paste it into problem notes).
- [low] s7/s8 sign-in URL: fixed (note the sign-in URL or alias, keep it private).
- [low] s9 quote vs MFA claim: fixed by rewording; the MFA-prompt claim was removed, checkpoint is now "console opens under your IAM user name".
- [low] s2 extras: fixed (second-device and authenticator advice dropped; quote is now the passkey/security key sentence).
- [low] s4 "Account page": fixed (location removed).
- [low] c1 no-op cleanup: fixed (removed; the root sign-out advice moved into s8).
- [low] c2 sourcing: fixed (only the IAM user is deleted, quote is the IAM user removal sentence; budget and group are kept and the text says so).
- [low] v1 coverage: fixed (adds list-mfa-devices and a Budgets console check; step marked sensitive).
- [low] services: fixed (AWS CloudShell added).
- Budget free-of-charge note: not changed; no AWS page cited for it and labs never state billing amounts.

## lab-02
- [medium] needs / root cannot switch roles: needs already had lab-01; s1 and s11 now say to work as the lab 1 administrator, not root.
- [medium] s6/s10 object ARN: fixed (enter the bucket ARN for ListBucket and the object ARN for the rest; fallback sentence if the simulator ignores the bucket policy).
- [low] s3 quote scope: not changed; accepted as is (s4 covers the trust policy).
- [low] s5: fixed (policy Entities attached path only).
- [low] s8 quote: not changed; design step, accepted.
- [low] s2 bucket name: fixed (lab2- plus random letters, not your name).
- [low] services: CloudShell added. AWS STS is not a key of SERVICE_PLANS and would need an unconfirmed entry in the shared table, which I may not edit; not changed.
- [low] c1: fixed (bucket policy deletion removed).
- Privacy: s3 and s5 now sensitive.

## lab-03
- [high] s9 member account lands in the root: fixed (s9 text says so; new optional step s9b moves it into lab3-test with a sourced quote and checkpoint).
- [medium] default SCP / SCPs already enabled: fixed (s4 is now "confirm enabled", new s4b explains the default root SCP, s5 checkpoint says "among the policies", end-of-lab text says the default SCP stays while the organization exists).
- [medium] one-way upgrade: partly fixed. New s1b and c4 state the upgrade as permanent with the sourced sentence "Your free tier credits expire immediately." No AWS page I found says the upgrade cannot be reverted or that deleting the organization does not revert it; the text says "no AWS page says ... returns the account to the Free plan", not a claim of fact.
- [medium] emails: fixed (type your own, never paste into notes). The claim that a closed account's address is reserved was not found on a page, so it is not stated.
- [medium] cleanup/verify: fixed (OU deletion step c3b with source, list-accounts in v1, console check for the OU). The root-id OU listing command was not added to avoid a sensitive id.
- [low] needs: already lab-01. [low] s5 quote thin: not changed. [low] c3 "cannot be undone": not changed, no source found.
- [low] services: CloudShell and S3 added.
