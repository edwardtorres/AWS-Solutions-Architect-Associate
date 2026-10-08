import { useMemo } from 'react';
import type { Shared } from '../../content/store';
import type { Cites } from './Inline';

/**
 * Numbers sources in order of first citation. Components call `number()` while rendering
 * top to bottom, so the sources list rendered last sees every citation.
 */
export function useCitesValue(shared: Shared): Cites & { list: () => string[] } {
  return useMemo(() => {
    const order: string[] = [];
    return {
      shared,
      number: (id: string) => {
        let i = order.indexOf(id);
        if (i === -1) {
          order.push(id);
          i = order.length - 1;
        }
        return i + 1;
      },
      list: () => [...order],
    };
  }, [shared]);
}
