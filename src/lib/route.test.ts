import { describe, expect, it } from 'vitest';
import { hrefFor, parseHash } from './route';

describe('hash routes', () => {
  it('defaults to the map', () => {
    expect(parseHash('')).toEqual({ view: 'map', building: null, param: null });
    expect(parseHash('#/')).toEqual({ view: 'map', building: null, param: null });
    expect(parseHash('#/nonsense')).toEqual({ view: 'map', building: null, param: null });
  });
  it('parses views and building panels', () => {
    expect(parseHash('#/atlas')).toEqual({ view: 'atlas', building: null, param: null });
    expect(parseHash('#/map/gatehouse')).toEqual({ view: 'map', building: 'gatehouse', param: 'gatehouse' });
    expect(parseHash('#/atlas/cold-cellar')).toEqual({ view: 'atlas', building: 'cold-cellar', param: 'cold-cellar' });
  });
  it('parses notes, glossary and confuse routes without opening a panel', () => {
    expect(parseHash('#/notes/gatehouse')).toEqual({ view: 'notes', building: null, param: 'gatehouse' });
    expect(parseHash('#/glossary/vpc')).toEqual({ view: 'glossary', building: null, param: 'vpc' });
    expect(parseHash('#/confuse')).toEqual({ view: 'confuse', building: null, param: null });
  });
  it('round-trips through hrefFor', () => {
    for (const r of [
      { view: 'map', building: null, param: null },
      { view: 'atlas', building: 'key-vault', param: 'key-vault' },
      { view: 'notes', building: null, param: 'key-vault' },
    ] as const) {
      expect(parseHash(hrefFor(r))).toEqual(r);
    }
  });
});
