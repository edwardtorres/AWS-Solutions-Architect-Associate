// SAA_DEV_HOOKS_SENTINEL: this module must never ship. It is only reachable behind
// `import.meta.env.DEV`, and `npm run check:bundle` fails if this string is in dist/.
import type { SaveStore } from '../save/store';

/** A string literal (comments are stripped by the minifier) that `check:bundle` searches dist/ for. */
export const DEV_SENTINEL = 'SAA_DEV_HOOKS_SENTINEL';

/** Reads ?seed=<int> so shuffles can be reproduced while developing. */
export function installDevHooks(store: SaveStore): void {
  const seed = new URLSearchParams(window.location.search).get('seed');
  if (seed !== null && /^-?\d+$/.test(seed)) globalThis.__SAA_SEED__ = Number(seed);
  (window as unknown as { __saaDev: { store: SaveStore; sentinel: string } }).__saaDev = { store, sentinel: DEV_SENTINEL };
}
