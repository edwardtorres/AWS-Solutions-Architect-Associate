import { useContext } from 'react';
import { CitesContext } from './Inline';

/** Numbered list of every page cited above. Link targets are full-height rows (44 px). */
export function SourceList({ list }: { list: () => string[] }) {
  const cites = useContext(CitesContext);
  if (!cites) return null;
  const ids = list();
  return (
    <section className="mt-8" aria-labelledby="sources-h">
      <h2 id="sources-h" className="text-2xl font-semibold">
        Sources
      </h2>
      <p className="text-sm text-[var(--fg-muted)]">AWS pages are on docs.aws.amazon.com or aws.amazon.com. Microsoft Learn is used only for the Azure side of the Azure notes. AWS quotas and limits can change, so check the linked page.</p>
      <ol className="mt-2 grid gap-1">
        {ids.map((id, i) => {
          const s = cites.shared.sources.get(id);
          if (!s) return null;
          return (
            <li key={id} className="flex gap-2">
              <span className="w-8 shrink-0 pt-3 text-right text-sm text-[var(--fg-muted)]">[{i + 1}]</span>
              <a className="flex min-h-11 min-w-0 flex-1 items-center break-words rounded-lg px-2 py-1 underline decoration-[var(--line)] underline-offset-4 hover:bg-[var(--bg-3)]" href={s.url} target="_blank" rel="noreferrer noopener">
                <span className="min-w-0">
                  {s.title}
                  <span className="block break-all text-xs text-[var(--fg-muted)]">{s.url.replace('https://', '')}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
