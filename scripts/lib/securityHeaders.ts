/**
 * The security headers the site is served with. This file is the single source for three copies that must agree:
 *   - the Vite build's CSP meta tag (cspMeta, without frame-ancestors, which browsers ignore in a meta element),
 *   - the local production server (scripts/serve-prod.ts), which is how e2e and Lighthouse see the headers,
 *   - the CloudFront response headers policy in infra/saa-site.yaml, which a unit test compares with SECURITY_HEADERS.
 */
export const CSP_DIRECTIVES: readonly (readonly [string, string])[] = [
  ['default-src', "'self'"],
  ['script-src', "'self'"],
  ['style-src', "'self'"],
  ['img-src', "'self' data:"],
  ['font-src', "'self'"],
  ['connect-src', "'self'"],
  ['worker-src', "'self'"],
  ['manifest-src', "'self'"],
  ['object-src', "'none'"],
  ['base-uri', "'self'"],
  ['form-action', "'none'"],
  ['frame-ancestors', "'none'"],
];

const META_IGNORED = new Set(['frame-ancestors']);

function join(directives: readonly (readonly [string, string])[]): string {
  return directives.map(([name, value]) => `${name} ${value}`).join('; ');
}

/** The Content-Security-Policy response header. */
export function cspHeader(): string {
  return join(CSP_DIRECTIVES);
}

/** The same policy for the meta tag: frame-ancestors is left out because a meta element cannot carry it. */
export function cspMeta(): string {
  return join(CSP_DIRECTIVES.filter(([name]) => !META_IGNORED.has(name)));
}

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy': cspHeader(),
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

/** Cache-Control per file type, as the deploy workflow sets it on S3 objects. Hashed assets never change, so they are immutable. */
export const CACHE_IMMUTABLE = 'public, max-age=31536000, immutable';
export const CACHE_REVALIDATE = 'no-cache';

/** Files whose names carry no content hash: they must be revalidated on every visit and invalidated on deploy. */
export function isHashedAsset(key: string): boolean {
  return key.startsWith('assets/');
}
