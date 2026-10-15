import { expect, test } from '@playwright/test';
import { answerAll, axeClean, buildingName as name, link, noSidewaysScroll, pickChain, pickPortfolio, questions } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
  });
});

test('building flow: notes, start-up check, inspection, commissioned, dependent unlocked', async ({ page }) => {
  const { start, dependent } = pickChain();
  await page.goto(`/#/map/${start}`);
  await expect(page.locator('dialog[open]')).toBeVisible();
  await axeClean(page, 'map with panel');
  // The start-up check is not offered before the notes were opened.
  await expect(page.getByTestId('build-section')).toContainText('Open the study notes first');
  await expect(link(page, 'Start-up check')).toHaveCount(0);
  await link(page, 'Open the study notes').tap();
  await expect(page.getByRole('heading', { level: 2, name: name(start) })).toBeVisible();
  await noSidewaysScroll(page);
  await page.goto(`/#/map/${start}`);
  await link(page, 'Start-up check').tap();
  await axeClean(page, 'attempt intro');
  await page.getByRole('button', { name: /Begin start-up check/i }).tap();
  await axeClean(page, 'question');
  await noSidewaysScroll(page);
  await answerAll(page, 2, [true, true]);
  await expect(page.getByRole('heading', { level: 2 })).toContainText('passed');
  await expect(page.getByTestId('summary')).toContainText('under construction');
  await axeClean(page, 'result');
  await noSidewaysScroll(page);
  await link(page, 'Back to the building').tap();
  await expect(page.locator('dialog[open]')).toContainText('Under construction');
  await link(page, 'Inspection').tap();
  await page.getByRole('button', { name: /Begin inspection/i }).tap();
  await answerAll(page, 5, [true, true, true, true, true]);
  await expect(page.getByRole('heading', { level: 2 })).toContainText('passed');
  await expect(page.getByTestId('summary')).toContainText('Commissioned');
  await link(page, 'Back to the building').tap();
  await expect(page.locator('dialog[open] [data-kind="state"]')).toContainText('Commissioned');
  await page.goto(`/#/map/${dependent}`);
  await expect(page.locator('dialog[open] [data-kind="state"]')).toContainText('Surveyed');
  await page.goto('/#/progress');
  await expect(page.getByTestId('city-count')).toContainText('1 of');
  await axeClean(page, 'progress');
  await noSidewaysScroll(page);
});

test('failing two inspections in one day locks the building', async ({ page }) => {
  const { start } = pickChain();
  await page.goto(`/#/map/${start}`);
  await link(page, 'Open the study notes').tap();
  await page.goto(`/#/map/${start}`);
  await link(page, 'Start-up check').tap();
  await page.getByRole('button', { name: /Begin start-up check/i }).tap();
  await answerAll(page, 2, [true, true]);
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await page.goto(`/#/inspect/${start}`);
    await page.getByRole('button', { name: /Begin inspection/i }).tap();
    await answerAll(page, 5, [false, false, false, false, false]);
    await expect(page.getByRole('heading', { level: 2 })).toContainText('not passed');
    if (attempt === 2) await expect(page.getByTestId('summary')).toContainText('locked until tomorrow');
  }
  await page.goto(`/#/inspect/${start}`);
  await expect(page.getByTestId('unavailable')).toContainText('locked until tomorrow');
  await expect(page.getByRole('button', { name: /Begin inspection/i })).toHaveCount(0);
  await page.goto(`/#/map/${start}`);
  await expect(page.getByTestId('lock-message')).toBeVisible();
  await axeClean(page, 'locked panel');
});

test('placement flow: a planned portfolio building is placed with five right answers', async ({ page }) => {
  const id = pickPortfolio();
  await page.goto(`/#/map/${id}`);
  await expect(page.locator('dialog[open] [data-kind="state"]')).toContainText('Planned');
  await link(page, 'Placement check').tap();
  await expect(page.getByText(/counts as today/i)).toBeVisible();
  await page.getByRole('button', { name: /Begin placement check/i }).tap();
  await answerAll(page, 5, [true, true, true, true, true]);
  await expect(page.getByRole('heading', { level: 2 })).toContainText('passed');
  await expect(page.getByTestId('summary')).toContainText('Placed and commissioned');
  await link(page, 'Back to the building').tap();
  await expect(page.locator('dialog[open]')).toContainText('Placed');
  await expect(page.locator('dialog[open] [data-kind="state"]')).toContainText('Commissioned');
});

test('a failed placement uses the day: a second try is refused', async ({ page }) => {
  const id = pickPortfolio();
  await page.goto(`/#/place/${id}`);
  await page.getByRole('button', { name: /Begin placement check/i }).tap();
  await answerAll(page, 5, [true, true, true, true, false]);
  await expect(page.getByRole('heading', { level: 2 })).toContainText('not passed');
  await page.goto(`/#/place/${id}`);
  await expect(page.getByTestId('unavailable')).toContainText('already used today');
});

test('flag a question and export the flags', async ({ page }) => {
  const { start } = pickChain();
  await page.goto(`/#/map/${start}`);
  await link(page, 'Open the study notes').tap();
  await page.goto(`/#/map/${start}`);
  await link(page, 'Start-up check').tap();
  await page.getByRole('button', { name: /Begin start-up check/i }).tap();
  await answerAll(page, 2, [true, false]);
  const card = page.getByTestId('result-card').first();
  await card.getByRole('button', { name: 'Flag this question' }).tap();
  await card.getByLabel(/What is wrong or unclear/).fill('Option B reads oddly');
  await card.getByRole('button', { name: 'Save flag' }).tap();
  await expect(card.getByTestId('flag-done')).toContainText('Option B reads oddly');
  await axeClean(page, 'result with flag');
  await page.goto('/#/map');
  await page.locator('summary', { hasText: 'Settings' }).tap();
  await expect(page.getByTestId('flag-list')).toContainText('Option B reads oddly');
  await axeClean(page, 'settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export flags' }).tap();
  const file = await download;
  expect(file.suggestedFilename()).toBe('region-builder-flags.txt');
  const text = await page.getByTestId('flags-export').innerText();
  expect(text).toContain('My note: Option B reads oddly');
  expect(text).toMatch(/Question: [a-z0-9-]+-\d{3}/);
  expect(text).toContain('My answer:');
  expect(text).toContain('The key:');
  // The exported question id is a real question.
  const id = /Question: ([a-z0-9-]+-\d{3})/.exec(text)?.[1];
  expect(questions().some((q) => q.id === id)).toBe(true);
});
