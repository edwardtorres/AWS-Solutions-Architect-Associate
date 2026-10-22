/**
 * Exit codes for the checks that reach the network (check:freshness, check:freeplan, check:content -- --live):
 *   0  nothing changed
 *   1  a real change, or a failure the content must answer (a page that now 404s, a changed guide, a bug)
 *   2  a network-class failure: no connection, a timeout, a rate limit or a server error. It says nothing about the content.
 * The weekly watch (scripts/freshness-watch.ts) retries 2 and reports it as a warning, never as an issue.
 */
export const EXIT_OK = 0;
export const EXIT_CHANGED = 1;
export const EXIT_NETWORK = 2;

/**
 * True for a failure that is not evidence of a change. A plain HTTP 404 or a page with no main content is not one of these,
 * because the content has to answer it.
 */
export function isNetworkFailure(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /fetch failed|socket hang up|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|AbortError|TimeoutError|timed? ?out|net::ERR_|-> (429|5\d\d)\b|HTTP (429|5\d\d)\b/i.test(
    text,
  );
}
