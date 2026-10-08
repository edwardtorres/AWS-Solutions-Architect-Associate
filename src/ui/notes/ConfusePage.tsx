import { useEffect, useState } from 'react';
import { loadShared, type Shared } from '../../content/store';
import { ConfuseCard } from './ConfuseCard';
import { CitesContext } from './Inline';
import { SourceList } from './SourceList';
import { useCitesValue } from './useCites';

export default function ConfusePage({ pairId }: { pairId: string | null }) {
  const [shared, setShared] = useState<Shared | null>(null);
  useEffect(() => {
    void loadShared().then(setShared);
  }, []);
  if (!shared) return <p role="status">Loading comparisons…</p>;
  return <ConfuseBody shared={shared} pairId={pairId} />;
}

function ConfuseBody({ shared, pairId }: { shared: Shared; pairId: string | null }) {
  const cites = useCitesValue(shared);
  const pairs = pairId ? shared.confuse.filter((p) => p.id === pairId) : shared.confuse;
  return (
    <CitesContext.Provider value={cites}>
      <h2 className="text-3xl font-semibold">Don&rsquo;t confuse</h2>
      <p className="mt-1 max-w-prose text-sm text-[var(--fg-muted)]">
        Look-alike services and options, side by side. {shared.confuse.length} comparison{shared.confuse.length === 1 ? '' : 's'}.
        {pairId && (
          <>
            {' '}
            <a className="inline-link" href="#/confuse">
              Show all
            </a>
          </>
        )}
      </p>
      <div className="mt-4 grid gap-4">
        {pairs.map((p) => (
          <ConfuseCard key={p.id} pair={p} />
        ))}
      </div>
      <SourceList list={cites.list} />
    </CitesContext.Provider>
  );
}
