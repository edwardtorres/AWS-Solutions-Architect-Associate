import { mulberry32 } from './shuffle';
export { mulberry32, shuffle } from './shuffle';

declare global {
  // Set only by the dev-build hooks (src/dev/devHooks.ts). Never present in production.
  var __SAA_SEED__: number | undefined;
}

/**
 * A random source for render-time shuffling. In dev builds `?seed=` makes it
 * deterministic; production builds always use unpredictable randomness.
 */
export function renderRandom(): () => number {
  if (import.meta.env.DEV && typeof globalThis.__SAA_SEED__ === 'number') {
    return mulberry32(globalThis.__SAA_SEED__);
  }
  return Math.random;
}
