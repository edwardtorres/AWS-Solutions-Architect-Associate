/**
 * npx tsx scripts/serve-prod.ts [--port 4175] [--dir dist]
 * Serves the production build the way the deployed site is served: the security headers from scripts/lib/securityHeaders.ts,
 * the cache rules the deploy workflow sets on S3 (hashed assets immutable, everything else revalidated), and the static 404
 * page with status 404 for a missing file. e2e and Lighthouse run against it, so the CSP is tested as a server sends it.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CACHE_IMMUTABLE, CACHE_REVALIDATE, SECURITY_HEADERS, isHashedAsset } from './lib/securityHeaders';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? (process.argv[i + 1] as string) : fallback;
}

const root = resolve(fileURLToPath(new URL('../', import.meta.url)), arg('dir', 'dist'));
const port = Number(arg('port', '4175'));

/** The file a request maps to, or null when it would leave the build directory. */
export function fileFor(urlPath: string): string | null {
  let relative: string;
  try {
    relative = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  } catch {
    return null;
  }
  if (relative.endsWith('/')) relative += 'index.html';
  if (relative === '/') relative = '/index.html';
  const file = resolve(join(root, relative));
  return file === root || file.startsWith(root + sep) ? file : null;
}

/** Text responses are compressed when the client accepts it, as CloudFront does with Compress enabled. */
const COMPRESSIBLE = /^(text\/|application\/(javascript|json|manifest\+json)|image\/svg\+xml)/;

function encode(body: Buffer, type: string, acceptEncoding: string): { body: Buffer; encoding: string | null } {
  if (!COMPRESSIBLE.test(type)) return { body, encoding: null };
  if (acceptEncoding.includes('br')) {
    const quality = { [constants.BROTLI_PARAM_QUALITY]: 5 };
    return { body: brotliCompressSync(body, { params: quality }), encoding: 'br' };
  }
  if (acceptEncoding.includes('gzip')) return { body: gzipSync(body), encoding: 'gzip' };
  return { body, encoding: null };
}

function headersFor(relative: string, type: string, encoding: string | null): Record<string, string> {
  const cache = isHashedAsset(relative) ? CACHE_IMMUTABLE : CACHE_REVALIDATE;
  const headers: Record<string, string> = { ...SECURITY_HEADERS, 'Cache-Control': cache, 'Content-Type': type, Vary: 'Accept-Encoding' };
  if (encoding) headers['Content-Encoding'] = encoding;
  return headers;
}

async function send(
  req: IncomingMessage,
  res: ServerResponse,
  status: number,
  file: string,
  relative: string,
): Promise<void> {
  const type = MIME[extname(file)] ?? 'application/octet-stream';
  const raw = await readFile(file);
  const accept = String(req.headers['accept-encoding'] ?? '');
  const { body, encoding } = encode(raw, type, accept);
  res.writeHead(status, headersFor(relative, type, encoding));
  res.end(body);
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, SECURITY_HEADERS);
    res.end();
    return;
  }
  const file = fileFor(req.url ?? '/');
  if (!file) {
    res.writeHead(400, SECURITY_HEADERS);
    res.end();
    return;
  }
  const relative = file.slice(root.length + 1).split(sep).join('/');
  try {
    await send(req, res, 200, file, relative);
  } catch {
    // A missing file gets the static 404 page with status 404, as the CloudFront custom error response does.
    try {
      await send(req, res, 404, join(root, '404.html'), '404.html');
    } catch {
      res.writeHead(404, SECURITY_HEADERS);
      res.end('Not found');
    }
  }
}

const server = createServer((req, res) => {
  void handle(req, res);
});

server.listen(port, 'localhost', () => {
  console.log(`serving ${root} with deploy headers on http://localhost:${port}`);
});
