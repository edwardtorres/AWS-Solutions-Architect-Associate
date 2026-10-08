export interface BundleFile {
  path: string;
  content: string;
}

/** Hosts that may appear as plain strings (XML namespaces, error docs, outbound doc links). They are never loaded. */
export const ALLOWED_URL_HOSTS = new Set([
  'www.w3.org',
  'react.dev',
  'tailwindcss.com',
  'docs.aws.amazon.com',
  'aws.amazon.com',
  'learn.microsoft.com',
]);

/** Strings that only exist in dev-only modules. Production bundles must not contain any of them. */
export const DEV_MARKERS = ['SAA_DEV_HOOKS_SENTINEL', '__saaDev', '__SAA_SEED__', 'DEV ONLY', 'Developer toolbar', 'Developer controls'];

const isText = (p: string) => /\.(html|js|css|json|svg|webmanifest|txt)$/.test(p);

export function checkBundle(files: readonly BundleFile[]): string[] {
  const problems: string[] = [];
  const text = files.filter((f) => isText(f.path));

  // 1. Dev-only hooks are absent.
  for (const f of text) {
    for (const marker of DEV_MARKERS) {
      if (f.content.includes(marker)) problems.push(`${f.path} contains dev-only marker "${marker}"`);
    }
  }

  // 2. No external origins.
  for (const f of text) {
    for (const m of f.content.matchAll(/https?:\/\/([A-Za-z0-9.-]+)/g)) {
      const host = m[1] as string;
      if (!ALLOWED_URL_HOSTS.has(host)) problems.push(`${f.path} references external origin ${host}`);
    }
    if (/@import\s+(url\()?['"]?https?:/.test(f.content)) problems.push(`${f.path} imports a remote stylesheet`);
  }

  // 3. index.html: strict CSP present, only same-origin scripts/styles, no inline code.
  const index = files.find((f) => f.path === 'index.html');
  if (!index) {
    problems.push('dist/index.html is missing');
  } else {
    const csp = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(index.content)?.[1];
    if (!csp) problems.push('index.html has no Content-Security-Policy meta tag');
    else {
      for (const need of ["default-src 'self'", "script-src 'self'", "object-src 'none'", "base-uri 'self'"]) {
        if (!csp.includes(need)) problems.push(`CSP is missing ${need}`);
      }
      if (/unsafe-inline|unsafe-eval|\*/.test(csp.replace(/'self'/g, ''))) problems.push('CSP allows unsafe-inline, unsafe-eval or a wildcard');
    }
    if (/<script(?![^>]*\bsrc=)[^>]*>[^<]/.test(index.content)) problems.push('index.html has an inline script');
    if (/\sstyle=/.test(index.content) || /<style[\s>]/.test(index.content)) problems.push('index.html has inline styles');
    for (const m of index.content.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)) {
      const url = m[1] as string;
      if (/^(https?:)?\/\//.test(url)) problems.push(`index.html loads ${url}`);
    }
  }

  // 4. Fonts are bundled locally, and CSS font URLs are relative.
  const fonts = files.filter((f) => /\.woff2?$/.test(f.path));
  if (fonts.length === 0) problems.push('no self-hosted font files in dist');
  for (const f of text.filter((x) => x.path.endsWith('.css'))) {
    for (const m of f.content.matchAll(/url\(([^)]+)\)/g)) {
      const url = (m[1] as string).replace(/['"]/g, '');
      if (/^(https?:)?\/\//.test(url)) problems.push(`${f.path} loads ${url}`);
    }
  }

  // 5. Code is split by feature and no source maps ship.
  const jsChunks = files.filter((f) => f.path.endsWith('.js'));
  if (jsChunks.length < 4) problems.push(`expected the map, detail panel, atlas and save menu as separate chunks; found ${jsChunks.length} JS files`);
  if (files.some((f) => f.path.endsWith('.map'))) problems.push('source maps are present in dist');
  return problems;
}
