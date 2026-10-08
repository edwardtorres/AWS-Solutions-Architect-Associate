import { useSyncExternalStore } from 'react';

export type View = 'map' | 'atlas';
export interface Route {
  view: View;
  /** Building whose detail panel is open, if any. */
  building: string | null;
}

/** Hash routes work on any static host without rewrite rules: #/map, #/atlas, #/map/<id>, #/atlas/<id>. */
export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const view: View = parts[0] === 'atlas' ? 'atlas' : 'map';
  const building = parts[1] ? decodeURIComponent(parts[1]) : null;
  return { view, building };
}

export function hrefFor(route: Route): string {
  return `#/${route.view}${route.building ? `/${encodeURIComponent(route.building)}` : ''}`;
}

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
