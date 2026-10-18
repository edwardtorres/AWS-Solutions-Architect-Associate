import { useEffect, useMemo, useState } from 'react';
import type { Question } from '../../content/types';
import { loadShared, type Shared } from '../../content/store';
import { loadQuestions } from '../../questions/pool';

/** The loaded question bank (lazy), the shared content (sources, don't-confuse pairs) and a lookup by id. */
export function useBank(): { bank: readonly Question[] | null; shared: Shared | null; lookup: (id: string) => Question | undefined } {
  const [bank, setBank] = useState<readonly Question[] | null>(null);
  const [shared, setShared] = useState<Shared | null>(null);
  useEffect(() => {
    let live = true;
    void Promise.all([loadQuestions(), loadShared()]).then(([q, s]) => {
      if (live) {
        setBank(q);
        setShared(s);
      }
    });
    return () => {
      live = false;
    };
  }, []);
  const lookup = useMemo(() => {
    const m = new Map((bank ?? []).map((q) => [q.id, q]));
    return (id: string) => m.get(id);
  }, [bank]);
  return { bank, shared, lookup };
}
