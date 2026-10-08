import { useCallback, useMemo, useRef, useState } from 'react';
import {
  BUILDINGS,
  DISTRICTS,
  GRAPH,
  OUTLINE_DOMAINS,
  ROADS,
  START_IDS,
  type Building,
  type BuildingState,
  type IslandId,
} from '../data';
import { deriveAll } from '../save/state';
import { useSaveStore, useSnapshot } from '../save/context';
import { navigate, type PanelView } from '../lib/route';
import { BuildingCard } from './BuildingCard';
import { RoadsOverlay, useIsDesktop } from './RoadsOverlay';

const STARTS = new Set(START_IDS);
const ISLANDS: IslandId[] = ['A', 'B', 'C'];

interface Props {
  view: PanelView;
  activeId: string | null;
}

export function CityMap({ view, activeId }: Props) {
  const snapshot = useSnapshot();
  const store = useSaveStore();
  const [hovered, setHovered] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());
  const desktop = useIsDesktop();

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

  const focusId = hovered ?? activeId;
  const related = useMemo(() => {
    const s = new Set<string>();
    if (!focusId) return s;
    for (const r of ROADS) {
      if (r.from === focusId) s.add(r.to);
      if (r.to === focusId) s.add(r.from);
    }
    return s;
  }, [focusId]);

  const onOpen = useCallback(
    (id: string) => {
      store.setUi({ lastBuilding: id });
      navigate({ view, building: id, param: id });
    },
    [store, view],
  );
  const registerRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }, []);

  const roadsMode = snapshot.save.ui.roads;
  const counts = useMemo(() => {
    const c: Record<BuildingState, number> = { planned: 0, surveyed: 0, under_construction: 0, commissioned: 0 };
    for (const s of states.values()) c[s] += 1;
    return c;
  }, [states]);

  const scrollToDistrict = (id: string) => {
    const el = document.getElementById(`district-${id}`);
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[var(--fg-muted)]">
        <span>
          <strong className="text-[var(--fg)]">{counts.commissioned}</strong> of {BUILDINGS.length} buildings commissioned
        </span>
        <span aria-hidden="true">·</span>
        <span>{counts.surveyed} surveyed</span>
        <span aria-hidden="true">·</span>
        <span>{counts.under_construction} under construction</span>
        <span aria-hidden="true">·</span>
        <span>{counts.planned} planned</span>
      </div>

      <div className="sticky top-0 z-20 -mx-4 mb-4 flex gap-2 overflow-x-auto bg-[var(--bg)]/90 px-4 py-2 backdrop-blur md:static md:mx-0 md:overflow-visible md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
        {DISTRICTS.map((d) => (
          <button key={d.id} type="button" className="btn shrink-0 text-sm" data-district={d.id} onClick={() => scrollToDistrict(d.id)}>
            {d.name}
          </button>
        ))}
        {desktop && (
          <button
            type="button"
            className="btn ml-auto shrink-0 text-sm"
            aria-pressed={roadsMode === 'all'}
            onClick={() => store.setUi({ roads: roadsMode === 'all' ? 'selected' : 'all' })}
          >
            {roadsMode === 'all' ? 'Showing all roads' : 'Show all roads'}
          </button>
        )}
      </div>

      <div ref={containerRef} className="relative">
        {desktop && <RoadsOverlay containerRef={containerRef} cardRefs={cardRefs} mode={roadsMode} focusId={focusId} />}

        <div className="grid gap-6">
          {DISTRICTS.map((district) => {
            const inDistrict = BUILDINGS.filter((b) => b.district === district.id);
            const domain = OUTLINE_DOMAINS.find((d) => d.id === district.domain);
            const lanes: { key: string; label: string; items: Building[] }[] =
              district.id === 'square'
                ? [{ key: 'square', label: 'Foundations', items: inDistrict }]
                : ISLANDS.map((isl) => ({
                    key: isl,
                    label: `Island ${isl}`,
                    items: inDistrict.filter((b) => b.island === isl),
                  }));
            return (
              <section
                key={district.id}
                id={`district-${district.id}`}
                tabIndex={-1}
                data-district={district.id}
                aria-labelledby={`h-${district.id}`}
                className="scroll-mt-16 rounded-2xl border-2 border-[color-mix(in_srgb,var(--d)_60%,transparent)] bg-[rgba(11,26,43,0.72)] p-3 sm:p-4"
              >
                <header className="mb-3">
                  <h2 id={`h-${district.id}`} className="text-2xl font-semibold">
                    <span className="mr-2 inline-block h-3 w-3 rounded-sm bg-[var(--d)] align-middle" aria-hidden="true" />
                    {district.name}
                  </h2>
                  <p className="text-sm text-[var(--fg-muted)]">
                    {domain ? `Domain ${domain.id}: ${domain.name} (${domain.weightPercent}% of scored content). ` : ''}
                    {district.tagline}
                  </p>
                </header>
                <div className={district.id === 'square' ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4' : 'grid gap-4 md:grid-cols-3'}>
                  {lanes.map((lane) => (
                    <div key={lane.key} className={district.id === 'square' ? 'contents' : 'min-w-0'}>
                      {district.id !== 'square' && (
                        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
                          {lane.label} <span className="font-normal normal-case">(Availability Zone {lane.key === 'A' ? '1' : lane.key === 'B' ? '2' : '3'})</span>
                        </h3>
                      )}
                      <div className={district.id === 'square' ? 'contents' : 'grid gap-3'}>
                        {lane.items.map((b) => (
                          <BuildingCard
                            key={b.id}
                            building={b}
                            state={states.get(b.id) ?? 'planned'}
                            active={activeId === b.id}
                            related={related.has(b.id)}
                            onOpen={onOpen}
                            onHover={setHovered}
                            registerRef={desktop ? registerRef : undefined}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
