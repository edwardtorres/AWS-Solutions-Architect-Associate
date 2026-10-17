import { useSyncExternalStore } from 'react';

export type View = 'map' | 'atlas' | 'notes' | 'glossary' | 'confuse' | 'startup' | 'inspect' | 'place' | 'progress' | 'workbench' | 'puzzle' | 'labs' | 'lab';
/** Views that can open a building's detail panel. */
export type PanelView = 'map' | 'atlas';

export interface Route {
  view: View;
  /** Building whose detail panel is open (map and atlas views only). */
  building: string | null;
  /** Second path segment: building id (notes), term id (glossary) or pair id (confuse). */
  param?: string | null;
}

const VIEWS: readonly View[] = ['map', 'atlas', 'notes', 'glossary', 'confuse', 'startup', 'inspect', 'place', 'progress', 'workbench', 'puzzle', 'labs', 'lab'];

/**
 * Hash routes work on any static host without rewrite rules:
 * #/map, #/atlas, #/map/<id>, #/atlas/<id>, #/notes/<id>, #/glossary[/<term>], #/confuse[/<pair>],
 * #/startup/<id>, #/inspect/<id>, #/place/<id> (an attempt on a building), #/workbench/<building>,
 * #/puzzle/<scenario>, #/labs, #/lab/<lab-id> and #/progress.
 * No route shows an answer key outside a finished attempt.
 */
export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const view = VIEWS.find((v) => v === parts[0]) ?? 'map';
  const param = parts[1] ? decodeURIComponent(parts[1]) : null;
  const building = view === 'map' || view === 'atlas' ? param : null;
  return { view, building, param };
}

export function hrefFor(route: Route): string {
  const seg = route.param ?? route.building;
  return `#/${route.view}${seg ? `/${encodeURIComponent(seg)}` : ''}`;
}

export const hrefNotes = (buildingId: string): string => hrefFor({ view: 'notes', building: null, param: buildingId });
export const hrefAttempt = (kind: 'startup' | 'inspect' | 'place', buildingId: string): string => hrefFor({ view: kind, building: null, param: buildingId });
export const hrefWorkbench = (buildingId: string): string => hrefFor({ view: 'workbench', building: null, param: buildingId });
export const hrefPuzzle = (scenarioId: string): string => hrefFor({ view: 'puzzle', building: null, param: scenarioId });
export const hrefLab = (labId: string): string => hrefFor({ view: 'lab', building: null, param: labId });
export const hrefProgress = (): string => '#/progress';
export const hrefGlossary = (termId?: string): string => hrefFor({ view: 'glossary', building: null, param: termId ?? null });
export const hrefConfuse = (pairId?: string): string => hrefFor({ view: 'confuse', building: null, param: pairId ?? null });

function subscribe(cb: () => void): () => void {
  window.addEventListener('hashchange', cb);
  return () => {
    window.removeEventListener('hashchange', cb);
  };
}

const getHash = () => window.location.hash;

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, () => '');
  return parseHash(hash);
}

export function navigate(route: Route): void {
  window.location.hash = hrefFor(route);
}
