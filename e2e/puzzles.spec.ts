import { expect, test, type Page } from '@playwright/test';
import { allBuildingIds, axeClean, noSidewaysScroll, puzzleDump } from './helpers';

/** A v3 save with every building commissioned except `target`, which is then surveyed. */
const seed = (target: string | null) => {
  const buildings: Record<string, unknown> = {};
  for (const id of allBuildingIds()) if (id !== target) buildings[id] = { state: 'commissioned', changedAt: '2026-01-01T00:00:00.000Z', via: 'inspection' };
  return JSON.stringify({ version: 3, updatedAt: '2026-01-01T00:00:00.000Z', buildings, ui: { view: 'map', lastBuilding: null, roads: 'selected' }, game: {} });
};

async function load(page: Page, save: string, hash: string): Promise<void> {
  await page.goto('/');
  await page.evaluate((s) => {
    localStorage.setItem('saa-region-builder:save', s);
  }, save);
  await page.goto('/#/map');
  await page.goto(`/${hash}`);
  await page.reload();
}
const xp = async (page: Page) => Number(/(\d[\d,]*) XP/.exec(await page.getByTestId('rank-chip').innerText())?.[1]?.replace(/,/g, '') ?? '0');
const buildingsOf = (page: Page) =>
  page.evaluate(() => JSON.stringify((JSON.parse(localStorage.getItem('saa-region-builder:save') ?? '{}') as { buildings?: unknown }).buildings ?? {}));

for (const p of puzzleDump()) {
  test(`solve one ${p.type} puzzle: XP rises and no building changes state`, async ({ page }) => {
    await load(page, seed(p.building), `#/puzzle/${p.id}`);
    await expect(page.getByRole('heading', { level: 2, name: p.title })).toBeVisible();
    const xpBefore = await xp(page);
    const buildingsBefore = await buildingsOf(page);
    await axeClean(page, `${p.type} puzzle`);
    await noSidewaysScroll(page);
    if (p.reference) {
      for (const item of p.reference) {
        const pick = page.getByRole('button', { name: new RegExp(`^${item.short} \\(`) });
        if ((await pick.getAttribute('aria-pressed')) !== 'true') await pick.tap();
        await page.getByRole('button', { name: `Place ${item.kindLabel} in ${item.cell}` }).tap();
      }
      await axeClean(page, `${p.type} board`);
      await page.getByRole('button', { name: 'Check my design' }).tap();
    } else {
      for (const [i, f] of p.fields.entries()) {
        const set = page.locator('fieldset').nth(i);
        for (const label of f.correct) await set.locator('label.option-row').filter({ has: page.getByText(label, { exact: true }) }).first().tap();
      }
      await page.getByRole('button', { name: 'Check my answer' }).tap();
    }
    await expect(page.getByTestId('puzzle-verdict')).toContainText(/Correct|Every requirement is met/);
    await axeClean(page, `${p.type} result`);
    await noSidewaysScroll(page);
    expect(await xp(page)).toBeGreaterThan(xpBefore);
    expect(await buildingsOf(page)).toBe(buildingsBefore);
    // The building is still surveyed, not commissioned or under construction.
    await page.goto('/#/map');
    await page.goto(`/#/map/${p.building}`);
    await expect(page.locator('dialog[open] [data-kind="state"]')).toContainText('Surveyed');
  });
}

test('a planned building’s Workbench is unavailable, in the panel, the list and the puzzle', async ({ page }) => {
  const p = puzzleDump()[0];
  if (!p) throw new Error('no puzzles');
  await load(page, JSON.stringify({ version: 3, updatedAt: '2026-01-01T00:00:00.000Z', buildings: {}, ui: { view: 'map', lastBuilding: null, roads: 'selected' }, game: {} }), `#/map/${p.building}`);
  await expect(page.locator('dialog[open] [data-kind="state"]')).toContainText('Planned');
  await expect(page.getByTestId('workbench-locked')).toBeVisible();
  await expect(page.getByTestId('workbench-link')).toHaveCount(0);
  await axeClean(page, 'planned panel');
  await page.goto('/#/map');
  await page.goto(`/#/workbench/${p.building}`);
  await expect(page.getByTestId('workbench-locked')).toBeVisible();
  await page.goto('/#/map');
  await page.goto(`/#/puzzle/${p.id}`);
  await expect(page.getByTestId('workbench-locked')).toBeVisible();
  expect(await buildingsOf(page)).toBe('{}');
});

test('the Workbench lists the surveyed building’s puzzles and opens one', async ({ page }) => {
  const p = puzzleDump()[0];
  if (!p) throw new Error('no puzzles');
  await load(page, seed(p.building), `#/workbench/${p.building}`);
  await expect(page.getByTestId('workbench-list')).toBeVisible();
  await axeClean(page, 'workbench');
  await noSidewaysScroll(page);
  await page.getByTestId('workbench-list').getByRole('link').first().tap();
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
});
