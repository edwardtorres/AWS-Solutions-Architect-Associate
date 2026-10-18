import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { allBuildingIds, answerCurrent, axeClean, labDump, noSidewaysScroll } from './helpers';

/** A v3 save (migrated to v4 on load) with no buildings built. */
const EMPTY = JSON.stringify({ version: 3, updatedAt: '2026-01-01T00:00:00.000Z', buildings: {}, ui: { view: 'map', lastBuilding: null, roads: 'selected' }, game: {} });

async function load(page: Page, hash: string): Promise<void> {
  await page.goto('/');
  await page.evaluate((s) => {
    localStorage.setItem('saa-region-builder:save', s);
  }, EMPTY);
  await page.goto('/#/map');
  await page.goto(`/${hash}`);
  await page.reload();
}
const xp = async (page: Page) => Number(/(\d[\d,]*) XP/.exec(await page.getByTestId('rank-chip').innerText())?.[1]?.replace(/,/g, '') ?? '0');
const stored = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('saa-region-builder:save') ?? '{}') as { buildings: unknown; labs: { accountCreated: string | null; progress: Record<string, { steps: Record<string, true>; notes: Record<string, string>; ack?: true; completedAt?: string; debrief?: { finishedAt?: string } }> } });

test('the Labs page lists every lab in order, has no sideways scroll and passes axe', async ({ page }) => {
  await load(page, '#/labs');
  await expect(page.getByRole('heading', { level: 2, name: 'Hands-on labs' })).toBeVisible();
  await expect(page.getByTestId('lab-item')).toHaveCount(labDump().length);
  await expect(page.getByTestId('plan-badge').first()).toBeVisible();
  await axeClean(page, 'labs page');
  await noSidewaysScroll(page);
});

test('the account clock shows the share of the 6-month window left and a schedule', async ({ page }) => {
  await load(page, '#/labs');
  const created = new Date(Date.now() - 20 * 86_400_000);
  const day = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`;
  await page.getByLabel('Lab account created on').fill(day);
  await expect(page.getByTestId('clock-status')).toContainText(/days left of the 6-month window/);
  await expect(page.getByTestId('schedule')).toBeVisible();
  await axeClean(page, 'account clock');
  await noSidewaysScroll(page);
  expect((await stored(page)).labs.accountCreated).toBe(day);
});

test('the Workshop section in a mapped building’s panel opens its lab', async ({ page }) => {
  const lab = labDump()[0];
  if (!lab) throw new Error('no labs');
  await load(page, `#/map/${lab.building}`);
  const link = page.getByTestId('workshop-link').first();
  await expect(link).toBeVisible();
  await axeClean(page, 'workshop section');
  await link.tap();
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
  expect(page.url()).toMatch(/#\/lab\/lab-/);
});

test('open a lab, tick steps, report and export a problem, complete it, answer the debrief; no building changes', async ({ page }) => {
  const lab = labDump()[0];
  if (!lab) throw new Error('no labs');
  await load(page, `#/lab/${lab.id}`);
  await expect(page.getByRole('heading', { level: 2, name: lab.title })).toBeVisible();
  await axeClean(page, 'lab page');
  await noSidewaysScroll(page);
  const xp0 = await xp(page);
  const buildings0 = JSON.stringify((await stored(page)).buildings);

  // The debrief and completion are locked until the cleanup is ticked.
  await expect(page.getByTestId('debrief-locked')).toBeVisible();
  await expect(page.getByTestId('complete-lab')).toBeDisabled();

  // Tick the first step and report a problem on it.
  const first = page.getByTestId('lab-step').first();
  await first.getByRole('checkbox').tap();
  await expect(first).toHaveAttribute('data-ticked', 'true');
  await first.getByRole('button', { name: 'Report a problem' }).tap();
  await first.getByRole('textbox').fill('The screen did not match step one.');
  await first.getByRole('button', { name: 'Edit the problem note' }).tap();
  await expect(first.getByTestId('note-saved')).toBeVisible();

  // Sensitive steps carry the privacy warning.
  if (lab.sensitiveStep) await expect(page.locator(`#step-${lab.sensitiveStep}`).getByTestId('sensitive-warning')).toBeVisible();

  // Export the notes as a text file.
  const download = page.waitForEvent('download');
  await page.getByTestId('export-notes').tap();
  const file = await (await download).path();
  const text = readFileSync(file, 'utf8');
  expect(text).toContain('The screen did not match step one.');
  expect(text).toContain(lab.title);
  expect(text).not.toMatch(/\b\d{12}\b/);

  // Tick the whole cleanup checklist and the verification, then complete the lab.
  for (const id of lab.required) await page.locator(`#step-${id}`).getByRole('checkbox').tap();
  await axeClean(page, 'lab page, cleanup ticked');
  await page.getByTestId('complete-lab').tap();
  await expect(page.getByTestId('lab-complete')).toBeVisible();
  expect(await xp(page)).toBe(xp0 + 100);

  // Debrief: three questions, then the key.
  await page.getByTestId('start-debrief').tap();
  for (let i = 0; i < 3; i += 1) {
    await expect(page.getByTestId('progress')).toContainText(`Question ${i + 1} of 3`);
    await answerCurrent(page, true);
  }
  await expect(page.getByTestId('debrief-summary')).toContainText('3 of 3 correct');
  await axeClean(page, 'debrief result');
  await noSidewaysScroll(page);
  expect(await xp(page)).toBeGreaterThan(xp0 + 100);

  const s = await stored(page);
  expect(JSON.stringify(s.buildings)).toBe(buildings0);
  expect(JSON.stringify(s.buildings)).toBe('{}');
  expect(s.labs.progress[lab.id]?.completedAt).toBeTruthy();
  expect(s.labs.progress[lab.id]?.notes[lab.stepIds[0] as string]).toContain('did not match');
  expect(allBuildingIds().length).toBeGreaterThan(0);
});

test('every lab page has no sideways scroll and passes axe', async ({ page }) => {
  test.setTimeout(240_000);
  await load(page, '#/labs');
  for (const lab of labDump()) {
    await page.goto('/#/labs');
    await page.goto(`/#/lab/${lab.id}`);
    await expect(page.getByRole('heading', { level: 2, name: lab.title })).toBeVisible();
    await axeClean(page, lab.id);
    await noSidewaysScroll(page);
  }
});

test('Lab 3 is listed last, hides its steps behind an acknowledgement and offers a read-only walkthrough', async ({ page }) => {
  await load(page, '#/labs');
  const items = page.getByTestId('lab-item');
  await expect(items.last()).toContainText('Multi-account basics');
  await expect(items.last()).toContainText('Scheduled last');
  await page.goto('/#/lab/lab-03-multi-account');
  await expect(page.getByTestId('lab-gate')).toContainText('ends the Free plan');
  await expect(page.getByTestId('lab-steps')).toHaveCount(0);
  await expect(page.getByTestId('complete-lab')).toHaveCount(0);
  await axeClean(page, 'lab 3 gate');
  await noSidewaysScroll(page);
  // The read-only walkthrough shows the steps with nothing to tick.
  await page.getByTestId('gate-read').tap();
  await expect(page.getByTestId('lab-step').first()).toBeVisible();
  await expect(page.getByTestId('lab-step').first().getByRole('checkbox')).toHaveCount(0);
  await expect(page.getByTestId('complete-lab')).toHaveCount(0);
  await axeClean(page, 'lab 3 walkthrough');
  // Acknowledging unlocks the real lab.
  await page.getByTestId('gate-ack').tap();
  await expect(page.getByTestId('gate-acknowledged')).toBeVisible();
  await expect(page.getByTestId('lab-step').first().getByRole('checkbox')).toBeVisible();
  await expect(page.getByTestId('complete-lab')).toBeVisible();
  expect((await stored(page)).labs.progress['lab-03-multi-account']).toMatchObject({ ack: true });
  await axeClean(page, 'lab 3 unlocked');
});
