import { existsSync, statSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const fallback = '/opt/pw-browsers/chromium';
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync(fallback) && statSync(fallback).isFile() ? fallback : undefined);
const siteUrl = process.env.SITE_URL;
if (!siteUrl) throw new Error('Set SITE_URL to the deployed site, for example https://saa.example.org/');

/**
 * npm run e2e:live: the app specs against the deployed site, at 1440 px and 390 px. No local servers, and the dev-only
 * mock spec is left out because the live site has no dev hooks. The deploy workflow runs it after each deploy.
 */
export default defineConfig({
  testDir: './e2e',
  testIgnore: /mock\.spec/,
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [['list']],
  use: { baseURL: siteUrl, launchOptions: { executablePath }, hasTouch: true },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true } },
  ],
});
