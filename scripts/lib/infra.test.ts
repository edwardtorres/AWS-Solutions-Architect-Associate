import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS, cspHeader } from './securityHeaders';

const site = readFileSync(fileURLToPath(new URL('../../infra/saa-site.yaml', import.meta.url)), 'utf8');
const cert = readFileSync(fileURLToPath(new URL('../../infra/saa-cert.yaml', import.meta.url)), 'utf8');

/** The first value written on a line for a YAML key (a bare key that opens a nested block has no value), quotes removed. */
function valueOf(text: string, key: string): string | undefined {
  const line = text
    .split('\n')
    .find((l) => l.trimStart().startsWith(`${key}:`) && l.slice(l.indexOf(':') + 1).trim() !== '');
  return line?.slice(line.indexOf(':') + 1).trim().replace(/^["']|["']$/g, '');
}

/** The text of one resource: from its name line to the next line indented no deeper than a resource name. */
function block(text: string, name: string): string {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l === `  ${name}:`);
  const end = lines.findIndex((l, i) => i > start && /^(\S| {2}\S)/.test(l));
  return lines.slice(start, end < 0 ? undefined : end).join('\n');
}

describe('response headers: the CloudFront policy matches the shared values', () => {
  it('the CSP in the template is the one the server and the build use', () => {
    expect(valueOf(site, 'ContentSecurityPolicy')).toBe(cspHeader());
  });

  it('HSTS is max-age only, with no subdomains and no preload', () => {
    expect(valueOf(site, 'AccessControlMaxAgeSec')).toBe('31536000');
    expect(SECURITY_HEADERS['Strict-Transport-Security']).toBe('max-age=31536000');
    expect(valueOf(site, 'IncludeSubdomains')).toBe('false');
    expect(valueOf(site, 'Preload')).toBe('false');
  });

  it('frame, content type and referrer headers match', () => {
    expect(valueOf(site, 'FrameOption')).toBe(SECURITY_HEADERS['X-Frame-Options']);
    expect(valueOf(site, 'ReferrerPolicy')).toBe(SECURITY_HEADERS['Referrer-Policy']);
    expect(site).toMatch(/ContentTypeOptions:\n\s+Override: true/);
  });

  it('Permissions-Policy matches', () => {
    expect(site).toContain(`Value: '${SECURITY_HEADERS['Permissions-Policy']}'`);
  });
});

describe('the site stack keeps the bucket private and serves it only through OAC', () => {
  it('blocks every public access setting and retains the bucket', () => {
    for (const setting of ['BlockPublicAcls', 'BlockPublicPolicy', 'IgnorePublicAcls', 'RestrictPublicBuckets']) {
      expect(valueOf(site, setting), setting).toBe('true');
    }
    expect(site).toMatch(/DeletionPolicy: Retain/);
  });

  it('uses Origin Access Control, never an Origin Access Identity', () => {
    expect(site).toMatch(/OriginAccessControlId: !GetAtt OriginAccessControl\.Id/);
    expect(site).toMatch(/OriginAccessIdentity: ''/);
    expect(site).not.toMatch(/cloudfront-origin-access-identity/);
  });

  it('limits the bucket read to this distribution by source ARN', () => {
    expect(site).toMatch(/AWS:SourceArn: !Sub 'arn:\$\{AWS::Partition\}:cloudfront::\$\{AWS::AccountId\}:distribution\/\$\{SiteDistribution\}'/);
  });

  it('redirects plain HTTP to HTTPS and maps the private bucket\'s 403 to the 404 page', () => {
    expect(site).not.toMatch(/ViewerProtocolPolicy: allow-all/);
    expect(site).toMatch(/ErrorCode: 403\n\s+ResponseCode: 404\n\s+ResponsePagePath: \/404\.html/);
  });

  it('uses the managed CachingOptimized and CachingDisabled policies by their documented IDs', () => {
    expect(site).toContain('658327ea-f89d-4fab-a63d-7e88639e58f6');
    expect(site).toContain('4135ea2d-6df8-44a3-9df3-4b5a84be39ad');
  });

  it('negotiates TLS 1.2 or later with the certificate in us-east-1 and no logging', () => {
    expect(valueOf(site, 'MinimumProtocolVersion')).toBe('TLSv1.2_2021');
    expect(valueOf(site, 'PriceClass')).toBe('PriceClass_100');
    expect(site).not.toMatch(/Logging:/);
  });
});

describe('the web ACL is attached, as a pricing plan requires', () => {
  it('the distribution uses a CloudFront-scope web ACL that allows by default', () => {
    expect(site).toMatch(/WebACLId: !GetAtt WebAcl\.Arn/);
    expect(site).toMatch(/Scope: CLOUDFRONT/);
    expect(site).toMatch(/DefaultAction:\n\s+Allow: \{\}/);
  });
});

describe('the deploy role trusts only main, from the GitHub OIDC provider', () => {
  it('requires the audience and the exact main-branch subject', () => {
    expect(site).toMatch(/token\.actions\.githubusercontent\.com:aud: sts\.amazonaws\.com/);
    expect(site).toMatch(/token\.actions\.githubusercontent\.com:sub: !Sub 'repo:\$\{GitHubRepository\}:ref:refs\/heads\/main'/);
    expect(site).toMatch(/Action: sts:AssumeRoleWithWebIdentity/);
  });

  it('grants only what the publish needs: list, put and delete in the bucket, and one invalidation', () => {
    const role = block(site, 'DeployRole');
    const actions = [...role.matchAll(/^\s+(?:Action: |- )(s3:[A-Za-z]+|cloudfront:[A-Za-z]+)$/gm)].map((m) => m[1]);
    expect(actions.sort()).toEqual(['cloudfront:CreateInvalidation', 's3:DeleteObject', 's3:ListBucket', 's3:PutObject'].sort());
  });

  it('defaults the repository to this one and creates the provider once per account', () => {
    expect(site).toMatch(/GitHubRepository:\n\s+Type: String\n\s+Default: edwardtorres\/AWS-Solutions-Architect-Associate\n/);
    expect(site).toMatch(/Url: https:\/\/token\.actions\.githubusercontent\.com/);
    expect(site).toMatch(/CreateOidcProvider: !Equals \[!Ref CreateGitHubOidcProvider, 'true'\]/);
  });
});

describe('the templates carry no account numbers or secrets', () => {
  it.each([
    ['site', site],
    ['cert', cert],
  ])('%s has no 12-digit number and no ARN with digits in the account position', (_name, text) => {
    expect(text).not.toMatch(/\b\d{12}\b/);
    expect(text).not.toMatch(/arn:aws[a-z-]*:[a-z0-9-]*:[a-z0-9-]*:\d+:/);
  });

  it('tags the taggable resources with the cost-tag key the budget filters on', () => {
    expect(site.match(/Key: Project\n\s+Value: saa-region-builder/g)?.length).toBeGreaterThanOrEqual(5);
    expect(site).toMatch(/TagKeyValue:\n\s+- 'user:Project\$saa-region-builder'/);
    expect(cert).toMatch(/Key: Project\n\s+Value: saa-region-builder/);
  });
});
