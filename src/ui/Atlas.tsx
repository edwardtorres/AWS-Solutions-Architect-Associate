import { useMemo } from 'react';
import {
  BUILDINGS,
  DISTRICTS,
  FAMILIES,
  GRAPH,
  START_IDS,
  buildingsByFamily,
  type Building,
  type DistrictId,
  type FamilyId,
} from '../data';
import { deriveAll, STATE_LABEL } from '../save/state';
import { useSnapshot } from '../save/context';
import { hrefFor, type PanelView } from '../lib/route';
import { StateIcon } from './icons';

const STARTS = new Set(START_IDS);

export default function Atlas({ view, activeId }: { view: PanelView; activeId: string | null }) {
  const snapshot = useSnapshot();
  const states = useMemo(
    () =>
      deriveAll(
        BUILDINGS.map((b) => b.id),
        snapshot.save,
        GRAPH,
        STARTS,
      ),
    [snapshot.save],
  );

  const scrollTo = (id: FamilyId) => {
    const el = document.getElementById(`family-${id}`);
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  };

  return (
    <div>
      <p className="mb-3 max-w-prose text-sm text-[var(--fg-muted)]">
        The exam repeats the same services across all four pillars. This atlas groups every building by service family so you can see, for example,
        storage performance beside storage cost. A family that shows up in several districts is a topic worth studying from each angle.
      </p>
      <nav aria-label="Service families" className="sticky top-0 z-20 -mx-4 mb-4 flex gap-2 overflow-x-auto bg-[var(--bg)]/90 px-4 py-2 backdrop-blur md:static md:mx-0 md:flex-wrap md:overflow-visible md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
        {FAMILIES.map((f) => (
          <button key={f.id} type="button" className="btn shrink-0 text-sm" onClick={() => scrollTo(f.id)}>
            {f.name}
          </button>
        ))}
      </nav>

      <div className="grid gap-5">
        {FAMILIES.map((family) => {
          const inFamily = buildingsByFamily(family.id).filter((b) => b.district !== 'square');
          const foundations = buildingsByFamily(family.id).filter((b) => b.district === 'square');
          const byDistrict = new Map<DistrictId, Building[]>();
          for (const b of inFamily) byDistrict.set(b.district, [...(byDistrict.get(b.district) ?? []), b]);
          const spread = byDistrict.size;
          return (
            <section
              key={family.id}
              id={`family-${family.id}`}
              tabIndex={-1}
              aria-labelledby={`fh-${family.id}`}
              className="scroll-mt-16 rounded-2xl border-2 border-[var(--line)] bg-[rgba(11,26,43,0.72)] p-3 sm:p-4"
            >
              <h2 id={`fh-${family.id}`} className="text-2xl font-semibold">
                {family.name}
              </h2>
              <p className="text-sm text-[var(--fg-muted)]">
                {inFamily.length} building{inFamily.length === 1 ? '' : 's'} across {spread} district{spread === 1 ? '' : 's'}
                {spread > 1 ? ': study it from each angle.' : '.'}
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {DISTRICTS.filter((d) => byDistrict.has(d.id)).map((d) => (
                  <div key={d.id} data-district={d.id} className="rounded-xl border border-[color-mix(in_srgb,var(--d)_55%,transparent)] p-2.5">
                    <h3 className="mb-1.5 text-base font-semibold">
                      <span className="mr-2 inline-block h-3 w-3 rounded-sm bg-[var(--d)] align-middle" aria-hidden="true" />
                      {d.name}
                    </h3>
                    <ul className="grid gap-1.5">
                      {(byDistrict.get(d.id) ?? []).map((b) => {
                        const s = states.get(b.id) ?? 'planned';
                        return (
                          <li key={b.id}>
                            <a
                              href={hrefFor({ view, building: b.id })}
                              className="flex min-h-11 items-center gap-2 rounded-lg px-2 py-1 hover:bg-[var(--bg-3)]"
                              aria-current={activeId === b.id ? 'true' : undefined}
                            >
                              <StateIcon state={s} />
                              <span className="min-w-0 flex-1">
                                <span className="block font-semibold leading-tight">{b.name}</span>
                                <span className="block text-xs text-[var(--fg-muted)]">
                                  Task {b.task} · {STATE_LABEL[s]}
                                </span>
                              </span>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
              {foundations.length > 0 && (
                <p className="mt-2 text-xs text-[var(--fg-muted)]">
                  Foundations touching this family: {foundations.map((f) => f.name).join(', ')}.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
