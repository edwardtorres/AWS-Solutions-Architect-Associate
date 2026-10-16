import type { Answer, Evaluation, ExhibitSection, Field, PuzzleDef, Rule } from '../types';

/**
 * Policy Court: predict whether an IAM request is allowed and which policy decided it.
 *
 * Scope of the evaluator (everything else is a refusal, `evaluate` returns null):
 * - Policies: identity-based, resource-based (including a role trust policy and a key policy), one permissions boundary,
 *   one session policy (role sessions only), service control policies (one per organization level).
 * - Principals: IAM user, IAM role session. Requests inside one account or across two accounts.
 * - Wildcard `*` in actions and resources; `*` as the whole Principal. Partial wildcards in a Principal are refused.
 * - Conditions: exactly one operator, one key, one value per statement, from this table only:
 *     aws:SourceIp (IpAddress, NotIpAddress, IPv4 only) · aws:MultiFactorAuthPresent (Bool, BoolIfExists) ·
 *     aws:SecureTransport (Bool) · aws:PrincipalOrgID (StringEquals).
 * - Refused: NotAction, NotResource, NotPrincipal, policy variables, `?` wildcards, other keys or operators, several
 *   conditions in one statement, service-linked roles, resource control policies, federated user principals, more than one
 *   boundary / session policy / resource policy, and every case the cited pages do not settle (see the notes below).
 *
 * "Which policy decided it" is defined as follows:
 * - Deny by an explicit Deny: the policy holding that Deny (exactly one policy may hold a matching Deny).
 * - Deny without an explicit Deny: if removing exactly one limiting policy (a service control policy level that lacks an
 *   Allow, the boundary, or the session policy) would turn the result into Allow, that policy; if no policy grants the
 *   request even without the limiters, "No policy allows it (implicit deny)". Several limiters needed at once is refused.
 * - Allow: the single policy that grants it. If several policies grant it independently inside one account, the option
 *   "several"; across accounts the grant always needs both sides, so the option "both-sides".
 */

export type PolicyKind = 'identity' | 'resource' | 'boundary' | 'scp' | 'session';
export type ResourceKind = 'resource' | 'role-trust' | 'key-policy';

export interface Statement {
  Sid?: string;
  Effect: 'Allow' | 'Deny';
  Principal?: '*' | { AWS: string | string[] };
  Action?: string | string[];
  Resource?: string | string[];
  /** One operator, one key, one value: { IpAddress: { 'aws:SourceIp': '203.0.113.0/24' } } */
  Condition?: Record<string, Record<string, string>>;
  /** Present only so that the evaluator can refuse them. */
  NotAction?: unknown;
  NotResource?: unknown;
  NotPrincipal?: unknown;
}

export interface Policy {
  id: string;
  kind: PolicyKind;
  /** Shown to the player and used as the answer option text. */
  label: string;
  /** Service control policies only: the member account whose organization path this level belongs to. */
  account?: string;
  statements: Statement[];
}

export interface Req {
  principal: {
    type: 'user' | 'role';
    account: string;
    name: string;
    /** Role sessions only. */
    session?: string;
    /** Present when the principal's account is a member of an organization. */
    orgId?: string;
    /** The management account of the organization. */
    managementAccount?: boolean;
  };
  action: string;
  resource: { arn: string; account: string; kind?: ResourceKind };
  context: { sourceIp?: string; mfa?: boolean; secureTransport: boolean };
}

export interface PolicyCourtScenario {
  request: Req;
  policies: Policy[];
}

export const IMPLICIT = 'implicit';
export const SEVERAL = 'several';
export const BOTH_SIDES = 'both-sides';

export const rules: Rule[] = [
  {
    id: 'implicit-deny',
    text: 'A request is denied unless a policy allows it (implicit deny).',
    src: 'iam-eval-denyallow',
    quote: 'By default, all requests are implicitly denied with the exception of the AWS account root user, which has full access.',
  },
  {
    id: 'explicit-deny',
    text: 'One matching explicit Deny in any applicable policy decides the request: Deny. It overrides every Allow.',
    src: 'iam-eval-denyallow',
    quote: 'If the enforcement code finds even one explicit deny that applies, the enforcement code returns a final decision of Deny.',
  },
  {
    id: 'same-account-union',
    text: 'Inside one account an Allow in the identity-based policy, the resource-based policy, or both is enough.',
    src: 'iam-eval-logic',
    quote: 'If an action is allowed by an identity-based policy, a resource-based policy, or both, then AWS allows the action.',
  },
  {
    id: 'cross-identity',
    text: 'Across accounts the principal needs an identity-based Allow in its own account.',
    src: 'iam-cross-account-eval',
    quote: 'That policy must allow them to make a request to the resource in the trusting AccountB.',
  },
  {
    id: 'cross-resource',
    text: 'Across accounts the resource-based policy in the resource account must also allow the principal.',
    src: 'iam-cross-account-eval',
    quote: 'Additionally, the resource-based policy in AccountB must allow the requester in AccountA to access the resource.',
  },
  {
    id: 'cross-both',
    text: 'A cross-account request is allowed only when both accounts allow it.',
    src: 'iam-cross-account-eval',
    quote: 'The request is allowed only if both evaluations return a decision of Allow.',
  },
  {
    id: 'boundary-limits',
    text: 'A permissions boundary only limits what identity-based policies can grant. It never grants.',
    src: 'iam-boundaries',
    quote: "When you use a policy to set the permissions boundary for a user, it limits the user's permissions but does not provide permissions on its own.",
  },
  {
    id: 'boundary-intersect',
    text: 'Identity-based permissions and the boundary combine as an intersection: both must allow.',
    src: 'iam-boundaries',
    quote: 'The effective permissions are the intersection of both policy types.',
  },
  {
    id: 'boundary-user-resource',
    text: 'Same account: a resource-based Allow that names the IAM user ARN is not limited by an implicit deny in the boundary or identity-based policy.',
    src: 'iam-boundaries',
    quote:
      'Within the same account, resource-based policies that grant permissions to an IAM user ARN (that is not an AWS STS federated user principal session) are not limited by an implicit deny in an identity-based policy or permissions boundary.',
  },
  {
    id: 'boundary-role-resource',
    text: 'Same account: a resource-based Allow that names the IAM role ARN is limited by an implicit deny in the boundary or session policy.',
    src: 'iam-boundaries',
    quote: 'IAM role – Resource-based policies that grant permissions to an IAM role ARN are limited by an implicit deny in a permissions boundary or session policy.',
  },
  {
    id: 'session-direct',
    text: 'Same account: a resource-based Allow that names the role session ARN is granted directly to the session and is not limited by the boundary, identity-based or session policy.',
    src: 'iam-boundaries',
    quote: 'Permissions granted directly to a session are not limited by an implicit deny in an identity-based policy, a permissions boundary, or session policy.',
  },
  {
    id: 'session-limits',
    text: 'A session policy only limits the session. It never grants.',
    src: 'iam-policies',
    quote: 'Session policies limit permissions for a created session, but do not grant permissions.',
  },
  {
    id: 'scp-no-grant',
    text: 'A service control policy never grants permissions; it only sets the maximum.',
    src: 'orgs-scps',
    quote: 'SCPs do not grant permissions to the IAM users and IAM roles in your organization.',
  },
  {
    id: 'scp-every-level',
    text: 'Every organization level (root, each OU on the path, the account) needs an Allow in its SCP, or the request is denied.',
    src: 'orgs-scp-eval',
    quote:
      'For a permission to be allowed for a specific account, there must be an explicit Allow statement at every level from the root through each OU in the direct path to the account (including the target account itself).',
  },
  {
    id: 'scp-deny-any-level',
    text: 'A Deny in an SCP at any level of the path denies the request.',
    src: 'orgs-scp-eval',
    quote:
      'For a permission to be denied for a specific account, any SCP from the root through each OU in the direct path to the account (including the target account itself) can deny that permission.',
  },
  {
    id: 'scp-scope',
    text: 'An SCP applies to the principals of the account it governs, not to principals of other accounts.',
    src: 'iam-eval-denyallow',
    quote: 'SCPs apply to principals of the account where the SCPs are attached.',
  },
  {
    id: 'scp-management',
    text: 'SCPs do not affect principals in the organization management account.',
    src: 'orgs-scps',
    quote: "SCPs don't affect users or roles in the management account.",
  },
  {
    id: 'scp-allow-resource',
    text: 'An Allow in an SCP can only name "*" as its Resource.',
    src: 'orgs-scp-syntax',
    quote: 'In statements where the Effect element has a value of Allow, you can specify only "*" in the Resource element of an SCP.',
  },
  {
    id: 'trust-exception',
    text: 'Same account: a role trust policy or key policy must itself allow the principal; an identity-based Allow alone is not enough.',
    src: 'iam-eval-denyallow',
    quote: 'IAM role trust policies and KMS key policies are exceptions to this logic, because they must explicitly allow access for principals.',
  },
  {
    id: 'principal-session',
    text: 'The requester in a role session is the session ARN; a policy naming the role ARN matches that role session.',
    src: 'iam-boundaries',
    quote: 'When you assume a role and make a request, the principal making the request is the IAM role session ARN and not the ARN of the role itself.',
  },
  {
    id: 'principal-account',
    text: 'An account ID or the account root ARN as Principal delegates to every principal of that account.',
    src: 'iam-el-principal',
    quote: 'The account ARN and the shortened account ID behave the same way.',
  },
  {
    id: 'principal-all',
    text: 'Principal "*" matches every principal.',
    src: 'iam-el-principal',
    quote: 'You can use a wildcard (*) to specify all principals in the Principal element of a resource-based policy or in condition keys that support principals.',
  },
  {
    id: 'principal-partial',
    text: 'A Principal cannot use a wildcard for part of a name or ARN, so such a policy is refused.',
    src: 'iam-el-principal',
    quote: 'You cannot use a wildcard to match part of a principal name or ARN.',
  },
  {
    id: 'principal-identity',
    text: 'Identity-based policies, boundaries, session policies and SCPs have no Principal element.',
    src: 'iam-el-principal',
    quote: 'You cannot use the Principal element in an identity-based policy.',
  },
  {
    id: 'action-wildcard',
    text: 'Actions may use * as a wildcard inside the action name.',
    src: 'iam-el-action',
    quote: 'You can also use wildcards (* or ?) as part of the action name.',
  },
  {
    id: 'action-case',
    text: 'Action prefix and name are not case sensitive.',
    src: 'iam-el-action',
    quote: 'The prefix and the action name are case insensitive.',
  },
  {
    id: 'resource-wildcard',
    text: 'In a Resource ARN, * stands for any run of characters, including / and :.',
    src: 'iam-el-resource',
    quote: 'The asterisk (*) character can expand to replace everything within a segment, including characters like a forward slash (/) that may otherwise appear to be a delimiter within a given service namespace.',
  },
  {
    id: 'cond-missing-key',
    text: 'A condition whose key is missing from the request is false (except ...IfExists).',
    src: 'iam-cond-operators',
    quote: 'If the key that you specify in a policy condition is not present in the request context, the values do not match and the condition is false.',
  },
  {
    id: 'cond-ifexists',
    text: 'With an ...IfExists operator a missing key makes the condition true.',
    src: 'iam-cond-operators',
    quote: 'If the key is not present, evaluate the condition element as true.',
  },
  {
    id: 'cond-ip',
    text: 'IpAddress matches when aws:SourceIp lies in the CIDR range; NotIpAddress matches when it does not.',
    src: 'iam-cond-operators',
    quote: 'The aws:SourceIp condition key resolves to the IP address that the request originates from.',
  },
  {
    id: 'cond-mfa',
    text: 'aws:MultiFactorAuthPresent is absent for requests made with long-term access keys.',
    src: 'iam-global-condition-keys',
    quote: 'The aws:MultiFactorAuthPresent key is not present when an API or CLI command is called with long-term credentials, such as user access key pairs.',
  },
  {
    id: 'cond-bool',
    text: 'Bool compares a key with true or false.',
    src: 'iam-cond-operators',
    quote: 'Boolean conditions let you construct Condition elements that restrict access based on comparing a key to true or false.',
  },
  {
    id: 'cond-tls',
    text: 'aws:SecureTransport is false when the request was not sent over TLS.',
    src: 'iam-global-condition-keys',
    quote: 'Use this key to check whether the request was sent using TLS.',
  },
  {
    id: 'cond-orgid',
    text: 'aws:PrincipalOrgID is present only for principals in an organization member account; StringEquals compares it exactly.',
    src: 'iam-global-condition-keys',
    quote: 'This key is included in the request context only if the principal is a member of an organization.',
  },
  {
    id: 'cond-string',
    text: 'StringEquals is an exact, case-sensitive match.',
    src: 'iam-cond-operators',
    quote: 'StringEquals Exact matching, case sensitive',
  },
];

// ───────────────────────── helpers ─────────────────────────

const list = (v: string | string[] | undefined): string[] | null => (v === undefined ? null : Array.isArray(v) ? v : [v]);

const globToRegExp = (pattern: string, flags: string): RegExp =>
  new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\?]/g, '\\$&').replace(/\*/g, '.*')}$`, flags);

const ACTION_RE = /^(\*|[A-Za-z0-9-]+:[A-Za-z0-9*]+)$/;
const ACCOUNT_RE = /^[A-Za-z0-9_-]+$/;

type PrincipalMatch = 'all' | 'account' | 'user' | 'role' | 'session';

type Parsed = { kind: 'all' } | { kind: 'account'; account: string } | { kind: 'user' | 'role'; account: string; name: string } | { kind: 'session'; account: string; name: string; session: string };

function parsePrincipal(s: string): Parsed | null {
  if (s === '*') return { kind: 'all' };
  if (s.includes('*') || s.includes('?') || s.includes('$')) return null;
  let m = /^arn:aws:iam::([A-Za-z0-9_-]+):root$/.exec(s);
  if (m) return { kind: 'account', account: m[1]! };
  m = /^arn:aws:iam::([A-Za-z0-9_-]+):(user|role)\/([A-Za-z0-9._+=,@-]+)$/.exec(s);
  if (m) return { kind: m[2] as 'user' | 'role', account: m[1]!, name: m[3]! };
  m = /^arn:aws:sts::([A-Za-z0-9_-]+):assumed-role\/([A-Za-z0-9._+=,@-]+)\/([A-Za-z0-9._+=,@-]+)$/.exec(s);
  if (m) return { kind: 'session', account: m[1]!, name: m[2]!, session: m[3]! };
  if (ACCOUNT_RE.test(s)) return { kind: 'account', account: s };
  return null;
}

export const principalArn = (p: Req['principal']): string =>
  p.type === 'user'
    ? `arn:aws:iam::${p.account}:user/${p.name}`
    : p.session
      ? `arn:aws:sts::${p.account}:assumed-role/${p.name}/${p.session}`
      : `arn:aws:iam::${p.account}:role/${p.name}`;

function matchPrincipal(parsed: Parsed, p: Req['principal']): PrincipalMatch | null {
  switch (parsed.kind) {
    case 'all':
      return 'all';
    case 'account':
      return parsed.account === p.account ? 'account' : null;
    case 'user':
      return p.type === 'user' && parsed.account === p.account && parsed.name === p.name ? 'user' : null;
    case 'role':
      return p.type === 'role' && parsed.account === p.account && parsed.name === p.name ? 'role' : null;
    case 'session':
      return p.type === 'role' && parsed.account === p.account && parsed.name === p.name && parsed.session === p.session ? 'session' : null;
  }
}

const ipv4 = (s: string): number | null => {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((n) => n > 255)) return null;
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
};

function inCidr(ip: string, cidr: string): boolean | null {
  const [base, bitsText, extra] = cidr.split('/');
  if (extra !== undefined) return null;
  const a = ipv4(ip);
  const b = ipv4(base ?? '');
  if (a === null || b === null) return null;
  const bits = bitsText === undefined ? 32 : /^\d{1,2}$/.test(bitsText) ? Number(bitsText) : NaN;
  if (!(bits >= 0 && bits <= 32)) return null;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (a & mask) === (b & mask);
}

type CondResult = { ok: true; value: boolean; rule: string; note: string } | { ok: false };

/** Evaluates the single supported condition of a statement. `ok: false` is a refusal. */
function evalCondition(cond: Statement['Condition'], req: Req): CondResult {
  if (cond === undefined) return { ok: true, value: true, rule: '', note: '' };
  const ops = Object.keys(cond);
  if (ops.length !== 1) return { ok: false };
  const op = ops[0]!;
  const body = cond[op];
  if (typeof body !== 'object' || body === null) return { ok: false };
  const keys = Object.keys(body);
  if (keys.length !== 1) return { ok: false };
  const key = keys[0]!.toLowerCase();
  const val = (body as Record<string, unknown>)[keys[0]!];
  if (typeof val !== 'string') return { ok: false };
  const ctx = req.context;
  if (key === 'aws:sourceip') {
    if (op !== 'IpAddress' && op !== 'NotIpAddress') return { ok: false };
    if (ctx.sourceIp === undefined) {
      // IpAddress: a missing key is a mismatch. NotIpAddress with a missing key is not settled for this operator: refuse.
      return op === 'IpAddress' ? { ok: true, value: false, rule: 'cond-missing-key', note: 'aws:SourceIp is not in the request, so the IpAddress condition is false.' } : { ok: false };
    }
    const inside = inCidr(ctx.sourceIp, val);
    if (inside === null) return { ok: false };
    const value = op === 'IpAddress' ? inside : !inside;
    return { ok: true, value, rule: 'cond-ip', note: `${op} ${val} with source ${ctx.sourceIp}: ${value ? 'true' : 'false'}.` };
  }
  if (key === 'aws:multifactorauthpresent') {
    if (op !== 'Bool' && op !== 'BoolIfExists') return { ok: false };
    if (val !== 'true' && val !== 'false') return { ok: false };
    if (ctx.mfa === undefined) {
      return op === 'Bool'
        ? { ok: true, value: false, rule: 'cond-mfa', note: 'No MFA key in the request (long-term access keys), so Bool is false.' }
        : { ok: true, value: true, rule: 'cond-ifexists', note: 'No MFA key in the request, so BoolIfExists is true.' };
    }
    const value = String(ctx.mfa) === val;
    return { ok: true, value, rule: 'cond-bool', note: `MFA present is ${String(ctx.mfa)}; ${op} ${val}: ${value ? 'true' : 'false'}.` };
  }
  if (key === 'aws:securetransport') {
    if (op !== 'Bool') return { ok: false };
    if (val !== 'true' && val !== 'false') return { ok: false };
    const value = String(ctx.secureTransport) === val;
    return { ok: true, value, rule: 'cond-tls', note: `SecureTransport is ${String(ctx.secureTransport)}; Bool ${val}: ${value ? 'true' : 'false'}.` };
  }
  if (key === 'aws:principalorgid') {
    if (op !== 'StringEquals') return { ok: false };
    const org = req.principal.orgId;
    if (org === undefined) return { ok: true, value: false, rule: 'cond-orgid', note: 'The principal is not in an organization, so aws:PrincipalOrgID is missing and the condition is false.' };
    const value = org === val;
    return { ok: true, value, rule: 'cond-string', note: `Principal organization ${org} ${value ? 'equals' : 'differs from'} ${val}.` };
  }
  return { ok: false };
}

// ───────────────────────── validation (refusals) ─────────────────────────

const STATEMENT_KEYS = new Set(['Sid', 'Effect', 'Principal', 'Action', 'Resource', 'Condition']);

function validPattern(p: unknown, isAction: boolean): boolean {
  if (typeof p !== 'string' || p.length === 0) return false;
  if (p.includes('?') || p.includes('$')) return false;
  return isAction ? ACTION_RE.test(p) : true;
}

function validate(s: PolicyCourtScenario): boolean {
  const { request: r, policies } = s;
  if (!r || !Array.isArray(policies)) return false;
  if (r.principal.type !== 'user' && r.principal.type !== 'role') return false;
  if (!ACCOUNT_RE.test(r.principal.account) || !ACCOUNT_RE.test(r.resource.account)) return false;
  if (r.principal.type === 'role' && /^AWSServiceRoleFor/.test(r.principal.name)) return false; // service-linked roles: SCPs do not apply, not modelled
  if (r.principal.type === 'user' && r.principal.session !== undefined) return false;
  if (r.principal.type === 'role' && !r.principal.session) return false;
  if (!ACTION_RE.test(r.action) || r.action.includes('*')) return false;
  if (r.resource.arn.includes('*') || r.resource.arn.includes('?')) return false;
  const rk = r.resource.kind ?? 'resource';
  if (rk === 'role-trust' && r.action.toLowerCase() !== 'sts:assumerole') return false;
  if (r.context.sourceIp !== undefined && ipv4(r.context.sourceIp) === null) return false;

  const ids = new Set<string>();
  const count = { boundary: 0, session: 0, resource: 0 };
  for (const p of policies) {
    if (ids.has(p.id) || p.id === IMPLICIT || p.id === SEVERAL || p.id === BOTH_SIDES) return false;
    ids.add(p.id);
    if (!['identity', 'resource', 'boundary', 'scp', 'session'].includes(p.kind)) return false;
    if (p.kind === 'boundary') count.boundary++;
    if (p.kind === 'session') count.session++;
    if (p.kind === 'resource') count.resource++;
    if (p.kind === 'scp' && !p.account) return false;
    if (p.kind === 'session' && r.principal.type !== 'role') return false;
    if (p.statements.length === 0) return false;
    for (const st of p.statements) {
      if (st.Effect !== 'Allow' && st.Effect !== 'Deny') return false;
      if (Object.keys(st).some((k) => !STATEMENT_KEYS.has(k))) return false; // NotAction, NotResource, NotPrincipal, unknown elements
      const actions = list(st.Action);
      const resources = list(st.Resource);
      if (!actions || !resources || actions.length === 0 || resources.length === 0) return false;
      if (!actions.every((a) => validPattern(a, true)) || !resources.every((x) => validPattern(x, false))) return false;
      if (p.kind === 'scp' && st.Effect === 'Allow' && !(resources.length === 1 && resources[0] === '*')) return false;
      if (p.kind === 'resource') {
        if (st.Principal === undefined) return false;
        const pr = st.Principal;
        const strings = pr === '*' ? ['*'] : typeof pr === 'object' && pr !== null && Object.keys(pr).length === 1 && 'AWS' in pr ? list(pr.AWS) : null;
        if (!strings || strings.length === 0 || !strings.every((x) => parsePrincipal(x) !== null)) return false;
      } else if (st.Principal !== undefined) return false;
      if (st.Condition !== undefined && !evalCondition(st.Condition, r).ok) return false;
    }
  }
  return count.boundary <= 1 && count.session <= 1 && count.resource <= 1;
}

// ───────────────────────── evaluation core ─────────────────────────

interface Note {
  rule: string;
  note: string;
}

interface Core {
  decision: 'allow' | 'deny';
  explicit: string[];
  grants: string[];
  limiters: string[];
  unsettled: boolean;
  notes: Note[];
}

type Mode = 'limited' | 'direct';

function core(s: PolicyCourtScenario, ignore: ReadonlySet<string>, mode: Mode): Core | null {
  const { request: r, policies } = s;
  const notes: Note[] = [];
  const label = (id: string) => policies.find((p) => p.id === id)?.label ?? id;
  const cross = r.principal.account !== r.resource.account;
  const kind = r.resource.kind ?? 'resource';

  const applicableScps = policies.filter((p) => p.kind === 'scp' && p.account === r.principal.account);
  const scps = r.principal.managementAccount ? [] : applicableScps;
  if (r.principal.managementAccount && applicableScps.length > 0) notes.push({ rule: 'scp-management', note: 'The principal is in the management account, so the service control policies do not apply.' });
  for (const p of policies.filter((x) => x.kind === 'scp' && x.account !== r.principal.account)) {
    notes.push({ rule: 'scp-scope', note: `"${p.label}" governs another account, so it does not apply to this principal.` });
  }

  // statement matching
  const denies = new Set<string>();
  const allowing = new Map<string, PrincipalMatch[]>(); // policy id -> principal match kinds of matching Allow statements
  for (const p of policies) {
    if (p.kind === 'scp' && !scps.includes(p)) continue;
    for (const st of p.statements) {
      const actions = list(st.Action) ?? [];
      const resources = list(st.Resource) ?? [];
      if (!actions.some((a) => globToRegExp(a, 'i').test(r.action))) continue;
      if (!resources.some((x) => globToRegExp(x, '').test(r.resource.arn))) continue;
      let pm: PrincipalMatch | null = 'all';
      if (p.kind === 'resource') {
        const pr = st.Principal;
        const strings = pr === '*' ? ['*'] : list((pr as { AWS: string | string[] }).AWS) ?? [];
        pm = null;
        for (const x of strings) {
          const parsed = parsePrincipal(x);
          const m = parsed ? matchPrincipal(parsed, r.principal) : null;
          if (m && (pm === null || m !== 'all')) pm = m;
        }
        if (pm === null) continue;
      }
      const c = evalCondition(st.Condition, r);
      if (!c.ok) return null;
      if (st.Condition !== undefined) notes.push({ rule: c.rule, note: `${p.label}${st.Sid ? ` (${st.Sid})` : ''}: ${c.note}` });
      if (!c.value) continue;
      if (st.Effect === 'Deny') denies.add(p.id);
      else allowing.set(p.id, [...(allowing.get(p.id) ?? []), pm]);
    }
  }

  const base: Omit<Core, 'decision'> = { explicit: [], grants: [], limiters: [], unsettled: false, notes };
  if (denies.size > 0) {
    notes.push({ rule: 'explicit-deny', note: `Matching Deny in: ${[...denies].map(label).join('; ')}.` });
    if ([...denies].some((id) => policies.find((p) => p.id === id)?.kind === 'scp')) notes.push({ rule: 'scp-deny-any-level', note: 'A Deny in a service control policy denies the request at any level of the path.' });
    return { ...base, decision: 'deny', explicit: [...denies] };
  }

  const failingScps = scps.filter((p) => !allowing.has(p.id) && !ignore.has(p.id));
  if (scps.length > 0 && failingScps.length === 0) notes.push({ rule: 'scp-every-level', note: 'Every organization level allows the action.' });
  const boundary = policies.find((p) => p.kind === 'boundary');
  const session = policies.find((p) => p.kind === 'session');
  const boundaryOk = !boundary || ignore.has(boundary.id) || allowing.has(boundary.id);
  const sessionOk = !session || ignore.has(session.id) || allowing.has(session.id);
  const limiters = [...failingScps.map((p) => p.id), ...(boundaryOk ? [] : [boundary!.id]), ...(sessionOk ? [] : [session!.id])];
  for (const p of failingScps) notes.push({ rule: 'scp-every-level', note: `"${p.label}" has no Allow for this action, so the request is denied at that level.` });
  if (!boundaryOk) notes.push({ rule: 'boundary-limits', note: `The boundary "${boundary!.label}" has no Allow for this action.` });
  if (!sessionOk) notes.push({ rule: 'session-limits', note: `The session policy "${session!.label}" has no Allow for this action.` });

  const identityAllow = policies.filter((p) => p.kind === 'identity' && allowing.has(p.id)).map((p) => p.id);
  const resourcePolicy = policies.find((p) => p.kind === 'resource');
  const resourceMatches = resourcePolicy ? allowing.get(resourcePolicy.id) ?? [] : [];
  const hasLimit = !!boundary || !!session;

  let unsettled = false;
  const grants: string[] = [];
  let allowed = false;
  if (cross) {
    const identityGrant = identityAllow.length > 0 && boundaryOk && sessionOk;
    const resourceGrant = resourceMatches.length > 0;
    if (identityAllow.length === 0) notes.push({ rule: 'cross-identity', note: 'No identity-based policy of the principal allows it, so the principal side fails.' });
    else if (identityGrant) notes.push({ rule: 'cross-identity', note: 'The identity-based policy allows it on the principal side.' });
    if (!resourceGrant) notes.push({ rule: 'cross-resource', note: 'The resource-based policy does not allow this principal, so the resource side fails.' });
    else notes.push({ rule: 'cross-resource', note: 'The resource-based policy allows this principal on the resource side.' });
    if (identityGrant && resourceGrant && scps.every((p) => !failingScps.includes(p))) {
      allowed = true;
      grants.push(...identityAllow, resourcePolicy!.id);
      notes.push({ rule: 'cross-both', note: 'Both accounts allow it, so the request is allowed.' });
    }
  } else {
    if (kind !== 'resource' && resourceMatches.some((m) => m === 'account' || m === 'all')) return null; // trust and key policies that delegate to an account are not settled for one account
    const identityCounts = kind === 'resource';
    const identityGrant = identityCounts && identityAllow.length > 0 && boundaryOk && sessionOk;
    if (identityGrant) notes.push({ rule: 'same-account-union', note: 'The identity-based policy allows it (and the boundary and session policy do not take it away).' });
    if (identityGrant && boundary) notes.push({ rule: 'boundary-intersect', note: 'The identity-based policy and the boundary both allow it.' });
    if (!identityCounts && identityAllow.length > 0) notes.push({ rule: 'trust-exception', note: 'The identity-based Allow does not count here: a trust policy or key policy must itself allow the principal.' });
    const effective: string[] = [];
    for (const m of resourceMatches) {
      if (m === 'user') {
        notes.push({ rule: 'boundary-user-resource', note: 'The resource-based policy names the user ARN, so a boundary does not limit it.' });
        effective.push(resourcePolicy!.id);
      } else if (m === 'session') {
        notes.push({ rule: 'session-direct', note: 'The resource-based policy names the role session ARN, so it is granted directly to the session.' });
        effective.push(resourcePolicy!.id);
      } else if (m === 'role') {
        notes.push({ rule: 'principal-session', note: 'The role ARN in the resource-based policy matches the role session making the request.' });
        if (boundaryOk && sessionOk) effective.push(resourcePolicy!.id);
        else notes.push({ rule: 'boundary-role-resource', note: 'A resource-based Allow for the role ARN is limited by the boundary or session policy, which have no Allow here.' });
      } else {
        notes.push({ rule: m === 'all' ? 'principal-all' : 'principal-account', note: `The resource-based policy allows ${m === 'all' ? 'every principal' : 'the whole account'}.` });
        if (hasLimit) {
          unsettled = true;
          if (mode === 'direct' || (boundaryOk && sessionOk)) effective.push(resourcePolicy!.id);
        } else effective.push(resourcePolicy!.id);
      }
    }
    if (identityGrant || effective.length > 0) {
      allowed = failingScps.length === 0;
      if (identityGrant) grants.push(...identityAllow);
      grants.push(...effective);
    }
  }
  if (!allowed) {
    if (scps.length > 0 && failingScps.length === 0) notes.push({ rule: 'scp-no-grant', note: 'The service control policies allow the action but never grant it.' });
    notes.push({ rule: 'implicit-deny', note: 'Nothing allows this request, so it is an implicit deny.' });
    return { ...base, decision: 'deny', limiters, unsettled };
  }
  return { ...base, decision: 'allow', grants: [...new Set(grants)], limiters: [], unsettled };
}

interface Outcome {
  decision: 'allow' | 'deny';
  decider: string;
  notes: Note[];
}

function outcome(s: PolicyCourtScenario, mode: Mode): Outcome | null {
  const base = core(s, new Set(), mode);
  if (!base) return null;
  const cross = s.request.principal.account !== s.request.resource.account;
  if (base.decision === 'deny' && base.explicit.length > 0) {
    if (base.explicit.length !== 1) return null;
    return { decision: 'deny', decider: base.explicit[0]!, notes: base.notes };
  }
  if (base.decision === 'allow') {
    if (cross) {
      const ids = base.grants;
      const identities = ids.filter((id) => s.policies.find((p) => p.id === id)?.kind === 'identity');
      if (identities.length !== 1) return null;
      return { decision: 'allow', decider: BOTH_SIDES, notes: base.notes };
    }
    if (base.grants.length === 1) return { decision: 'allow', decider: base.grants[0]!, notes: base.notes };
    return { decision: 'allow', decider: SEVERAL, notes: base.notes };
  }
  // implicit deny: find the limiter whose removal turns it into Allow
  const limiters = base.limiters;
  const butFor = limiters.filter((l) => core(s, new Set([l]), mode)?.decision === 'allow');
  if (butFor.length === 1) return { decision: 'deny', decider: butFor[0]!, notes: base.notes };
  if (butFor.length > 1) return null;
  const withoutLimiters = core(s, new Set(limiters), mode);
  if (!withoutLimiters) return null;
  if (withoutLimiters.decision === 'allow') return null; // several limiters are needed at once
  return { decision: 'deny', decider: IMPLICIT, notes: base.notes };
}

// ───────────────────────── exhibit and fields ─────────────────────────

const KIND_NAME: Record<PolicyKind, string> = {
  identity: 'Identity-based policy',
  resource: 'Resource-based policy',
  boundary: 'Permissions boundary',
  scp: 'Service control policy',
  session: 'Session policy',
};

function orderedStatement(st: Statement): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of ['Sid', 'Effect', 'Principal', 'Action', 'Resource', 'Condition'] as const) {
    if (st[k] !== undefined) out[k] = st[k];
  }
  return out;
}

const fmtCtx = (v: string | boolean | undefined, missing: string) => (v === undefined ? missing : String(v));

function exhibit(s: PolicyCourtScenario): ExhibitSection[] {
  const { request: r } = s;
  const cross = r.principal.account !== r.resource.account;
  const rows: string[][] = [
    ['Principal', principalArn(r.principal) + (r.principal.type === 'role' ? ' (role session)' : '')],
    ['Action', r.action],
    ['Resource', r.resource.arn],
    ['Accounts', cross ? `Cross-account: the principal is in ${r.principal.account}, the resource is in ${r.resource.account}` : `Same account (${r.principal.account})`],
    ['aws:SourceIp', fmtCtx(r.context.sourceIp, 'not in the request')],
    ['aws:MultiFactorAuthPresent', fmtCtx(r.context.mfa, 'not in the request (long-term access keys)')],
    ['aws:SecureTransport', String(r.context.secureTransport)],
    ['aws:PrincipalOrgID', fmtCtx(r.principal.orgId, 'not in the request (account is not in an organization)')],
  ];
  if (r.principal.managementAccount) rows.push(['Organization', 'The principal is in the management account']);
  if ((r.resource.kind ?? 'resource') !== 'resource') rows.push(['Resource type', r.resource.kind === 'role-trust' ? 'IAM role (the resource-based policy is its trust policy)' : 'AWS KMS key (the resource-based policy is its key policy)']);
  const out: ExhibitSection[] = [
    { title: 'The request', kind: 'table', head: ['Item', 'Value'], rows },
    { title: 'Reading the exhibit', kind: 'text', text: 'Account names such as ACCT_DEV stand for 12-digit account IDs. Every policy that exists for this request is listed; some may not apply.' },
  ];
  for (const p of s.policies) {
    const where = p.kind === 'scp' ? ` (governs ${p.account})` : '';
    out.push({ title: `${KIND_NAME[p.kind]}: ${p.label}${where}`, kind: 'code', text: JSON.stringify({ Version: '2012-10-17', Statement: p.statements.map(orderedStatement) }, null, 2) });
  }
  return out;
}

function fields(s: PolicyCourtScenario): Field[] {
  const cross = s.request.principal.account !== s.request.resource.account;
  const options = s.policies.map((p) => ({ id: p.id, label: `${KIND_NAME[p.kind]}: ${p.label}` }));
  options.push(
    cross
      ? { id: BOTH_SIDES, label: "Both sides together: the principal's identity-based policy and the resource-based policy" }
      : { id: SEVERAL, label: 'More than one policy allows it independently' },
  );
  options.push({ id: IMPLICIT, label: 'No policy allows it (implicit deny)' });
  return [
    {
      id: 'decision',
      prompt: 'What is the result of this request?',
      multi: false,
      options: [
        { id: 'allow', label: 'Allow' },
        { id: 'deny', label: 'Deny' },
      ],
    },
    { id: 'decider', prompt: 'Which policy decided it?', multi: false, options },
  ];
}

function evaluate(s: PolicyCourtScenario): Evaluation | null {
  if (!validate(s)) return null;
  const first = outcome(s, 'limited');
  if (!first) return null;
  const baseCore = core(s, new Set(), 'limited');
  if (baseCore?.unsettled) {
    const other = outcome(s, 'direct');
    if (!other || other.decision !== first.decision || other.decider !== first.decider) return null; // the cited pages do not settle account-wide grants next to a boundary or session policy
  }
  const answer: Answer = { decision: [first.decision], decider: [first.decider] };
  const trace = first.notes.filter((n, i, a) => a.findIndex((m) => m.rule === n.rule && m.note === n.note) === i);
  return { answer, trace };
}

export const def: PuzzleDef<PolicyCourtScenario> = {
  type: 'policy-court',
  rules,
  fields,
  exhibit,
  evaluate,
};
