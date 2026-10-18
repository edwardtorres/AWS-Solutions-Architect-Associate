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
  it('parses attempt and progress routes without opening a panel', () => {
    expect(parseHash('#/startup/gatehouse')).toEqual({ view: 'startup', building: null, param: 'gatehouse' });
    expect(parseHash('#/inspect/gatehouse')).toEqual({ view: 'inspect', building: null, param: 'gatehouse' });
    expect(parseHash('#/place/embassy-row')).toEqual({ view: 'place', building: null, param: 'embassy-row' });
    expect(parseHash('#/progress')).toEqual({ view: 'progress', building: null, param: null });
    expect(parseHash('#/workbench/gatehouse')).toEqual({ view: 'workbench', building: null, param: 'gatehouse' });
    expect(parseHash('#/puzzle/packet-tracer-001')).toEqual({ view: 'puzzle', building: null, param: 'packet-tracer-001' });
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

describe('mock routes', () => {
  it('parses a third segment for a question number or a result id and round-trips it', () => {
    expect(parseHash('#/mock')).toEqual({ view: 'mock', building: null, param: null });
    expect(parseHash('#/mock/run/12')).toEqual({ view: 'mock', building: null, param: 'run', extra: '12' });
    expect(parseHash('#/mock/result/mock-2026')).toMatchObject({ param: 'result', extra: 'mock-2026' });
    expect(hrefFor(parseHash('#/mock/run/12'))).toBe('#/mock/run/12');
    expect(hrefFor(parseHash('#/mock/review'))).toBe('#/mock/review');
  });
});
