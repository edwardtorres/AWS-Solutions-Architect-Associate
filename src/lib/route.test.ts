import { describe, expect, it } from 'vitest';
import { hrefFor, parseHash } from './route';

describe('hash routes', () => {
  it('defaults to the map', () => {
    expect(parseHash('')).toEqual({ view: 'map', building: null });
    expect(parseHash('#/')).toEqual({ view: 'map', building: null });
    expect(parseHash('#/nonsense')).toEqual({ view: 'map', building: null });
  });
  it('parses views and building panels', () => {
    expect(parseHash('#/atlas')).toEqual({ view: 'atlas', building: null });
    expect(parseHash('#/map/gatehouse')).toEqual({ view: 'map', building: 'gatehouse' });
    expect(parseHash('#/atlas/cold-cellar')).toEqual({ view: 'atlas', building: 'cold-cellar' });
  });
  it('round-trips through hrefFor', () => {
    for (const r of [
      { view: 'map', building: null },
      { view: 'atlas', building: 'key-vault' },
    ] as const) {
      expect(parseHash(hrefFor(r))).toEqual(r);
    }
  });
});
