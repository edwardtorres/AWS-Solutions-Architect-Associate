import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUILDINGS } from '../../data';
import { SaveContext } from '../../save/context';
import { createSaveStore } from '../../save/store';
import { loadScenario } from '../../puzzles/load';
import PuzzlePage from './PuzzlePage';
import WorkbenchPage from './WorkbenchPage';

const known = new Set(BUILDINGS.map((b) => b.id));
const storeAround = (target: string | null) => {
  const store = createSaveStore({ knownIds: known, storage: null, now: () => '2026-01-01T00:00:00.000Z' });
  for (const b of BUILDINGS) if (b.id !== target) store.setBuildingState(b.id, 'commissioned');
  return store;
};
const show = (store: ReturnType<typeof storeAround>, ui: React.ReactElement) => render(<SaveContext.Provider value={store}>{ui}</SaveContext.Provider>);

describe('Workbench and puzzle pages', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
  });

  it('locks the Workbench and the puzzle while the building is planned', async () => {
    const store = createSaveStore({ knownIds: known, storage: null });
    show(store, <PuzzlePage scenarioId="puzzle-purchase-planner-001" />);
    expect(await screen.findByTestId('workbench-locked')).toBeInTheDocument();
    expect(store.getSnapshot().save.game.xp).toBe(0);
  });

  it('lists the building’s puzzles once it is surveyed', async () => {
    show(storeAround('counting-house'), <WorkbenchPage buildingId="counting-house" />);
    const list = await screen.findByTestId('workbench-list');
    expect(list.querySelectorAll('a').length).toBeGreaterThanOrEqual(10);
  });

  it('solving a puzzle with the computed answer raises XP and leaves every building state alone', async () => {
    const store = storeAround('counting-house');
    const before = JSON.stringify(store.getSnapshot().save.buildings);
    const found = await loadScenario('puzzle-purchase-planner-001');
    if (!found) throw new Error('scenario missing');
    const ev = found.module.def.evaluate(found.scenario.data);
    if (!ev) throw new Error('refused');
    const fields = found.module.def.fields(found.scenario.data);
    show(store, <PuzzlePage scenarioId="puzzle-purchase-planner-001" />);
    await screen.findByText(found.scenario.title);
    for (const f of fields) {
      for (const id of ev.answer[f.id] ?? []) {
        const label = f.options.find((o) => o.id === id)?.label as string;
        await userEvent.click(screen.getByLabelText(label));
      }
    }
    await userEvent.click(screen.getByRole('button', { name: 'Check my answer' }));
    await waitFor(() => { expect(screen.getByTestId('puzzle-verdict')).toHaveTextContent('Correct.'); });
    expect(store.getSnapshot().save.game.xp).toBeGreaterThan(0);
    expect(JSON.stringify(store.getSnapshot().save.buildings)).toBe(before);
    expect(store.getSnapshot().save.game.log.at(-1)?.[3]).toBe('puzzle');
  });

  it('a wrong answer earns nothing but is still logged', async () => {
    const store = storeAround('counting-house');
    const found = await loadScenario('puzzle-purchase-planner-001');
    if (!found) throw new Error('scenario missing');
    const ev = found.module.def.evaluate(found.scenario.data);
    const fields = found.module.def.fields(found.scenario.data);
    show(store, <PuzzlePage scenarioId="puzzle-purchase-planner-001" />);
    await screen.findByText(found.scenario.title);
    const f = fields[0] as (typeof fields)[number];
    const wrong = f.options.find((o) => !(ev?.answer[f.id] ?? []).includes(o.id)) as (typeof f.options)[number];
    await userEvent.click(screen.getByLabelText(wrong.label));
    await userEvent.click(screen.getByRole('button', { name: 'Check my answer' }));
    await waitFor(() => { expect(screen.getByTestId('puzzle-verdict')).toHaveTextContent('Not quite.'); });
    expect(store.getSnapshot().save.game.xp).toBe(0);
    expect(store.getSnapshot().save.game.log.at(-1)?.[1]).toBe(0);
  });

  it('Submit stays disabled until every field has an answer', async () => {
    const store = storeAround('counting-house');
    show(store, <PuzzlePage scenarioId="puzzle-purchase-planner-001" />);
    const btn = await screen.findByRole('button', { name: 'Check my answer' });
    expect(btn).toBeDisabled();
  });
});
