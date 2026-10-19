# Step 8, Part A: lab badges and open lab items

## 1. Alias table (`npx tsx scripts/report-alias.ts`)

Snapshot re-taken 2026-10-19 (185 offers; descriptions now stored). Every lab service was listed with the card it matches, that card's label and its description.

- **Problems found in the alias table: none.** All 29 non-null aliases are the service's own card: 27 are the identical name, 2 are the full name of the same service (`AWS KMS` → "AWS Key Management Service", `Amazon VPC` → "Amazon Virtual Private Cloud"; both card descriptions describe that service). No service is matched to a neighbour's card (VPC is not matched to the EC2 card).
- **No service is mapped to a card it should not use, so no lab was downgraded by a wrong mapping.** Four services have no card and stay `null`: AWS IAM, AWS IAM Identity Center, AWS Trusted Advisor, Amazon EC2 Auto Scaling. They keep Labs 1, 2, 7, 9, 13, 14 at "not confirmed" (Lab 3 is Paid plan only through its Organizations card; Lab 12 through Athena).
- New guard: `scripts/lib/freePlan.test.ts` fails if an alias differs from the service name unless it is listed in `FULL_NAMES` (`content/labs/services.ts`), and if an alias has no card in the snapshot.
- Limit of the badge, now stated under it on the Labs page: the Free Tier page labels whole services; it does not say which features of a service stay inside the Free plan (for example the optional NAT gateway in Lab 4 bills while it exists).
- The snapshot renderer was made reliable: it waits for the offer list to appear and re-checks the "Show N more" button before stopping. A first run in this session captured only 8 offers, because the list had not finished loading. Between the Step 7 snapshot and today, 5 offers changed (added: Amazon Application Recovery Controller, Amazon WorkSpaces Core, AWS Global Accelerator, AWS re:Post; removed: Amazon Personalize, AWS Application Migration Service); none is used by a lab.

Badges after this step: Free plan compatible: Labs 4, 5, 6, 8, 10, 11 · Paid plan only: Labs 3, 12 · Not confirmed: Labs 1, 2, 7, 9, 13, 14.

## 2. Lab 12

Now carries a `gate` like Lab 3's: a notice at the top ("This lab needs a Paid plan account": Amazon Athena is labelled "Paid plan exclusive" on the Free Tier page, and AWS says Free plan accounts do not include services that could deplete their credits), an acknowledgement before the steps appear, and a read-only walkthrough as the alternative. Cited sentence: Billing guide, "Free account plans don't include access to AWS services and features that could possibly deplete your credits, or hardware purchases." The Athena label itself comes from the dated snapshot (the page is rendered by scripts, so `check:links` cannot quote it). e2e: `Lab 12 says at the top…`.

## 3. Lab 6 pricing plan

AWS docs (CloudFront flat-rate pricing plans page) settle that **creating a distribution now involves an optional pricing-plan choice**: "When you create a new distribution, you can subscribe to a pricing plan." Plans are Free, Pro, Business and Premium; pay-as-you-go is the alternative. Findings that shaped the lab:
- A plan requires an AWS WAF web ACL on the distribution ("You must have a AWS WAF Web ACL associated with your distribution if you're using a pricing plan."), which conflicts with the lab's "no web ACL" check.
- A subscribed distribution cannot be deleted until the plan is cancelled; a disabled distribution keeps incurring the plan's charges. "Paid pricing plan cancellations take effect after the current billing cycle. Free plans are cancelled immediately."
- The documentation page does not state the Free plan's price; the CloudFront pricing page does, but labs never quote prices (and `labChecks` rejects a price inside a quote), so the lab does not cite that sentence.

Changes: new step `plan` before `distribution` (choose pay-as-you-go to match the lab; if considering a plan, read the pricing page first because a paid plan is charged monthly; read the plan screen before confirming, since the docs do not show the exact screen), a cost entry `cf-paid-plan` ("Bills while running: a paid CloudFront pricing plan") on that step and on the distribution cleanup step, the WAF check skips when the Free plan is chosen, and the cleanup step says to cancel the plan before deleting.

## 4. The other two open re-review items

- **Lab 6 DNS and hosted-zone removal.** The unsupported advice was split. The ACM step now only deletes the certificate after the distribution is gone (cited: "You cannot delete an ACM certificate that is being used by another AWS service."). A new optional step `c-zone` covers a hosted zone created only for the lab, cited to the Route 53 page: "You can delete a hosted zone only if it has no records other than the default SOA and NS records." and "If you delete a hosted zone, you can't undo it." The "remove the CNAME at your DNS provider" instruction is now "remove the record you created for it, wherever you created it" (a provider-specific click path, not a claim).
- **Lab 3 closed-account step.** The sentence "I found no page saying whether a closed account can be moved" is replaced by what the docs say: "the AWS pages used here do not say whether a closed account can still be moved, so move accounts before closing them", and the close step now cites "Any member account that you close will display a CLOSED label next to its account name in the AWS Organizations console for up to 90 days after the original closure date." (new source `lab-orgs-account-close`).

New sources: `cf-pricing-plans`, `r53-delete-zone`, `lab-orgs-account-close`.

Checks after Part A: typecheck, lint, 491 unit tests, `check:content`, `check:links` (796 pages, 7,571 quotes), `check:cfn`, `check:bundle`, `check:hygiene`, lab e2e (14 passed, both widths, axe).
