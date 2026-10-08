import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUILDINGS, FAMILIES } from '../data';
import { SaveContext } from '../save/context';
import { createSaveStore } from '../save/store';
import Atlas from './Atlas';
import { CityMap } from './CityMap';

const known = new Set(BUILDINGS.map((b) => b.id));

function setup(desktop = false) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: desktop && q.includes('min-width'),
    media: q,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  const store = createSaveStore({ knownIds: known, storage: null, now: () => '2026-01-01T00:00:00.000Z' });
  return store;
}

beforeEach(() => {
  window.location.hash = '';
});

describe('CityMap', () => {
  it('renders every building as a button inside five districts', () => {
    const store = setup();
    render(
      <SaveContext.Provider value={store}>
        <CityMap view="map" activeId={null} />
      </SaveContext.Provider>,
    );
    expect(document.querySelectorAll('button.building')).toHaveLength(66);
    expect(screen.getAllByRole('region')).toHaveLength(5);
    expect(document.body.textContent).toMatch(/0\s*of 66 buildings commissioned/);
  });

  it('shows foundations as surveyed and locked buildings as planned, with what they need', () => {
    const store = setup();
    render(
      <SaveContext.Provider value={store}>
        <CityMap view="map" activeId={null} />
      </SaveContext.Provider>,
    );
    expect(document.querySelector('[data-building="pillar-plaza"]')).toHaveAttribute('data-state', 'surveyed');
    const gate = document.querySelector('[data-building="gatehouse"]') as HTMLElement;
    expect(gate).toHaveAttribute('data-state', 'planned');
    expect(within(gate).getByText(/Needs: Grid Planning Office/)).toBeInTheDocument();
  });

  it('unlocks a building when its prerequisites are commissioned, and updates the count', () => {
    const store = setup();
    render(
      <SaveContext.Provider value={store}>
        <CityMap view="map" activeId={null} />
      </SaveContext.Provider>,
    );
    act(() => {
      store.setBuildingState('safe-harbor-account', 'commissioned');
    });
    expect(document.querySelector('[data-building="identity-keep"]')).toHaveAttribute('data-state', 'surveyed');
    expect(document.body.textContent).toMatch(/1\s*of 66 buildings commissioned/);
  });

  it('opens a building by keyboard (Enter) through the hash route', async () => {
    const store = setup();
    render(
      <SaveContext.Provider value={store}>
        <CityMap view="map" activeId={null} />
      </SaveContext.Provider>,
    );
    const user = userEvent.setup();
    const card = document.querySelector('[data-building="key-vault"]') as HTMLElement;
    card.focus();
    await user.keyboard('{Enter}');
    expect(window.location.hash).toBe('#/map/key-vault');
  });
});

describe('Atlas', () => {
  it('groups every non-foundation building under its families, across districts', () => {
    const store = setup();
    render(
      <SaveContext.Provider value={store}>
        <Atlas view="atlas" activeId={null} />
      </SaveContext.Provider>,
    );
    expect(document.querySelectorAll('section[id^="family-"]')).toHaveLength(FAMILIES.length);
    const storage = document.getElementById('family-storage') as HTMLElement;
    expect(within(storage).getByText('Cold Cellar')).toBeInTheDocument();
    expect(within(storage).getByText('Freight Depot')).toBeInTheDocument();
    expect(within(storage).getByText('The Treasury')).toBeInTheDocument();
    expect(within(storage).getByText('Express Quarter')).toBeInTheDocument();
  });
});
