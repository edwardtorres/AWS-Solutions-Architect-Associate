import { existsSync, statSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const fallback = '/opt/pw-browsers/chromium';
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync(fallback) && statSync(fallback).isFile() ? fallback : undefined);

/**
 * npm run e2e: run `npm run build` first. Serves dist/ with `vite preview` (strict CSP, no dev hooks) and drives it
 * with Chromium at 1440 px (desktop) and 390 px (phone, touch). Specs use tap() only.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4175', launchOptions: { executablePath }, hasTouch: true },
  webServer: { command: 'npx vite preview --port 4175 --strictPort --host localhost', url: 'http://localhost:4175', reuseExistingServer: false, timeout: 30_000 },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true } },
  ],
});
