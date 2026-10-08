import { useEffect, useState } from 'react';
import { loadShared, type Shared } from '../../content/store';
import { BlockView, CitesContext } from './Inline';
import { SourceList } from './SourceList';
import { useCitesValue } from './useCites';

export default function GlossaryPage({ termId }: { termId: string | null }) {
  const [shared, setShared] = useState<Shared | null>(null);
  useEffect(() => {
    void loadShared().then(setShared);
  }, []);
  if (!shared) return <p role="status">Loading the glossary…</p>;
  return <GlossaryBody shared={shared} termId={termId} />;
}

function GlossaryBody({ shared, termId }: { shared: Shared; termId: string | null }) {
  const cites = useCitesValue(shared);
  const terms = [...shared.glossary].sort((a, b) => a.term.localeCompare(b.term));
  useEffect(() => {
    if (!termId) return;
    document.getElementById(`term-${termId}`)?.scrollIntoView({ block: 'start' });
  }, [termId]);
  return (
    <CitesContext.Provider value={cites}>
      <h2 className="text-3xl font-semibold">Glossary</h2>
      <p className="mt-1 max-w-prose text-sm text-[var(--fg-muted)]">
        Each term is defined once, here. Notes link to these entries. {terms.length} term{terms.length === 1 ? '' : 's'}.
      </p>
      <dl className="mt-4 grid gap-3">
        {terms.map((t) => (
          <div key={t.id} id={`term-${t.id}`} data-active={termId === t.id ? 'true' : undefined} className="scroll-mt-4 rounded-xl border border-[var(--line)] p-3 data-[active=true]:border-[var(--accent)]">
            <dt className="font-display text-xl font-semibold">
              {t.term}
              {t.aliases && t.aliases.length > 0 && <span className="ml-2 text-sm font-normal text-[var(--fg-muted)]">also: {t.aliases.join(', ')}</span>}
            </dt>
            <dd className="mt-1">
              <BlockView block={t.definition} />
            </dd>
          </div>
        ))}
      </dl>
      <SourceList list={cites.list} />
    </CitesContext.Provider>
  );
}
