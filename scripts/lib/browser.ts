import { existsSync, statSync } from 'node:fs';
import { chromium } from '@playwright/test';

/** The Chromium executable: CHROMIUM_PATH, then the pre-installed browser, then Playwright's own (the same order as playwright.config.ts). */
export function browserPath(): string | undefined {
  const fallback = '/opt/pw-browsers/chromium';
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  if (existsSync(fallback) && statSync(fallback).isFile()) return fallback;
  return chromium.executablePath();
}
