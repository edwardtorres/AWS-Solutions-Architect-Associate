import { expect, test, type Page } from '@playwright/test';
import { allBuildingIds, axeClean } from './helpers';

/** A save with progress (one building) and an export date that is set by the test. */
const seed = (lastExportAt: string | null) =>
  JSON.stringify({
    version: 6,
    updatedAt: '2026-01-01T00:00:00.000Z',
    buildings: { [allBuildingIds()[0] as string]: { state: 'commissioned', changedAt: '2026-01-01T00:00:00.000Z' } },
    ui: { view: 'map', lastBuilding: null, roads: 'selected', lastExportAt },
    game: {},
    labs: {},
  });

async function load(page: Page, save: string): Promise<void> {
  await page.goto('/');
  await page.evaluate((s) => {
    localStorage.setItem('saa-region-builder:save', s);
  }, save);
  await page.goto('/#/map');
  // A hash change does not reload the app, so reload to read the seeded save.
  await page.reload();
}

const banner = (page: Page) => page.getByTestId('backup-banner');

test('Settings says whether the browser keeps the save, and asks for it on request', async ({ page }) => {
  await load(page, seed(new Date().toISOString()));
  await page.getByText('Settings', { exact: true }).click();
  const status = page.getByTestId('persist-status');
  await expect(status).not.toHaveText('Checking whether the browser keeps this save…');
  await page.getByRole('button', { name: 'Ask the browser to keep my save' }).click().catch(() => undefined);
  await expect(status).toHaveText(/agreed to keep|has not agreed|does not report/);
  await expect(page.getByText(/Safari may clear site data/)).toBeVisible();
  await axeClean(page, 'settings with save protection');
});

test('a backup reminder shows once there is progress and no recent export, and an export clears it', async ({ page }) => {
  await load(page, seed(null));
  await expect(banner(page)).toBeVisible();
  await axeClean(page, 'backup reminder');
  const download = page.waitForEvent('download');
  await banner(page).getByRole('button', { name: 'Export now' }).click();
  expect((await download).suggestedFilename()).toBe('region-builder-save.json');
  await expect(banner(page)).toHaveCount(0);
});

test('Later hides the reminder for a day, and a reload keeps it hidden', async ({ page }) => {
  await load(page, seed(null));
  await banner(page).getByRole('button', { name: 'Later' }).click();
  await expect(banner(page)).toHaveCount(0);
  await page.reload();
  await expect(banner(page)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('saa-region-builder:backup-snooze-until'))).not.toBeNull();
});

test('a failed write is said out loud, not silently kept', async ({ page }) => {
  await load(page, seed(new Date().toISOString()));
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    };
  });
  await page.getByRole('link', { name: 'Service Atlas' }).click();
  await expect(page.getByText('This browser could not save your latest change')).toBeVisible();
});
