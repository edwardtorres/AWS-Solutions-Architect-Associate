# Resolution: labs 04, 05, 06

## lab-06
- [medium] WAF in wizard: fixed (new step `waf` says decline it, cites AWS WAF pricing basis; source waf-pricing).
- [medium] duplicate bucket policy: fixed (read the policy first, skip if the wizard wrote it; cites "CloudFront updates the S3 bucket policy for you").
- [medium] lost BUCKET variable: fixed (assignment repeated in every command using it).
- [low] default root object / OAC label: fixed (separate `root` step with source cf-default-root; label tied to `oac-check`).
- [low] upload quote: fixed (s3-upload-objects). [low] sensitive on `distribution`: fixed.
- [low] OAC leftover, hosted zone / validation record, ACM verify: fixed (`c-oac`, c-cert text, `v-cert`).
- [low] None output: fixed. [low] trap sentence: softened to the documented feature. [low] ACM Region: fixed ("return to your chosen Region").
- [low] CloudFront pricing plan in wizard: not changed; I cannot confirm the live wizard offers one, so no instruction was added (stated in notes).

## lab-04
- [medium] EIP release claim: fixed (cleanup cites CloudFormation stack deletion; by-hand NAT deletion note kept in text).
- [medium] DELETE_FAILED: fixed (verify `v-stacks` with retry quote).
- [low] VpcCidr parameter: removed from lab-04-vpc.yaml. [low] NAT step: note that the private ACL blocks traffic. [low] template upload: added S3 URL alternative. [low] nacl ephemeral quote: fixed (trap now cites the stateless sentence). [low] routes checkpoint: "Before you create the NAT stack". [low] describe-addresses: "in the Region you used".
- [low] rule that optional billable costs force "not confirmed" plan: not changed, belongs to the lead (services/derivation code, not my lab files).

## lab-05
- [medium] KMS billing wording: fixed (charges stop when deletion is scheduled; source kms-pricing; shortest waiting period).
- [medium] lifecycle: fixed (step only creates the rule; 128 KB quote). The minimum-days sentence was not found on the page, so no day values are given.
- [medium] sensitive on kms-default, cmk, c-key: fixed.
- [low] BUCKET reset: fixed. [low] public-policy warning: fixed. [low] c-empty CLI claim dropped, multipart sentence added.
- [low] KMS request charges in goal and plan-rule items: not changed (informational / lead decision).
