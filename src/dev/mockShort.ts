// Development only (imported under `import.meta.env.DEV`), and `npm run check:bundle` fails if this marker is in dist/.
export const DEV_MOCK_SHORT_MARKER = 'SAA_DEV_MOCK_SHORT';

/** `?mock=short` in the page address asks for the 10-question practice mock (same pipeline, never counts towards "ready to book"). */
export function shortMockRequested(): boolean {
  return new URLSearchParams(window.location.search).get('mock') === 'short';
}
