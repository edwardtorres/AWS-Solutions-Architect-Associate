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

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * The option shuffle for one question inside one attempt: stable for the attempt (the same seed and question
 * always give the same order, so a reload does not move the answers) but different for every attempt.
 * In dev builds `?seed=` is mixed in so end-to-end runs can be reproduced.
 */
export function attemptRandom(attemptSeed: number, questionId: string): () => number {
  const dev = import.meta.env.DEV && typeof globalThis.__SAA_SEED__ === 'number' ? globalThis.__SAA_SEED__ : 0;
  return mulberry32((attemptSeed ^ hash(questionId) ^ dev) >>> 0);
}
