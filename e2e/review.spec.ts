import { expect, test, type Page } from '@playwright/test';
import { allBuildingIds, answerCurrent, axeClean, noSidewaysScroll, questions } from './helpers';

const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString();
const live = (building: string) => questions().filter((q) => q.building === building && !q.tags.includes('mock-reserve'));

/** A v5 save: every building commissioned except the ones given, plus whatever game fields the test needs. */
const seed = (game: Record<string, unknown>, uncommissioned: string[] = []) => {
  const buildings: Record<string, unknown> = {};
  for (const id of allBuildingIds()) if (!uncommissioned.includes(id)) buildings[id] = { state: 'commissioned', changedAt: '2026-01-01T00:00:00.000Z', via: 'inspection' };
  return JSON.stringify({ version: 5, updatedAt: '2026-01-01T00:00:00.000Z', buildings, ui: { view: 'map', lastBuilding: null, roads: 'selected' }, game, labs: {} });
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
const stored = (page: Page) =>
  page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('saa-region-builder:save') ?? '{}') as {
        buildings: Record<string, { state: string }>;
        game: { history: Record<string, { lastKind: string; n: number }>; reviewDay: { day: string; done: number }; maint: Record<string, string>; log: [string, number, string, string][]; review: unknown };
      },
  );

const history = (ids: string[], daysAgo: number, ok: 0 | 1) => Object.fromEntries(ids.map((id) => [id, { n: 1, ok, streak: ok, last: iso(daysAgo), lastOk: ok, lastKind: 'inspection' }]));
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

test('a daily review session: due questions first, the cap, answers counted, no building changes', async ({ page }) => {
  const ids = live('gatehouse').slice(0, 4).map((q) => q.id);
  // 19 answers already done today leaves 6 of the 25: 4 are due (misses from 3 days ago) and 2 come from the weakest bullets.
  const game = { history: history(ids, 3, 0), reviewDay: { day: localToday(), done: 19 }, byBullet: { '1.2-S1': '0001' }, statsBackfilled: true };
  await load(page, seed(game), '#/review');
  await expect(page.getByRole('heading', { level: 2, name: 'Daily review' })).toBeVisible();
  await expect(page.getByTestId('review-plan')).toContainText('4 due now');
  await expect(page.getByTestId('review-plan')).toContainText('6 of 25 answers left today');
  await axeClean(page, 'daily review start');
  await noSidewaysScroll(page);
  const xp0 = await xp(page);
  const buildings0 = JSON.stringify((await stored(page)).buildings);
  await page.getByTestId('start-review').tap();
  for (let i = 0; i < 6; i += 1) {
    await expect(page.getByTestId('progress')).toContainText(`Question ${i + 1} of 6`);
    if (i === 0) {
      await axeClean(page, 'review question');
      await noSidewaysScroll(page);
    }
    await answerCurrent(page, true);
  }
  await expect(page.getByTestId('review-summary')).toContainText('6 of 6 correct');
  await axeClean(page, 'review result');
  expect(await xp(page)).toBeGreaterThan(xp0);
  const s = await stored(page);
  expect(JSON.stringify(s.buildings)).toBe(buildings0);
  expect(s.game.reviewDay).toEqual({ day: localToday(), done: 25 });
  expect(s.game.log.filter((e) => e[3] === 'review')).toHaveLength(6);
  expect(s.game.history[ids[0] as string]).toMatchObject({ lastKind: 'review', n: 2 });
  // The cap is now used up.
  await page.goto('/#/map');
  await page.goto('/#/review');
  await expect(page.getByTestId('review-plan')).toContainText('cap of 25 is reached');
  await expect(page.getByTestId('start-review')).toBeDisabled();
});

test('leaving a review keeps the answers given and the rest stay due', async ({ page }) => {
  const ids = live('gatehouse').slice(0, 3).map((q) => q.id);
  await load(page, seed({ history: history(ids, 3, 0), reviewDay: { day: localToday(), done: 22 }, statsBackfilled: true }), '#/review');
  await page.getByTestId('start-review').tap();
  await answerCurrent(page, true);
  await page.getByTestId('review-leave').tap();
  const s = await stored(page);
  expect(s.game.review).toBeNull();
  expect(s.game.reviewDay.done).toBe(23);
  expect(s.game.log.filter((e) => e[3] === 'review')).toHaveLength(1);
});

test('a building with poor review accuracy shows "needs maintenance"; a 5-question set fixes it without touching commissioning', async ({ page }) => {
  const ids = live('gatehouse').slice(0, 6).map((q) => q.id);
  await load(page, seed({ history: history(ids, 2, 0), maint: { gatehouse: '00010' }, statsBackfilled: true }), '#/map');
  const card = page.locator('[data-building="gatehouse"]');
  await expect(card).toContainText('Needs maintenance');
  await axeClean(page, 'map with maintenance mark');
  await card.tap();
  await expect(page.getByTestId('maintenance-section')).toBeVisible();
  await page.getByTestId('maintenance-link').tap();
  await expect(page.getByRole('heading', { level: 2, name: 'Maintenance: Gatehouse' })).toBeVisible();
  await expect(page.getByTestId('maintenance-status')).toContainText('1 of 5 right');
  await axeClean(page, 'maintenance start');
  await page.getByTestId('start-maintenance').tap();
  const seen: string[] = [];
  for (let i = 0; i < 5; i += 1) {
    await expect(page.getByTestId('progress')).toContainText(`Question ${i + 1} of 5`);
    seen.push(await answerCurrent(page, true));
  }
  // Recent misses come first: the five asked include the questions that were missed before.
  expect(seen.filter((id) => ids.includes(id)).length).toBeGreaterThanOrEqual(5);
  await expect(page.getByTestId('review-summary')).toContainText('5 of 5 correct');
  const s = await stored(page);
  expect(s.buildings.gatehouse?.state).toBe('commissioned');
  expect(s.game.maint.gatehouse).toBe('0001011111'.slice(-8));
  await page.goto('/#/map');
  await expect(page.locator('[data-building="gatehouse"]')).not.toContainText('Needs maintenance');
});

test('Weak Spots ranks bullets with their answer counts, the pairs missed, weak families and flagged questions', async ({ page }) => {
  const q = live('gatehouse')[0];
  if (!q) throw new Error('no question');
  const game = {
    byBullet: { '1.2-S1': '0001', '1.2-S2': '1111', '1.2-K3': '01' },
    traps: { 'sg-vs-nacl': { n: 4, miss: 3 } },
    statsBackfilled: true,
    flags: [{ id: 'f1', questionId: q.id, note: 'unclear wording', myAnswer: [0], at: '2026-01-01T00:00:00.000Z' }],
  };
  await load(page, seed(game), '#/weak');
  await expect(page.getByRole('heading', { level: 2, name: 'Weak Spots' })).toBeVisible();
  const rows = page.getByTestId('weak-row');
  await expect(rows.first()).toContainText('1.2-S1');
  await expect(rows.first().getByTestId('weak-score')).toContainText('1 of 4 right');
  await expect(rows.first().getByRole('link', { name: /Notes:/ })).toBeVisible();
  await expect(rows.nth(1)).toContainText('1.2-S2');
  await expect(rows.nth(2).getByTestId('weak-score')).toContainText('Not enough data (2 answers)');
  await expect(page.getByTestId('weak-traps')).toContainText('missed 3 of 4');
  await expect(page.getByTestId('weak-families')).toBeVisible();
  await expect(page.getByTestId('weak-flags')).toContainText('unclear wording');
  await axeClean(page, 'weak spots');
  await noSidewaysScroll(page);
  // The Service Atlas marks a weak family.
  await page.goto('/#/atlas');
  await expect(page.locator('[data-kind="weak-family"]').first()).toBeVisible();
});
