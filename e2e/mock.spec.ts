import { expect, test, type Page } from '@playwright/test';
import { allBuildingIds, axeClean, noSidewaysScroll, questions } from './helpers';

/**
 * Runs against the Vite dev server (see playwright.config.ts), because the 10-question short mock (?mock=short) exists only in
 * development builds. `npm run check:bundle` proves it is absent from production.
 */
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
const live = () => questions().filter((q) => !q.tags.includes('mock-reserve') && !q.tags.includes('post-guide'));

const seed = (game: Record<string, unknown> = {}) =>
  JSON.stringify({ version: 5, updatedAt: '2026-01-01T00:00:00.000Z', buildings: {}, ui: { view: 'map', lastBuilding: null, roads: 'selected' }, game, labs: {} });

async function load(page: Page, save: string, url: string): Promise<void> {
  await page.goto('/');
  await page.evaluate((s) => {
    localStorage.setItem('saa-region-builder:save', s);
  }, save);
  await page.goto('/#/map');
  await page.goto(url);
  await page.reload();
}
const xp = async (page: Page) => Number(/(\d[\d,]*) XP/.exec(await page.getByTestId('rank-chip').innerText())?.[1]?.replace(/,/g, '') ?? '0');
const stored = (page: Page) =>
  page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('saa-region-builder:save') ?? '{}') as {
        buildings: Record<string, unknown>;
        game: { mock: { started: number; active: { questionIds: string[]; answers: Record<string, number[]>; flags: string[]; startedAt: string } | null; history: { id: string; correct: number; total: number; expired: boolean; counts: boolean; short: boolean; domains: Record<string, [number, number]> }[] } };
      },
  );

/** Selects the keyed option(s) of the question on screen (or a wrong one) without submitting: a mock saves each choice at once. */
async function choose(page: Page, right: boolean): Promise<string> {
  const stem = norm(await page.getByTestId('stem').innerText());
  const q = questions().find((x) => norm(x.stem) === stem);
  if (!q) throw new Error(`question not found: ${stem.slice(0, 60)}`);
  const rows = page.locator('.option-row');
  const texts = (await rows.allInnerTexts()).map((t) => norm(t).replace(/^[A-H]\.\s*/, ''));
  const want = right ? q.options.filter((o) => o.correct) : q.options.filter((o) => !o.correct).slice(0, q.select);
  for (const o of want) await rows.nth(texts.indexOf(norm(o.text))).tap();
  return q.id;
}

test('the mock page explains the format, the unscored questions and the scaled score', async ({ page }) => {
  await load(page, seed(), '/#/mock');
  await expect(page.getByRole('heading', { level: 2, name: 'Mock exam' })).toBeVisible();
  await expect(page.getByTestId('mock-unscored-note')).toContainText('15 are unscored');
  await expect(page.getByTestId('mock-scaled-note')).toContainText('720');
  await expect(page.getByTestId('mock-scaled-note')).toContainText('compensatory');
  await expect(page.getByTestId('ready-panel')).toHaveAttribute('data-ready', 'false');
  await expect(page.getByTestId('ready-panel')).toContainText('Official Practice Question Set');
  await expect(page.getByTestId('ready-panel').getByRole('link', { name: /Associate page/ })).toHaveAttribute('href', /aws\.amazon\.com\/certification/);
  await axeClean(page, 'mock home');
  await noSidewaysScroll(page);
});

test('a full-length mock starts with 65 questions and a 2:10 clock; discarding records nothing', async ({ page }) => {
  await load(page, seed(), '/#/mock');
  await expect(page.getByTestId('mock-start')).toContainText('65 questions, 130 minutes');
  await expect(page.getByTestId('mock-start')).toBeEnabled();
  await page.getByTestId('mock-start').tap();
  await expect(page.getByTestId('mock-position')).toContainText('Question 1 of 65');
  await expect(page.getByTestId('mock-clock')).toHaveText(/^2:(09:5\d|10:00)$/);
  const s = await stored(page);
  expect(s.game.mock.active?.questionIds).toHaveLength(65);
  expect(new Set(s.game.mock.active?.questionIds).size).toBe(65);
  await page.goto('/#/mock');
  await page.getByRole('button', { name: 'Discard this mock' }).tap();
  await page.getByTestId('mock-discard-yes').tap();
  const after = await stored(page);
  expect(after.game.mock.active).toBeNull();
  expect(after.game.mock.history).toHaveLength(0);
});

test('a short mock: answers saved as you go, flags, a review screen, a reload mid-mock, no feedback, then the results', async ({ page }) => {
  await load(page, seed(), '/?mock=short#/mock');
  await expect(page.getByTestId('mock-start')).toContainText('short practice mock');
  const xp0 = await xp(page);
  await page.getByTestId('mock-start').tap();
  await expect(page.getByTestId('mock-position')).toContainText('Question 1 of 10');
  await axeClean(page, 'mock question');
  await noSidewaysScroll(page);

  // No feedback while the exam runs: choosing an answer shows nothing about right or wrong.
  const first = await choose(page, true);
  await expect(page.locator('[data-testid="mock-score"], [data-testid="mock-items"], .result-card, [data-correct]')).toHaveCount(0);
  await expect(page.getByTestId('mock-position')).toContainText('Question 1 of 10');
  await page.getByTestId('mock-flag').tap();
  await page.getByTestId('mock-next').tap();
  await expect(page.getByTestId('mock-position')).toContainText('Question 2 of 10');
  await choose(page, true);
  await page.getByTestId('mock-next').tap();
  await choose(page, false);

  // The review screen lists every question with jump links.
  await page.getByTestId('mock-review-link').tap();
  await expect(page.getByTestId('mock-review-counts')).toContainText('3 answered, 7 unanswered, 1 flagged');
  await expect(page.getByTestId('mock-review-grid').getByRole('link')).toHaveCount(10);
  await axeClean(page, 'mock review screen');
  await noSidewaysScroll(page);
  const clockBefore = await page.getByTestId('mock-clock').innerText();

  // Reload in the middle: everything is still there and the clock kept running from the saved start.
  await page.reload();
  await expect(page.getByTestId('mock-review-counts')).toContainText('3 answered, 7 unanswered, 1 flagged');
  const clockAfter = await page.getByTestId('mock-clock').innerText();
  expect(clockAfter <= clockBefore).toBe(true);
  expect(clockAfter.startsWith('2:09') || clockAfter.startsWith('2:10')).toBe(true);
  await page.getByTestId('mock-review-grid').getByRole('link').first().tap();
  await expect(page.getByTestId('mock-position')).toContainText('Question 1 of 10');
  expect((await stored(page)).game.mock.active?.answers[first]).toBeTruthy();
  await expect(page.locator('.option-row[data-checked="true"]').first()).toBeVisible();

  // Answer questions 4 to 8 correctly, leave 9 and 10 blank.
  await page.getByTestId('mock-review-link').tap();
  for (let n = 4; n <= 8; n += 1) {
    await page.getByTestId('mock-review-grid').getByRole('link').nth(n - 1).tap();
    await expect(page.getByTestId('mock-position')).toContainText(`Question ${n} of 10`);
    await choose(page, true);
    await page.getByTestId('mock-review-link').tap();
  }
  await expect(page.getByTestId('mock-review-counts')).toContainText('8 answered, 2 unanswered, 1 flagged');
  const buildings0 = JSON.stringify((await stored(page)).buildings);

  await page.getByTestId('mock-submit').tap();
  await expect(page.getByRole('alertdialog')).toContainText('2 unanswered questions will count as wrong');
  await page.getByTestId('mock-submit-yes').tap();

  // Results.
  await expect(page.getByRole('heading', { level: 2, name: 'Mock result' })).toBeVisible();
  const s = await stored(page);
  const rec = s.game.mock.history[0];
  expect(rec).toBeDefined();
  // Questions 1 and 2 and 4 to 8 were answered right (7); question 3 was answered wrong; 9 and 10 were blank.
  expect(rec?.correct).toBe(7);
  await expect(page.getByTestId('mock-overall')).toContainText('70% raw (7 of 10)');
  await expect(page.getByTestId('mock-result-scaled-note')).toContainText('720 is a scaled score');
  await expect(page.getByTestId('mock-domains')).toBeVisible();
  await expect(page.getByTestId('mock-bullets')).toBeVisible();
  await expect(page.getByTestId('mock-items').locator('> li')).toHaveCount(10);
  await expect(page.getByTestId('mock-result-freshness')).toContainText('never counts');
  await axeClean(page, 'mock result');
  await noSidewaysScroll(page);
  expect(rec?.short).toBe(true);
  expect(rec?.counts).toBe(false);
  expect(await xp(page)).toBeGreaterThan(xp0);
  expect(JSON.stringify(s.buildings)).toBe(buildings0);
  expect(s.game.mock.active).toBeNull();

  // History on the mock page; a short practice mock never makes the player ready.
  await page.goto('/?mock=short#/mock');
  await expect(page.getByTestId('mock-history-item')).toHaveCount(1);
  await expect(page.getByTestId('mock-history-item')).toContainText('Short practice');
  await expect(page.getByTestId('ready-panel')).toHaveAttribute('data-ready', 'false');
  expect(allBuildingIds().length).toBeGreaterThan(0);
});

test('a mock whose time ran out while the app was closed is graded and submitted on load', async ({ page }) => {
  const pool = live().slice(0, 5);
  const ids = pool.map((q) => q.id);
  const right = pool[0]!.options.flatMap((o, i) => (o.correct ? [i] : []));
  const active = {
    id: 'mock-seeded',
    startedAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    durationMs: 130 * 60_000,
    short: true,
    questionIds: ids,
    seed: 4,
    answers: { [ids[0] as string]: right },
    flags: [],
    fresh: 5,
    counts: false,
    reserveUsed: 0,
  };
  await load(page, seed({ mock: { started: 1, active, history: [] } }), '/?mock=short#/mock');
  await expect(page.getByTestId('mock-history-item')).toHaveCount(1);
  await expect(page.getByTestId('mock-history-item')).toContainText('Submitted by the timer');
  await expect(page.getByTestId('mock-active')).toHaveCount(0);
  const s = await stored(page);
  expect(s.game.mock.active).toBeNull();
  expect(s.game.mock.history[0]).toMatchObject({ expired: true, total: 5, correct: 1 });
});

test('a mock whose clock runs out while it is open submits itself', async ({ page }) => {
  const pool = live().slice(0, 4);
  const ids = pool.map((q) => q.id);
  const active = {
    id: 'mock-almost',
    startedAt: new Date(Date.now() - (130 * 60_000 - 3_000)).toISOString(),
    durationMs: 130 * 60_000,
    short: true,
    questionIds: ids,
    seed: 2,
    answers: {},
    flags: [],
    fresh: 4,
    counts: false,
    reserveUsed: 0,
  };
  await load(page, seed({ mock: { started: 1, active, history: [] } }), '/?mock=short#/mock/run');
  await expect(page.getByTestId('mock-position')).toContainText('Question 1 of 4');
  await expect(page.getByRole('heading', { level: 2, name: 'Mock result' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('mock-overall')).toContainText('0% raw (0 of 4)');
  await expect(page.getByTestId('mock-score')).toContainText('timer ran out');
});
