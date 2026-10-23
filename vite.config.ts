import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { cspMeta } from './scripts/lib/securityHeaders.ts';

/** Strict CSP, injected for production builds only. Dev needs inline HMR scripts. */
export const CSP = cspMeta();
const base = process.env.SITE_BASE ?? '/';
if (!/^\/(?:[a-z0-9-]+\/)*$/.test(base)) throw new Error('SITE_BASE must be an absolute directory path ending in /.');

function cspPlugin(): Plugin {
  return {
    name: 'saa-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`);
    },
  };
}

/** A static 404 page for missing files (CloudFront maps 403 and 404 from S3 to it). It has no script; its CSS is the app's. */
function notFoundPage(): Plugin {
  return {
    name: 'saa-404-page',
    apply: 'build',
    generateBundle(_options, bundle) {
      const stylesheets = Object.keys(bundle)
        .filter((file) => file.endsWith('.css'))
        .map((file) => `<link rel="stylesheet" href="${base}${file}" />`)
        .join('\n    ');
      const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta http-equiv="Content-Security-Policy" content="${CSP}" />
    <meta name="theme-color" content="#0b1a2b" />
    ${stylesheets}
    <title>Page not found · Region Builder</title>
  </head>
  <body>
    <main id="main" class="mx-auto max-w-prose p-6">
      <h1 class="text-3xl font-semibold">Page not found</h1>
      <p class="mt-3">There is no page at this address.</p>
      <p class="mt-4"><a href="${base}#/map">Go to the city map</a></p>
    </main>
  </body>
</html>
`;
      this.emitFile({ type: 'asset', fileName: '404.html', source: html });
    },
  };
}

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    cspPlugin(),
    notFoundPage(),
    VitePWA({
      // The page asks before a new version takes over (see src/ui/PwaUpdatePrompt.tsx), so nothing changes under the player.
      registerType: 'prompt',
      // Registration happens through the virtual module the update prompt uses, not an injected script.
      injectRegister: null,
      scope: base,
      devOptions: { enabled: false },
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Region Builder · SAA-C03',
        short_name: 'Region Builder',
        description: 'A game-style study app for the AWS Certified Solutions Architect – Associate exam.',
        theme_color: '#0b1a2b',
        background_color: '#0b1a2b',
        display: 'standalone',
        id: base,
        start_url: base,
        scope: base,
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: `${base}icons/maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        cacheId: 'saa-region-builder',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        globIgnores: ['**/404.html'],
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/\/404\.html$/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: { target: 'es2022', sourcemap: false },
  test: {
    setupFiles: ['./vitest.setup.ts'],
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
        },
      },
    ],
  },
});
