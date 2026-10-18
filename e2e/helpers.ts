import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';

interface Q {
  id: string;
  building: string;
  bullets: string[];
  tags: string[];
  stem: string;
  select: number;
  options: { text: string; correct: boolean }[];
}
export interface PuzzleDump {
  type: string;
  id: string;
  building: string;
  title: string;
  fields: { id: string; multi: boolean; correct: string[] }[];
  reference: { short: string; kindLabel: string; cell: string }[] | null;
}
export interface LabDump {
  id: string;
  n: number;
  title: string;
  building: string;
  stepIds: string[];
  required: string[];
  sensitiveStep: string | null;
}
interface Dump {
  labs: LabDump[];
  puzzles: PuzzleDump[];
  buildingIds: string[];
  chain: { start: string; dependent: string };
  portfolio: string;
  names: Record<string, string>;
  questions: Q[];
}

let dump: Dump | null = null;
const data = (): Dump => {
  dump ??= JSON.parse(execFileSync('npx', ['tsx', 'e2e/dump.ts'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })) as Dump;
  return dump;
};
export const questions = (): Q[] => data().questions;
export const buildingName = (id: string): string => data().names[id] as string;
export const labDump = (): LabDump[] => data().labs;
export const puzzleDump = (): PuzzleDump[] => data().puzzles;
export const allBuildingIds = (): string[] => data().buildingIds;
export const pickChain = (): { start: string; dependent: string } => data().chain;
export const pickPortfolio = (): string => data().portfolio;

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

export async function axeClean(page: Page, label: string): Promise<void> {
  const r = await new AxeBuilder({ page }).analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${label}: ${v.id} (${v.impact}) ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`), `axe on ${label}`).toEqual([]);
}

export async function noSidewaysScroll(page: Page): Promise<void> {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(over).toBeLessThanOrEqual(1);
}

/** Taps the options of the question on screen: the keyed ones when `right`, otherwise wrong ones. */
export async function answerCurrent(page: Page, right: boolean): Promise<string> {
  const stem = norm(await page.getByTestId('stem').innerText());
  const q = questions().find((x) => norm(x.stem) === stem);
  if (!q) throw new Error(`question not found for stem: ${stem.slice(0, 60)}`);
  const rows = page.locator('.option-row');
  const texts = (await rows.allInnerTexts()).map((t) => norm(t).replace(/^[A-H]\.\s*/, ''));
  const want = right
    ? q.options.filter((o) => o.correct)
    : q.options.filter((o) => !o.correct).slice(0, q.select);
  for (const o of want) {
    const i = texts.indexOf(norm(o.text));
    if (i < 0) throw new Error(`option not on screen: ${o.text.slice(0, 50)}`);
    await rows.nth(i).tap();
  }
  await page.getByRole('button', { name: /Submit/ }).tap();
  return q.id;
}

export async function answerAll(page: Page, count: number, pattern: boolean[]): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await expect(page.getByTestId('progress')).toContainText(`Question ${i + 1} of ${count}`);
    await answerCurrent(page, pattern[i] ?? true);
  }
}

export const link = (page: Page, name: RegExp | string): Locator => page.getByRole('link', { name });
