import { describe, expect, it } from 'vitest';
import { BOTH_SIDES, IMPLICIT, SEVERAL, def, principalArn, rules, type Policy, type Req, type Statement } from './def';
import { scenarios } from './index';

// ───────────── builders ─────────────
const allow = (Action: string | string[], Resource: string | string[], extra: Partial<Statement> = {}): Statement => ({ Effect: 'Allow', Action, Resource, ...extra });
const deny = (Action: string | string[], Resource: string | string[], extra: Partial<Statement> = {}): Statement => ({ Effect: 'Deny', Action, Resource, ...extra });
const pol = (id: string, kind: Policy['kind'], statements: Statement[], account?: string): Policy => ({ id, kind, label: id, statements, ...(account ? { account } : {}) });
const user = (account: string, name: string, extra: Partial<Req['principal']> = {}): Req['principal'] => ({ type: 'user', account, name, ...extra });
const role = (account: string, name: string, session = 's1', extra: Partial<Req['principal']> = {}): Req['principal'] => ({ type: 'role', account, name, session, ...extra });
const BUCKET = 'arn:aws:s3:::amzn-s3-demo-bucket';
const req = (principal: Req['principal'], action: string, arn: string, account: string, context: Partial<Req['context']> = {}, kind?: 'role-trust' | 'key-policy'): Req => ({
  principal,
  action,
  resource: { arn, account, ...(kind ? { kind } : {}) },
  context: { secureTransport: true, ...context },
});
const run = (request: Req, policies: Policy[]) => def.evaluate({ request, policies });
const res = (request: Req, policies: Policy[]) => {
  const e = run(request, policies);
  return e ? { decision: e.answer.decision![0], decider: e.answer.decider![0] } : null;
};
const covered = new Set<string>();
const tag = (...ids: string[]) => ids.forEach((i) => covered.add(i));
const FULL = allow('*', '*');

const same = (principal: Req['principal'], action = 's3:GetObject', arn = `${BUCKET}/k`) => req(principal, action, arn, principal.account);

// ───────────── cases lifted from AWS documentation ─────────────
describe('AWS documentation examples', () => {
  // IAM User Guide, "Policy evaluation for requests within a single account" (reference_policies_evaluation-logic_policy-eval-basics.html)
  const carlosIdentity = pol('identity', 'identity', [
    allow(['s3:GetBucketLocation', 's3:ListAllMyBuckets'], 'arn:aws:s3:::*'),
    allow('s3:*', ['arn:aws:s3:::amzn-s3-demo-bucket-carlossalazar/*', 'arn:aws:s3:::amzn-s3-demo-bucket-carlossalazar']),
    deny('s3:*', 'arn:aws:s3:::*log*'),
  ]);
  const carlosBucket = pol('bucket', 'resource', [
    allow('s3:*', ['arn:aws:s3:::amzn-s3-demo-bucket-carlossalazar/*', 'arn:aws:s3:::amzn-s3-demo-bucket-carlossalazar'], { Principal: { AWS: 'arn:aws:iam::ACCT_MAIN:user/carlossalazar' } }),
  ]);
  it('Carlos saving to the logs bucket is denied by his own Deny', () => {
    tag('explicit-deny', 'resource-wildcard');
    expect(res(same(user('ACCT_MAIN', 'carlossalazar'), 's3:PutObject', 'arn:aws:s3:::amzn-s3-demo-bucket-carlossalazar-logs/x.txt'), [carlosIdentity])).toEqual({ decision: 'deny', decider: 'identity' });
  });
  it('Carlos saving to his own bucket: both policies allow', () => {
    tag('same-account-union', 'boundary-user-resource');
    expect(res(same(user('ACCT_MAIN', 'carlossalazar'), 's3:PutObject', 'arn:aws:s3:::amzn-s3-demo-bucket-carlossalazar/x.txt'), [carlosIdentity, carlosBucket])).toEqual({ decision: 'allow', decider: SEVERAL });
  });
  it('the bucket policy alone is enough inside one account', () => {
    tag('same-account-union');
    const only = pol('identity', 'identity', [allow('ec2:Describe*', '*')]);
    expect(res(same(user('ACCT_MAIN', 'carlossalazar'), 's3:PutObject', 'arn:aws:s3:::amzn-s3-demo-bucket-carlossalazar/x.txt'), [only, carlosBucket])).toEqual({ decision: 'allow', decider: 'bucket' });
  });

  // IAM User Guide, "Cross-account policy evaluation logic" (reference_policies_evaluation-logic-cross-account.html)
  const demoIdentity = pol('identity', 'identity', [
    allow('s3:ListAllMyBuckets', '*'),
    allow('s3:*Object*', 'arn:aws:s3:::amzn-s3-demo-bucket-production/*'),
    deny('s3:*', ['arn:aws:s3:::*log*', 'arn:aws:s3:::*log*/*']),
  ]);
  const prodBucket = pol('bucket', 'resource', [
    allow(['s3:GetObject*', 's3:PutObject*', 's3:ReplicateObject', 's3:RestoreObject'], 'arn:aws:s3:::amzn-s3-demo-bucket-production/*', { Principal: { AWS: 'arn:aws:iam::ACCT_DEV:role/Demo' } }),
  ]);
  const demo = role('ACCT_DEV', 'Demo', 'carlos');
  it('Demo saving to the production-logs bucket is denied in its own account', () => {
    tag('cross-identity', 'explicit-deny');
    expect(res(req(demo, 's3:PutObject', 'arn:aws:s3:::amzn-s3-demo-bucket-production-logs/x', 'ACCT_PROD'), [demoIdentity])).toEqual({ decision: 'deny', decider: 'identity' });
  });
  it('Demo saving to the production bucket needs and has both sides', () => {
    tag('cross-both', 'cross-resource', 'cross-identity', 'principal-session');
    expect(res(req(demo, 's3:PutObject', 'arn:aws:s3:::amzn-s3-demo-bucket-production/x', 'ACCT_PROD'), [demoIdentity, prodBucket])).toEqual({ decision: 'allow', decider: BOTH_SIDES });
  });
  it('Demo can create and edit but not delete', () => {
    expect(res(req(demo, 's3:DeleteObject', 'arn:aws:s3:::amzn-s3-demo-bucket-production/x', 'ACCT_PROD'), [demoIdentity, prodBucket])).toEqual({ decision: 'deny', decider: 'bucket' });
  });

  // IAM User Guide, "Permissions boundaries for IAM entities" (access_policies_boundaries.html): Shirley and Nikhil
  const shirleyBoundary = pol('boundary', 'boundary', [allow(['s3:*', 'cloudwatch:*', 'ec2:*'], '*')]);
  it('Shirley cannot create a user: the boundary does not allow iam:CreateUser', () => {
    tag('boundary-limits');
    const r = same(user('ACCT_MAIN', 'Shirley'), 'iam:CreateUser', 'arn:aws:iam::ACCT_MAIN:user/new');
    expect(res(r, [pol('identity', 'identity', [allow('iam:CreateUser', '*')]), shirleyBoundary])).toEqual({ decision: 'deny', decider: 'boundary' });
  });
  it('the same policies allow an Amazon S3 action that the boundary also allows', () => {
    tag('boundary-intersect');
    expect(res(same(user('ACCT_MAIN', 'Shirley')), [pol('identity', 'identity', [allow('s3:GetObject', '*')]), shirleyBoundary])).toEqual({ decision: 'allow', decider: 'identity' });
  });
  const nikhilBoundary = pol('boundary', 'boundary', [
    allow(['s3:*', 'cloudwatch:*', 'ec2:*', 'dynamodb:*'], '*'),
    deny('s3:*', ['arn:aws:s3:::logs', 'arn:aws:s3:::logs/*']),
  ]);
  const nikhil = user('ACCT_MAIN', 'Nikhil');
  it('Nikhil: a bucket policy cannot override the boundary Deny on the logs bucket', () => {
    const bucket = pol('bucket', 'resource', [allow('s3:PutObject', 'arn:aws:s3:::logs/*', { Principal: { AWS: 'arn:aws:iam::ACCT_MAIN:user/Nikhil' } })]);
    expect(res(same(nikhil, 's3:PutObject', 'arn:aws:s3:::logs/a'), [pol('identity', 'identity', [allow(['s3:Get*'], '*')]), nikhilBoundary, bucket])).toEqual({ decision: 'deny', decider: 'boundary' });
  });
  it('Nikhil: a secret policy that names him works despite the implicit deny in the boundary', () => {
    tag('boundary-user-resource');
    const secret = pol('secret', 'resource', [allow('secretsmanager:GetSecretValue', '*', { Principal: { AWS: 'arn:aws:iam::ACCT_MAIN:user/Nikhil' } })]);
    expect(res(same(nikhil, 'secretsmanager:GetSecretValue', 'arn:aws:secretsmanager:us-east-1:ACCT_MAIN:secret:s'), [pol('identity', 'identity', [allow('s3:Get*', '*')]), nikhilBoundary, secret])).toEqual({ decision: 'allow', decider: 'secret' });
  });

  // Organizations User Guide, "SCP evaluation" (orgs_manage_policies_scps_evaluation.html): scenarios 2, 3 and 6
  const idAll = pol('identity', 'identity', [FULL]);
  const member = user('ACCT_WORK', 'u', { orgId: 'o-x' });
  const scp = (id: string, ...st: Statement[]) => pol(id, 'scp', st, 'ACCT_WORK');
  it('scenario 2: an OU policy that allows only EC2 blocks Amazon S3', () => {
    tag('scp-every-level');
    expect(res(same(member), [idAll, scp('root', FULL), scp('ou', allow('ec2:*', '*')), scp('acct', FULL)])).toEqual({ decision: 'deny', decider: 'ou' });
    expect(res(same(member, 'ec2:RunInstances', 'arn:aws:ec2:us-east-1:ACCT_WORK:instance/i-1'), [idAll, scp('root', FULL), scp('ou', allow('ec2:*', '*')), scp('acct', FULL)])).toEqual({ decision: 'allow', decider: 'identity' });
  });
  it('scenario 3: a root SCP with only a Deny and no Allow blocks everything', () => {
    tag('scp-no-grant');
    expect(res(same(member, 's3:GetObject'), [idAll, scp('root', deny('ec2:*', '*'))])).toEqual({ decision: 'deny', decider: 'root' });
  });
  it('scenario 6: a root Deny wins over an Allow lower in the tree', () => {
    tag('scp-deny-any-level');
    expect(res(same(member), [idAll, scp('root', FULL, deny('s3:*', '*')), scp('ou', allow('s3:*', '*'))])).toEqual({ decision: 'deny', decider: 'root' });
  });

  // IAM User Guide, "AWS global condition context keys" (reference_policies_condition-keys.html): MFA and organization examples
  it('Deny with BoolIfExists false denies requests made with long-term keys (no MFA key)', () => {
    tag('cond-ifexists');
    const p = pol('identity', 'identity', [FULL, deny('*', '*', { Condition: { BoolIfExists: { 'aws:MultiFactorAuthPresent': 'false' } } })]);
    expect(res(same(user('A1', 'u')), [p])).toEqual({ decision: 'deny', decider: 'identity' });
    expect(res(req(user('A1', 'u'), 's3:GetObject', `${BUCKET}/k`, 'A1', { mfa: true }), [p])).toEqual({ decision: 'allow', decider: 'identity' });
    expect(res(req(user('A1', 'u'), 's3:GetObject', `${BUCKET}/k`, 'A1', { mfa: false }), [p])).toEqual({ decision: 'deny', decider: 'identity' });
  });
  it('Deny with Bool false does not catch requests where the MFA key is absent (the documented warning)', () => {
    tag('cond-mfa', 'cond-missing-key', 'cond-bool');
    const p = pol('identity', 'identity', [FULL, deny('*', '*', { Condition: { Bool: { 'aws:MultiFactorAuthPresent': 'false' } } })]);
    expect(res(same(user('A1', 'u')), [p])).toEqual({ decision: 'allow', decider: 'identity' });
    expect(res(req(user('A1', 'u'), 's3:GetObject', `${BUCKET}/k`, 'A1', { mfa: false }), [p])).toEqual({ decision: 'deny', decider: 'identity' });
  });
  it('Allow with Bool true needs MFA present', () => {
    const p = pol('identity', 'identity', [allow('*', '*', { Condition: { Bool: { 'aws:MultiFactorAuthPresent': 'true' } } })]);
    expect(res(same(user('A1', 'u')), [p])).toEqual({ decision: 'deny', decider: IMPLICIT });
    expect(res(req(user('A1', 'u'), 's3:GetObject', `${BUCKET}/k`, 'A1', { mfa: true }), [p])).toEqual({ decision: 'allow', decider: 'identity' });
  });
  it('bucket policy with Principal * and aws:PrincipalOrgID admits only that organization', () => {
    tag('principal-all', 'cond-orgid', 'cond-string');
    const bucket = pol('bucket', 'resource', [allow('s3:PutObject', `${BUCKET}/*`, { Principal: '*', Condition: { StringEquals: { 'aws:PrincipalOrgID': 'o-exampleorg' } } })]);
    const id = pol('identity', 'identity', [allow('s3:PutObject', '*')]);
    const r = (p: Req['principal']) => req(p, 's3:PutObject', `${BUCKET}/k`, 'ACCT_SHARED');
    expect(res(r(user('ACCT_DEV', 'u', { orgId: 'o-exampleorg' })), [id, bucket])).toEqual({ decision: 'allow', decider: BOTH_SIDES });
    expect(res(r(user('ACCT_DEV', 'u', { orgId: 'o-other' })), [id, bucket])).toEqual({ decision: 'deny', decider: 'bucket' });
    expect(res(r(user('ACCT_OUT', 'u')), [id, bucket])).toEqual({ decision: 'deny', decider: 'bucket' });
  });

  // IAM User Guide, "IAM JSON policy elements: Condition operators" (IP address example table)
  it('IpAddress 203.0.113.0/24 matches 203.0.113.1 and not 198.51.100.1', () => {
    tag('cond-ip');
    const p = pol('identity', 'identity', [allow('s3:GetObject', '*', { Condition: { IpAddress: { 'aws:SourceIp': '203.0.113.0/24' } } })]);
    const r = (ip?: string) => req(user('A1', 'u'), 's3:GetObject', `${BUCKET}/k`, 'A1', ip ? { sourceIp: ip } : {});
    expect(res(r('203.0.113.1'), [p])?.decision).toBe('allow');
    expect(res(r('198.51.100.1'), [p])?.decision).toBe('deny');
    expect(res(r(), [p])).toEqual({ decision: 'deny', decider: IMPLICIT });
  });
  // Same page: the Boolean example (Deny with aws:SecureTransport false)
  it('Deny with aws:SecureTransport false fires only without TLS', () => {
    tag('cond-tls');
    const b = pol('bucket', 'resource', [deny('s3:*', `${BUCKET}/*`, { Principal: '*', Condition: { Bool: { 'aws:SecureTransport': 'false' } } })]);
    const id = pol('identity', 'identity', [allow('s3:*', '*')]);
    expect(res(req(user('A1', 'u'), 's3:GetObject', `${BUCKET}/k`, 'A1', { secureTransport: false }), [id, b])).toEqual({ decision: 'deny', decider: 'bucket' });
    expect(res(same(user('A1', 'u')), [id, b])).toEqual({ decision: 'allow', decider: 'identity' });
  });
});

// ───────────── rules, one by one ─────────────
describe('rules', () => {
  it('implicit deny: nothing allows', () => {
    tag('implicit-deny');
    expect(res(same(user('A1', 'u')), [pol('identity', 'identity', [allow('ec2:*', '*')])])).toEqual({ decision: 'deny', decider: IMPLICIT });
    expect(res(same(user('A1', 'u')), [])).toEqual({ decision: 'deny', decider: IMPLICIT });
  });
  it('explicit deny beats an allow in another policy, in a resource policy too', () => {
    tag('explicit-deny');
    const id = pol('identity', 'identity', [FULL]);
    const b = pol('bucket', 'resource', [deny('s3:*', '*', { Principal: '*' })]);
    expect(res(same(user('A1', 'u')), [id, b])).toEqual({ decision: 'deny', decider: 'bucket' });
  });
  it('action wildcards and case: iam:*AccessKey* and a differently cased pattern', () => {
    tag('action-wildcard', 'action-case');
    const id = pol('identity', 'identity', [allow('iam:*AccessKey*', '*')]);
    expect(res(same(user('A1', 'u'), 'iam:CreateAccessKey', 'arn:aws:iam::A1:user/x'), [id])?.decision).toBe('allow');
    expect(res(same(user('A1', 'u'), 'iam:CreateUser', 'arn:aws:iam::A1:user/x'), [id])?.decision).toBe('deny');
    expect(res(same(user('A1', 'u')), [pol('identity', 'identity', [allow('S3:getobject', '*')])])?.decision).toBe('allow');
  });
  it('resource wildcards expand across slashes', () => {
    tag('resource-wildcard');
    const id = pol('identity', 'identity', [allow('s3:GetObject', `${BUCKET}/*/test/*`)]);
    expect(res(same(user('A1', 'u'), 's3:GetObject', `${BUCKET}/1/2/test/3/o.jpg`), [id])?.decision).toBe('allow');
    expect(res(same(user('A1', 'u'), 's3:GetObject', `${BUCKET}/1/2/o.jpg`), [id])?.decision).toBe('deny');
  });
  it('cross-account: each side alone fails, both together allow', () => {
    tag('cross-identity', 'cross-resource', 'cross-both');
    const id = pol('identity', 'identity', [allow('s3:GetObject', '*')]);
    const b = pol('bucket', 'resource', [allow('s3:GetObject', `${BUCKET}/*`, { Principal: { AWS: 'A1' } })]);
    const r = req(user('A1', 'u'), 's3:GetObject', `${BUCKET}/k`, 'B1');
    expect(res(r, [id, pol('bucket', 'resource', [allow('s3:GetObject', `${BUCKET}/*`, { Principal: { AWS: 'C1' } })])])).toEqual({ decision: 'deny', decider: 'bucket' });
    expect(res(r, [pol('identity', 'identity', [allow('ec2:*', '*')]), b])).toEqual({ decision: 'deny', decider: 'identity' });
    expect(res(r, [pol('identity', 'identity', [allow('ec2:*', '*')]), pol('bucket', 'resource', [allow('s3:Put*', '*', { Principal: { AWS: 'C1' } })])])).toEqual({ decision: 'deny', decider: IMPLICIT });
    // a failing side with no policy to point at is refused
    expect(run(r, [id])).toBeNull();
    expect(run(r, [b])).toBeNull();
    expect(res(r, [id, b])).toEqual({ decision: 'allow', decider: BOTH_SIDES });
  });
  it('cross-account: the resource policy of another account does not name this account', () => {
    const id = pol('identity', 'identity', [allow('s3:GetObject', '*')]);
    const b = pol('bucket', 'resource', [allow('s3:GetObject', `${BUCKET}/*`, { Principal: { AWS: 'C1' } })]);
    expect(res(req(user('A1', 'u'), 's3:GetObject', `${BUCKET}/k`, 'B1'), [id, b])).toEqual({ decision: 'deny', decider: 'bucket' });
  });
  it('cross-account: an explicit Deny in the resource policy wins', () => {
    const id = pol('identity', 'identity', [allow('s3:GetObject', '*')]);
    const b = pol('bucket', 'resource', [allow('s3:GetObject', `${BUCKET}/*`, { Principal: { AWS: 'A1' } }), deny('s3:GetObject', `${BUCKET}/secret/*`, { Principal: '*' })]);
    expect(res(req(user('A1', 'u'), 's3:GetObject', `${BUCKET}/secret/x`, 'B1'), [id, b])).toEqual({ decision: 'deny', decider: 'bucket' });
  });
  it('cross-account: a boundary on the principal limits the identity side', () => {
    tag('boundary-limits');
    const id = pol('identity', 'identity', [allow('s3:GetObject', '*')]);
    const b = pol('bucket', 'resource', [allow('s3:GetObject', `${BUCKET}/*`, { Principal: { AWS: 'A1' } })]);
    const bd = pol('boundary', 'boundary', [allow('ec2:*', '*')]);
    expect(res(req(user('A1', 'u'), 's3:GetObject', `${BUCKET}/k`, 'B1'), [id, b, bd])).toEqual({ decision: 'deny', decider: 'boundary' });
  });
  it('a boundary never grants', () => {
    tag('boundary-limits');
    expect(res(same(user('A1', 'u')), [pol('boundary', 'boundary', [FULL])])).toEqual({ decision: 'deny', decider: IMPLICIT });
  });
  it('role ARN in a resource policy is limited by the boundary; the user ARN is not', () => {
    tag('boundary-role-resource', 'principal-session');
    const bd = pol('boundary', 'boundary', [allow('ec2:*', '*')]);
    const bucket = (arn: string) => pol('bucket', 'resource', [allow('s3:GetObject', `${BUCKET}/*`, { Principal: { AWS: arn } })]);
    expect(res(same(role('A1', 'r')), [bd, bucket('arn:aws:iam::A1:role/r')])).toEqual({ decision: 'deny', decider: 'boundary' });
    expect(res(same(user('A1', 'u')), [bd, bucket('arn:aws:iam::A1:user/u')])).toEqual({ decision: 'allow', decider: 'bucket' });
  });
  it('role ARN in a resource policy is also limited by the session policy', () => {
    tag('boundary-role-resource', 'session-limits');
    const sp = pol('session', 'session', [allow('ec2:*', '*')]);
    const b = pol('bucket', 'resource', [allow('s3:GetObject', `${BUCKET}/*`, { Principal: { AWS: 'arn:aws:iam::A1:role/r' } })]);
    expect(res(same(role('A1', 'r')), [sp, b])).toEqual({ decision: 'deny', decider: 'session' });
  });
  it('a session ARN in a resource policy is granted directly', () => {
    tag('session-direct');
    const sp = pol('session', 'session', [allow('ec2:*', '*')]);
    const bd = pol('boundary', 'boundary', [allow('ec2:*', '*')]);
    const b = pol('bucket', 'resource', [allow('s3:GetObject', `${BUCKET}/*`, { Principal: { AWS: 'arn:aws:sts::A1:assumed-role/r/s1' } })]);
    expect(res(same(role('A1', 'r', 's1')), [sp, bd, b])).toEqual({ decision: 'allow', decider: 'bucket' });
    expect(res(same(role('A1', 'r', 's2')), [sp, bd, b])).toEqual({ decision: 'deny', decider: IMPLICIT });
  });
  it('a session policy limits and never grants', () => {
    tag('session-limits');
    const id = pol('identity', 'identity', [allow('s3:*', '*')]);
    expect(res(same(role('A1', 'r')), [id, pol('session', 'session', [allow('s3:ListBucket', '*')])])).toEqual({ decision: 'deny', decider: 'session' });
    expect(res(same(role('A1', 'r')), [pol('identity', 'identity', [allow('ec2:*', '*')]), pol('session', 'session', [allow('s3:*', '*')])])).toEqual({ decision: 'deny', decider: IMPLICIT });
    expect(res(same(role('A1', 'r')), [id, pol('session', 'session', [allow('s3:GetObject', '*')])])).toEqual({ decision: 'allow', decider: 'identity' });
  });
  it('an explicit Deny in a session policy wins', () => {
    const id = pol('identity', 'identity', [allow('s3:*', '*')]);
    expect(res(same(role('A1', 'r')), [id, pol('session', 'session', [FULL, deny('s3:GetObject', '*')])])).toEqual({ decision: 'deny', decider: 'session' });
  });
  it('SCPs: no grant, management account exempt, other accounts not governed', () => {
    tag('scp-no-grant', 'scp-management', 'scp-scope');
    const s = (acct: string) => pol('scp', 'scp', [FULL], acct);
    expect(res(same(user('A1', 'u', { orgId: 'o' })), [s('A1')])).toEqual({ decision: 'deny', decider: IMPLICIT });
    const denyAll = pol('scp', 'scp', [FULL, deny('s3:*', '*')], 'A1');
    const id = pol('identity', 'identity', [allow('s3:*', '*')]);
    expect(res(same(user('A1', 'u', { orgId: 'o' })), [id, denyAll])).toEqual({ decision: 'deny', decider: 'scp' });
    expect(res(same(user('A1', 'u', { orgId: 'o', managementAccount: true })), [id, denyAll])).toEqual({ decision: 'allow', decider: 'identity' });
    const other = pol('scp', 'scp', [FULL, deny('s3:*', '*')], 'B1');
    const b = pol('bucket', 'resource', [allow('s3:GetObject', `${BUCKET}/*`, { Principal: { AWS: 'A1' } })]);
    const id2 = pol('identity', 'identity', [allow('s3:GetObject', '*')]);
    expect(res(req(user('A1', 'u'), 's3:GetObject', `${BUCKET}/k`, 'B1'), [id2, b, other])).toEqual({ decision: 'allow', decider: BOTH_SIDES });
  });
  it('an SCP applies to the principal side of a cross-account request', () => {
    tag('scp-every-level');
    const b = pol('bucket', 'resource', [allow('s3:GetObject', `${BUCKET}/*`, { Principal: { AWS: 'A1' } })]);
    const id = pol('identity', 'identity', [allow('s3:GetObject', '*')]);
    const own = pol('scp', 'scp', [allow('ec2:*', '*')], 'A1');
    expect(res(req(user('A1', 'u', { orgId: 'o' }), 's3:GetObject', `${BUCKET}/k`, 'B1'), [id, b, own])).toEqual({ decision: 'deny', decider: 'scp' });
  });
  it('SCP Allow statements may only name "*" as Resource', () => {
    tag('scp-allow-resource');
    const id = pol('identity', 'identity', [allow('s3:*', '*')]);
    expect(run(same(user('A1', 'u', { orgId: 'o' })), [id, pol('scp', 'scp', [allow('s3:*', 'arn:aws:s3:::x/*')], 'A1')])).toBeNull();
    expect(run(same(user('A1', 'u', { orgId: 'o' })), [id, pol('scp', 'scp', [allow('s3:*', ['*'])], 'A1')])).not.toBeNull();
  });
  it('principal forms: account id, account root ARN, partial wildcards refused', () => {
    tag('principal-account', 'principal-partial');
    const id = pol('identity', 'identity', [allow('s3:GetObject', '*')]);
    const mk = (p: string) => pol('bucket', 'resource', [allow('s3:GetObject', `${BUCKET}/*`, { Principal: { AWS: p } })]);
    const r = req(user('A1', 'u'), 's3:GetObject', `${BUCKET}/k`, 'B1');
    expect(res(r, [id, mk('A1')])?.decision).toBe('allow');
    expect(res(r, [id, mk('arn:aws:iam::A1:root')])?.decision).toBe('allow');
    expect(res(r, [id, mk('B2')])?.decision).toBe('deny');
    expect(run(r, [id, mk('arn:aws:iam::A1:user/*')])).toBeNull();
  });
  it('identity-based policies have no Principal', () => {
    tag('principal-identity');
    expect(run(same(user('A1', 'u')), [pol('identity', 'identity', [allow('s3:*', '*', { Principal: '*' })])])).toBeNull();
    expect(run(same(user('A1', 'u')), [pol('bucket', 'resource', [allow('s3:*', '*')])])).toBeNull();
  });
  it('trust policies: an identity-based allow alone is not enough in one account', () => {
    tag('trust-exception');
    const target = 'arn:aws:iam::A1:role/deployer';
    const r = req(user('A1', 'u'), 'sts:AssumeRole', target, 'A1', {}, 'role-trust');
    const id = pol('identity', 'identity', [allow('sts:AssumeRole', '*')]);
    const trust = (p: string): Policy => pol('trust', 'resource', [{ Effect: 'Allow', Action: 'sts:AssumeRole', Principal: { AWS: p } }]);
    const named = trust('arn:aws:iam::A1:user/u');
    const other = trust('arn:aws:iam::A1:user/v');
    expect(res(r, [id, other])).toEqual({ decision: 'deny', decider: 'trust' });
    // a trust policy has no Resource element
    expect(run(r, [id, pol('trust', 'resource', [allow('sts:AssumeRole', '*', { Principal: { AWS: 'arn:aws:iam::A1:user/u' } })])])).toBeNull();
    expect(res(r, [id, named])).toEqual({ decision: 'allow', decider: 'trust' });
    // naming the whole account in a same-account trust policy is not settled by the cited pages
    expect(run(r, [id, trust('A1')])).toBeNull();
  });
  it('a key policy behaves like a trust policy', () => {
    tag('trust-exception');
    const r = req(user('A1', 'u'), 'kms:Decrypt', 'arn:aws:kms:us-east-1:A1:key/k1', 'A1', {}, 'key-policy');
    const id = pol('identity', 'identity', [allow('kms:*', '*')]);
    const key = pol('key', 'resource', [allow('kms:Decrypt', '*', { Principal: { AWS: 'arn:aws:iam::A1:user/other' } })]);
    expect(res(r, [id, key])).toEqual({ decision: 'deny', decider: 'key' });
  });
  it('conditions: missing key, IfExists, string equality, CIDR edges', () => {
    tag('cond-missing-key', 'cond-ifexists', 'cond-string', 'cond-ip');
    const mk = (cond: Statement['Condition']) => [pol('identity', 'identity', [allow('s3:*', '*', { Condition: cond })])];
    const r = (c: Partial<Req['context']>, p = user('A1', 'u')) => req(p, 's3:GetObject', `${BUCKET}/k`, 'A1', c);
    expect(res(r({}), mk({ BoolIfExists: { 'aws:MultiFactorAuthPresent': 'true' } }))?.decision).toBe('allow');
    expect(res(r({ mfa: false }), mk({ BoolIfExists: { 'aws:MultiFactorAuthPresent': 'true' } }))?.decision).toBe('deny');
    expect(res(r({}, user('A1', 'u', { orgId: 'o-1' })), mk({ StringEquals: { 'aws:PrincipalOrgID': 'o-1' } }))?.decision).toBe('allow');
    expect(res(r({}, user('A1', 'u', { orgId: 'O-1' })), mk({ StringEquals: { 'aws:PrincipalOrgID': 'o-1' } }))?.decision).toBe('deny');
    expect(res(r({ sourceIp: '10.0.0.1' }), mk({ IpAddress: { 'aws:SourceIp': '10.0.0.1/32' } }))?.decision).toBe('allow');
    expect(res(r({ sourceIp: '10.0.0.2' }), mk({ IpAddress: { 'aws:SourceIp': '10.0.0.1/32' } }))?.decision).toBe('deny');
    expect(res(r({ sourceIp: '8.8.8.8' }), mk({ IpAddress: { 'aws:SourceIp': '0.0.0.0/0' } }))?.decision).toBe('allow');
    expect(res(r({ sourceIp: '203.0.113.200' }), mk({ NotIpAddress: { 'aws:SourceIp': '203.0.113.0/24' } }))?.decision).toBe('deny');
    expect(res(r({ sourceIp: '198.51.100.1' }), mk({ NotIpAddress: { 'aws:SourceIp': '203.0.113.0/24' } }))?.decision).toBe('allow');
    expect(res(r({}), mk({ Bool: { 'aws:SecureTransport': 'true' } }))?.decision).toBe('allow');
  });
  it('condition key names are not case sensitive', () => {
    const p = [pol('identity', 'identity', [allow('s3:*', '*', { Condition: { Bool: { 'AWS:securetransport': 'true' } } })])];
    expect(res(same(user('A1', 'u')), p)?.decision).toBe('allow');
  });
  it('the decider is the single limiter that blocks an otherwise granted request', () => {
    const id = pol('identity', 'identity', [allow('s3:*', '*')]);
    const bd = pol('boundary', 'boundary', [allow('s3:*', '*')]);
    const sp = pol('session', 'session', [allow('ec2:*', '*')]);
    expect(res(same(role('A1', 'r')), [id, bd, sp])).toEqual({ decision: 'deny', decider: 'session' });
  });
  it('G3: user and session notes only appear when a boundary or session policy exists', () => {
    const b = pol('bucket', 'resource', [allow('s3:GetObject', `${BUCKET}/*`, { Principal: { AWS: 'arn:aws:iam::A1:user/u' } })]);
    const rules1 = run(same(user('A1', 'u')), [b])!.trace.map((t) => t.rule);
    expect(rules1).not.toContain('boundary-user-resource');
    expect(run(same(user('A1', 'u')), [b, pol('boundary', 'boundary', [FULL])])!.trace.map((t) => t.rule)).toContain('boundary-user-resource');
  });
  it('SCPs, wildcards and IP syntax', () => {
    tag('scp-no-principal', 'resource-wildcard-colon', 'cond-cidr', 'cond-ip-operators');
    expect(run(same(user('A1', 'u', { orgId: 'o' })), [pol('s', 'scp', [allow('*', '*', { Principal: '*' })], 'A1')])).toBeNull();
    const id = (arn: string) => [pol('identity', 'identity', [allow('s3:GetObject', arn)])];
    expect(res(same(user('A1', 'u'), 's3:GetObject', 'arn:aws:s3:::b/k'), id('arn:aws:s3:::b*'))?.decision).toBe('allow'); // last char of the segment may run on
    expect(res(same(user('A1', 'u'), 'ec2:StartInstances', 'arn:aws:ec2:us-east-1:A1:instance/i-1'), [pol('identity', 'identity', [allow('ec2:*', 'arn:aws:ec2:*:A1:instance/*')])])?.decision).toBe('allow');
    expect(res(same(user('A1', 'u'), 'ec2:StartInstances', 'arn:aws:ec2:us-east-1:B1:instance/i-1'), [pol('identity', 'identity', [allow('ec2:*', 'arn:aws:ec2:*:A1:instance/*')])])?.decision).toBe('deny');
    expect(run(same(user('A1', 'u'), 'ec2:StartInstances', 'arn:aws:ec2:us-east-1:A1:instance/i-1'), [pol('identity', 'identity', [allow('ec2:*', 'arn:aws:ec2:*1:A1:instance/*')])])).toBeNull(); // * in the middle of a segment is refused
  });
  it('every listed rule is exercised by a test above', () => {
    const missing = rules.map((r) => r.id).filter((id) => !covered.has(id));
    expect(missing).toEqual([]);
  });
});

// ───────────── refusals ─────────────
describe('refusals (null)', () => {
  const idWith = (st: Statement) => [pol('identity', 'identity', [st])];
  const r = same(user('A1', 'u'));
  it('NotAction, NotResource and NotPrincipal', () => {
    expect(run(r, idWith({ Effect: 'Allow', NotAction: 's3:*', Resource: '*' }))).toBeNull();
    expect(run(r, idWith({ Effect: 'Allow', Action: 's3:*', NotResource: 'x' }))).toBeNull();
    expect(run(r, [pol('bucket', 'resource', [{ Effect: 'Deny', Action: 's3:*', Resource: '*', NotPrincipal: { AWS: 'A1' } }])])).toBeNull();
  });
  it('policy variables and ? wildcards', () => {
    expect(run(r, idWith(allow('s3:*', 'arn:aws:s3:::b/${aws:username}/*')))).toBeNull();
    expect(run(r, idWith(allow('s3:Get?bject', '*')))).toBeNull();
    expect(run(r, idWith(allow('s3:*', 'arn:aws:s3:::b?')))).toBeNull();
  });
  it('other condition keys, other operators, several conditions, several values', () => {
    expect(run(r, idWith(allow('s3:*', '*', { Condition: { StringEquals: { 'aws:username': 'u' } } })))).toBeNull();
    expect(run(r, idWith(allow('s3:*', '*', { Condition: { StringLike: { 'aws:PrincipalOrgID': 'o-*' } } })))).toBeNull();
    expect(run(r, idWith(allow('s3:*', '*', { Condition: { Bool: { 'aws:SecureTransport': 'true', 'aws:MultiFactorAuthPresent': 'true' } } })))).toBeNull();
    expect(run(r, idWith(allow('s3:*', '*', { Condition: { Bool: { 'aws:SecureTransport': 'true' }, IpAddress: { 'aws:SourceIp': '1.2.3.0/24' } } })))).toBeNull();
    expect(run(r, idWith(allow('s3:*', '*', { Condition: { Bool: { 'aws:SecureTransport': ['true'] as unknown as string } } })))).toBeNull();
    expect(run(r, idWith(allow('s3:*', '*', { Condition: { Bool: { 'aws:SecureTransport': 'yes' } } })))).toBeNull();
    expect(run(r, idWith(allow('s3:*', '*', { Condition: { Null: { 'aws:SecureTransport': 'false' } } })))).toBeNull();
  });
  it('aws:SourceIp: IPv6 and NotIpAddress with a missing key are not settled', () => {
    const v6 = req(user('A1', 'u'), 's3:GetObject', `${BUCKET}/k`, 'A1', { sourceIp: '2001:db8::1' });
    expect(run(v6, idWith(allow('s3:*', '*')))).toBeNull();
    expect(run(r, idWith(allow('s3:*', '*', { Condition: { IpAddress: { 'aws:SourceIp': '2001:DB8:1234:5678::/64' } } })).concat([]))).not.toBeNull(); // no source IP in the request: IpAddress is simply false
    const withIp = req(user('A1', 'u'), 's3:GetObject', `${BUCKET}/k`, 'A1', { sourceIp: '203.0.113.5' });
    expect(run(withIp, idWith(allow('s3:*', '*', { Condition: { IpAddress: { 'aws:SourceIp': '2001:DB8::/64' } } })))).toBeNull();
    expect(run(r, idWith(deny('s3:*', '*', { Condition: { NotIpAddress: { 'aws:SourceIp': '203.0.113.0/24' } } })))).toBeNull();
  });
  it('resource policy problems', () => {
    expect(run(r, [pol('b', 'resource', [{ Effect: 'Allow', Action: 's3:*', Resource: '*' }])])).toBeNull(); // no Principal
    expect(run(r, [pol('b', 'resource', [allow('s3:*', '*', { Principal: { AWS: 'arn:aws:iam::A1:user/*' } })])])).toBeNull();
    expect(run(r, [pol('b', 'resource', [allow('s3:*', '*', { Principal: { AWS: 'arn:aws:iam::A1:role/dev-*' } })])])).toBeNull();
    expect(run(r, [pol('b', 'resource', [allow('s3:*', '*', { Principal: { Service: 'sns.amazonaws.com' } as unknown as { AWS: string } })])])).toBeNull();
    expect(run(r, [pol('b', 'resource', [allow('s3:*', '*', { Principal: '*' })]), pol('b2', 'resource', [allow('s3:*', '*', { Principal: '*' })])])).toBeNull();
  });
  it('structure problems', () => {
    expect(run(r, [pol('a', 'boundary', [FULL]), pol('b', 'boundary', [FULL])])).toBeNull();
    expect(run(same(role('A1', 'r')), [pol('a', 'session', [FULL]), pol('b', 'session', [FULL])])).toBeNull();
    expect(run(r, [pol('a', 'session', [FULL])])).toBeNull(); // session policy for a user
    expect(run(r, [pol('a', 'scp', [FULL])])).toBeNull(); // SCP without an account
    expect(run(r, [pol('a', 'identity', [FULL]), pol('a', 'identity', [FULL])])).toBeNull(); // duplicate id
    expect(run(r, [pol('implicit', 'identity', [FULL])])).toBeNull(); // reserved id
    expect(run(r, [pol('a', 'identity', [])])).toBeNull();
    expect(run(r, [pol('a', 'identity', [{ Effect: 'Maybe' as 'Allow', Action: '*', Resource: '*' }])])).toBeNull();
    expect(run(r, [pol('a', 'identity', [{ Effect: 'Allow', Resource: '*' }])])).toBeNull();
  });
  it('service-linked roles, federated users, bad requests', () => {
    expect(run(same(role('A1', 'AWSServiceRoleForX')), [pol('a', 'identity', [FULL])])).toBeNull();
    expect(run(same({ type: 'federated' as 'user', account: 'A1', name: 'f' }), [pol('a', 'identity', [FULL])])).toBeNull();
    expect(run(same(role('A1', 'r', '')), [pol('a', 'identity', [FULL])])).toBeNull();
    expect(run(req(user('A1', 'u'), 's3:*', `${BUCKET}/k`, 'A1'), [pol('a', 'identity', [FULL])])).toBeNull();
    expect(run(req(user('A1', 'u'), 's3:GetObject', `${BUCKET}/*`, 'A1'), [pol('a', 'identity', [FULL])])).toBeNull();
    expect(run(req(user('A1', 'u'), 's3:GetObject', `${BUCKET}/k`, 'A1', {}, 'role-trust'), [pol('a', 'identity', [FULL])])).toBeNull(); // trust policy with a non-AssumeRole action
    expect(run(req(user('A1', 'u'), 's3:GetObject', `${BUCKET}/k`, 'A1', { sourceIp: 'not-an-ip' }), [pol('a', 'identity', [FULL])])).toBeNull();
  });
  it('ambiguous deciders', () => {
    // two policies hold a matching Deny
    expect(run(r, [pol('a', 'identity', [deny('s3:*', '*')]), pol('b', 'boundary', [deny('s3:*', '*')])])).toBeNull();
    // cross-account with two identity policies that both allow
    const b = pol('bucket', 'resource', [allow('s3:GetObject', `${BUCKET}/*`, { Principal: { AWS: 'A1' } })]);
    expect(run(req(user('A1', 'u'), 's3:GetObject', `${BUCKET}/k`, 'B1'), [pol('i1', 'identity', [FULL]), pol('i2', 'identity', [FULL]), b])).toBeNull();
    // two limiters must both be lifted
    const rr = same(role('A1', 'r'));
    expect(run(rr, [pol('id', 'identity', [FULL]), pol('bd', 'boundary', [allow('ec2:*', '*')]), pol('sp', 'session', [allow('ec2:*', '*')])])).toBeNull();
  });
  it('account-wide grants next to a boundary or session policy are not settled', () => {
    // identity grants nothing; the bucket policy names the whole account; a boundary exists that does not allow the action
    const bucket = pol('bucket', 'resource', [allow('s3:GetObject', `${BUCKET}/*`, { Principal: { AWS: 'A1' } })]);
    expect(run(r, [pol('identity', 'identity', [allow('ec2:*', '*')]), pol('boundary', 'boundary', [allow('ec2:*', '*')]), bucket])).toBeNull();
    // without a boundary or session policy the union rule settles it
    expect(res(r, [pol('identity', 'identity', [allow('ec2:*', '*')]), bucket])).toEqual({ decision: 'allow', decider: 'bucket' });
    // when an identity-based grant already decides it, the unsettled kind does not matter
    expect(res(r, [pol('identity', 'identity', [allow('s3:*', '*')]), pol('boundary', 'boundary', [allow('s3:*', '*')]), bucket])).toEqual({ decision: 'allow', decider: SEVERAL });
  });
});

// ───────────── content and plumbing ─────────────
describe('scenario content', () => {
  it('has at least 18 scenarios and none is refused', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(18);
    for (const s of scenarios) expect(def.evaluate(s.data), s.id).not.toBeNull();
  });
  it('is deterministic', () => {
    for (const s of scenarios) expect(def.evaluate(s.data)).toEqual(def.evaluate(s.data));
  });
  it('every computed answer is one of the field options, and every trace rule exists', () => {
    const ids = new Set(rules.map((x) => x.id));
    for (const s of scenarios) {
      const e = def.evaluate(s.data)!;
      for (const f of def.fields(s.data)) expect(f.options.map((o) => o.id), s.id).toContain(e.answer[f.id]![0]);
      expect(e.trace.length).toBeGreaterThan(0);
      for (const t of e.trace) expect(ids.has(t.rule), `${s.id} ${t.rule}`).toBe(true);
    }
  });
  it('answers are spread: both decisions and several different deciders occur', () => {
    const outs = scenarios.map((s) => def.evaluate(s.data)!.answer);
    const decisions = new Set(outs.map((a) => a.decision![0]));
    expect(decisions).toEqual(new Set(['allow', 'deny']));
    const deciders = new Set(outs.map((a) => (a.decider![0] === 'implicit' || a.decider![0] === 'both-sides' || a.decider![0] === 'several' ? a.decider![0] : 'policy')));
    expect(deciders.size).toBe(4);
    const allows = outs.filter((a) => a.decision![0] === 'allow').length;
    expect(allows / outs.length).toBeGreaterThan(0.3);
    expect(allows / outs.length).toBeLessThan(0.6);
  });
  it('the exhibit shows the request and every policy as code, without 12-digit account ids', () => {
    for (const s of scenarios) {
      const ex = def.exhibit(s.data);
      expect(ex.filter((x) => x.kind === 'code').length, s.id).toBe(s.data.policies.length);
      expect(JSON.stringify(ex), s.id).not.toMatch(/\d{12}/);
    }
  });
  it('principalArn builds user, role and session ARNs', () => {
    expect(principalArn(user('A1', 'u'))).toBe('arn:aws:iam::A1:user/u');
    expect(principalArn({ type: 'role', account: 'A1', name: 'r' })).toBe('arn:aws:iam::A1:role/r');
    expect(principalArn(role('A1', 'r', 's'))).toBe('arn:aws:sts::A1:assumed-role/r/s');
  });
  it('every rule has a source, a long enough quote and a unique id', () => {
    expect(new Set(rules.map((x) => x.id)).size).toBe(rules.length);
    for (const x of rules) {
      expect(x.src.length).toBeGreaterThan(0);
      expect(x.quote.length).toBeGreaterThan(20);
    }
  });
});
