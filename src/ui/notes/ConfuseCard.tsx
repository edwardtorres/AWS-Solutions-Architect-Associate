import type { ConfusePair } from '../../content/types';
import { BUILDING_BY_ID } from '../../data';
import { hrefConfuse, hrefNotes } from '../../lib/route';
import { BlockView } from './Inline';

/** One comparison, laid out as stacked cards so it needs no sideways scroll on a phone. */
export function ConfuseCard({ pair, showHome = true }: { pair: ConfusePair; showHome?: boolean }) {
  const home = BUILDING_BY_ID.get(pair.home);
  return (
    <section id={`pair-${pair.id}`} className="rounded-2xl border-2 border-[var(--line)] bg-[rgba(11,26,43,0.72)] p-3 sm:p-4" aria-labelledby={`pt-${pair.id}`}>
      <h3 id={`pt-${pair.id}`} className="text-xl font-semibold">
        <a className="inline-link" href={hrefConfuse(pair.id)}>
          {pair.title}
        </a>
      </h3>
      {showHome && home && (
        <p className="text-sm text-[var(--fg-muted)]">
          Home: <a className="inline-link" href={hrefNotes(home.id)}>{home.name}</a>
        </p>
      )}
      <div className="mt-2 grid gap-3 md:grid-cols-2">
        {pair.items.map((it) => (
          <div key={it.name} className="rounded-xl border border-[var(--line)] p-2.5">
            <h4 className="font-display text-lg font-semibold">{it.name}</h4>
            <ul className="mt-1 grid gap-1.5 text-sm">
              {it.points.map((p, i) => (
                <BlockView key={i} block={p} as="li" />
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <h4 className="font-semibold">How to choose</h4>
        <ul className="mt-1 grid gap-1.5 text-sm">
          {pair.choose.map((c, i) => (
            <BlockView key={i} block={c} as="li" />
          ))}
        </ul>
      </div>
      {pair.trap && (
        <div className="mt-3 rounded-xl border border-[var(--accent)] p-2.5 text-sm">
          <h4 className="font-semibold">Exam trap</h4>
          <BlockView block={pair.trap} />
        </div>
      )}
    </section>
  );
}
