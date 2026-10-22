import { existsSync, statSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const fallback = '/opt/pw-browsers/chromium';
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync(fallback) && statSync(fallback).isFile() ? fallback : undefined);

/**
 * npm run e2e: run `npm run build` first. Serves dist/ with scripts/serve-prod.ts (the deploy's security headers, cache rules
 * and 404 page; no dev hooks) and drives it with Chromium at 1440 px (desktop) and 390 px (phone, touch). Specs use tap() only.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4175', launchOptions: { executablePath }, hasTouch: true },
  webServer: [
    { command: 'npx tsx scripts/serve-prod.ts --port 4175', url: 'http://localhost:4175', reuseExistingServer: false, timeout: 30_000 },
    // The dev server serves the development-only short mock (?mock=short); only e2e/mock.spec.ts uses it. Production never has it (check:bundle).
    { command: 'npx vite --port 4176 --strictPort --host localhost', url: 'http://localhost:4176', reuseExistingServer: false, timeout: 60_000 },
  ],
  projects: [
    { name: 'desktop', testIgnore: /mock\.spec/, use: { viewport: { width: 1440, height: 900 } } },
    { name: 'phone', testIgnore: /mock\.spec/, use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true } },
    { name: 'mock-desktop', testMatch: /mock\.spec/, use: { baseURL: 'http://localhost:4176', viewport: { width: 1440, height: 900 } } },
    { name: 'mock-phone', testMatch: /mock\.spec/, use: { baseURL: 'http://localhost:4176', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true } },
  ],
});
