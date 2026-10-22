import { describe, expect, it } from 'vitest';
import { isNetworkFailure } from './network';

describe('network-class failures are warnings, content problems are not', () => {
  it.each([
    ['a connection that never opened', new TypeError('fetch failed')],
    ['a reset connection', new Error('read ECONNRESET')],
    ['a DNS failure', new Error('getaddrinfo ENOTFOUND docs.aws.amazon.com')],
    ['a timeout in a browser navigation', new Error('page.goto: Timeout 90000ms exceeded.')],
    ['a Chromium network error', new Error('page.goto: net::ERR_NAME_NOT_RESOLVED at https://aws.amazon.com/free/')],
    ['a rate limit from a page', new Error('GET https://aws.amazon.com/free/ -> 429')],
    ['a server error from a page', new Error('GET https://docs.aws.amazon.com/x.html -> 503')],
    ['a rate limit reported as a fetch result', new Error('HTTP 429')],
  ])('%s is a network failure', (_name, error) => {
    expect(isNetworkFailure(error)).toBe(true);
  });

  it.each([
    ['a missing page', new Error('GET https://docs.aws.amazon.com/gone.html -> 404')],
    ['a page with no main content', new Error('the page has no main content')],
    ['a layout that changed', new Error('the page says 12 offers but 11 were extracted (layout changed).')],
    ['a bug in our own code', new TypeError("Cannot read properties of undefined (reading 'id')")],
    ['a value that is not an error', 'something else'],
  ])('%s is not a network failure', (_name, error) => {
    expect(isNetworkFailure(error)).toBe(false);
  });
});
