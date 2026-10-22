# Deploying the study site

The site is a static build served from a private S3 bucket through CloudFront at `saa.edwardtorres.dev`. Two CloudFormation
stacks in `infra/` create the AWS side; GitHub Actions publishes each `main` build with a short-lived OIDC role. Nothing
is stored as a long-lived key.

```
push to main ─► check job (npm run check, layout, e2e on the production build)
                 │ passes
                 ▼
             deploy job ── OIDC role (trusts only refs/heads/main) ──► S3 bucket (private, Block Public Access)
                 │                                                        ▲ read by CloudFront through OAC only
                 ▼                                                        │
             CloudFront invalidation ◄── distribution ───────────────── web ACL (default allow)
                 │                       (Free pricing plan, TLS 1.2+, response headers policy)
                 ▼
             smoke job: e2e against the live site (reports only)
```

Cloudflare holds the DNS: the certificate validation record and the `saa` record, both DNS only (grey cloud).

## Before you start

- Use the **portfolio** AWS account on a **Paid plan**. Never the lab account, which is on the Free plan and closes after six months.
- Install AWS CLI v2 and sign in to the portfolio account. Every command below uses placeholders; fill them in on your machine and do not commit them.
- Check **IAM → Identity providers** for an existing provider for `token.actions.githubusercontent.com`. An account can have one per URL. If it exists, deploy the site stack in step 4 with `CreateGitHubOidcProvider=false` and `ExistingGitHubOidcProviderArn=<its ARN>`.

## Order of steps

1. **Certificate stack** (us-east-1). It waits for DNS validation, so keep the terminal open:

   ```
   aws cloudformation deploy --region us-east-1 --stack-name saa-cert \
     --template-file infra/saa-cert.yaml
   ```

2. **Validation record.** While stack 1 waits, open **Certificate Manager** in us-east-1, choose the certificate for `saa.edwardtorres.dev`, and copy the CNAME name and value under its domain entry. In **Cloudflare** (zone `edwardtorres.dev`) add that CNAME with **DNS only** (grey cloud). The stack completes once ACM sees it.

3. **Read the certificate ARN** from stack 1:

   ```
   aws cloudformation describe-stacks --region us-east-1 --stack-name saa-cert \
     --query "Stacks[0].Outputs[?OutputKey=='CertificateArn'].OutputValue" --output text
   ```

4. **Site stack** (us-east-1). Budget values are supplied here and are not stored in the repository:

   ```
   aws cloudformation deploy --region us-east-1 --stack-name saa-site \
     --template-file infra/saa-site.yaml --capabilities CAPABILITY_IAM \
     --parameter-overrides CertificateArn=<certificate-arn> BudgetEmail=<your-email> BudgetLimitUsd=<monthly-limit-usd>
   ```

   Add `CreateGitHubOidcProvider=false ExistingGitHubOidcProviderArn=<arn>` if the identity provider check found one. Read the outputs with `describe-stacks`: `SiteBucketName`, `DistributionId`, `DistributionDomainName`, `DeployRoleArn`.

5. **Pricing plan (console).** CloudFormation has no property for it. Open **CloudFront → Distributions**, choose the new distribution, use **Update**, and under **Pricing plan** choose **Free**. The plan lists features it does not support, such as real-time access logs; this template enables none of them. Confirm the console shows the plan at $0 with no overage charges.

6. **Cost allocation tag.** Open **Billing and Cost Management → Cost allocation tags**, and activate the user-defined tag **Project**. It can take up to 24 hours to appear in Budgets. The budget only counts resources with this tag.

7. **DNS record.** In Cloudflare add a CNAME `saa` pointing at the `DistributionDomainName` output, **DNS only**. Confirm no `saa` record existed before.

8. **GitHub variables.** Repository **Settings → Secrets and variables → Actions → Variables**, then set:

   | Variable | Value |
   | --- | --- |
   | `AWS_DEPLOY_ROLE_ARN` | output `DeployRoleArn` |
   | `AWS_REGION` | `us-east-1` |
   | `SITE_BUCKET` | output `SiteBucketName` |
   | `CLOUDFRONT_DISTRIBUTION_ID` | output `DistributionId` |
   | `SITE_URL` | `https://saa.edwardtorres.dev/` |

   Check that Actions is enabled for the repository. The deploy job masks the three AWS values before any step runs.

9. **First deploy.** Run the **deploy** workflow from **main** (or push to main). The check job must pass before anything is published.

10. **Verify.** Certificate status is **Issued**. The distribution lists `saa.edwardtorres.dev` as an alternate domain. Then `curl -sI https://saa.edwardtorres.dev/` returns the security headers, and the Lighthouse runner measures the live site:

    ```
    # Set SITE_URL first (on Windows PowerShell: $env:SITE_URL = 'https://saa.edwardtorres.dev/')
    npm run e2e:live
    npm run lighthouse -- --url https://saa.edwardtorres.dev/ --runs 3 --out docs/lighthouse/live-mobile.json
    ```

## What the deploy does

- **Check job.** `npm ci`, then `npm run check` (types, lint, unit tests, content, CloudFormation templates, build, bundle, hygiene), the layout test, and the full end-to-end suite on the production build served with the deploy headers. Any failure stops the deploy.
- **Deploy job.** Uses the exact `dist/` the check job produced (an artifact, not a second build). It assumes the deploy role through OIDC and syncs in this order:
  1. hashed assets under `assets/` with `public, max-age=31536000, immutable`;
  2. font files with their `font/woff2` type;
  3. everything else with `no-cache`;
  4. the web manifest with its manifest type;
  5. deletion of hashed assets no build references any more. This runs last, after the new `index.html` is live.

  Then it invalidates `/`, `/index.html`, `/404.html`, `/sw.js` and `/manifest.webmanifest`.
- **Smoke job.** Runs the end-to-end suite against the live site. It is marked `continue-on-error`: a failure shows on the run but cannot undo a deploy that has already happened.

## Rollback

Run the **deploy** workflow manually from **main** and set `sha` to an earlier commit. The check job runs on that commit, so the build that goes live is the one that passes, and the deploy job publishes it the same way. The workflow file is always the one on main. If an old commit's scripts no longer pass the current checks, the run stops before anything is published, and you need a newer commit.

## Errors and caching

- A private bucket answers a missing object with **403**, not 404. CloudFront maps both 403 and 404 to `/404.html` with status 404.
- Hashed assets are immutable, so a new build never overwrites them. Non-hashed files are invalidated on every deploy.
- Plain HTTP requests get a redirect to HTTPS (`redirect-to-https`) and are never served content. The brief asked for HTTPS only; this is the one deliberate deviation, and `redirect-to-https` can be changed to `https-only` in the template if you prefer.

## Teardown

The site bucket has `DeletionPolicy: Retain`, so deleting the stack keeps the bucket. To remove the site: back up the bucket's contents, empty the bucket, delete stack `saa-site`, delete the bucket, then delete stack `saa-cert` and the Cloudflare records.
