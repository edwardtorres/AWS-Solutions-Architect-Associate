import { lazy, Suspense, useEffect, useMemo, useRef } from 'react';
import {
  BUILDING_BY_ID,
  BULLET_BY_ID,
  DISTRICT_BY_ID,
  FAMILY_NAME,
  GRAPH,
  OUTLINE_DOMAINS,
  START_IDS,
  TASK_BY_ID,
  atlasLinks,
  prerequisitesOf,
  unlocksOf,
  type BuildingState,
} from '../data';
import { deriveAll, STATE_HELP, STATE_LABEL } from '../save/state';
import { useSnapshot } from '../save/context';
import { hrefFor, hrefNotes, type PanelView } from '../lib/route';
import { CloseIcon, RoadIcon, StateIcon } from './icons';

const STARTS = new Set(START_IDS);

// Dev-only controls: this branch is removed from production builds.
const DevBuildingControls = import.meta.env.DEV ? lazy(() => import('../dev/DevBuildingControls')) : null;

interface Props {
  buildingId: string;
  view: PanelView;
  onClose: () => void;
}

export default function DetailPanel({ buildingId, view, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const snapshot = useSnapshot();
  const building = BUILDING_BY_ID.get(buildingId);

  // Ignore the close event when the dialog was closed and reopened (e.g. effect re-run in StrictMode).
  const handleClose = () => {
    if (ref.current?.open) return;
    onClose();
  };

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    ref.current?.scrollTo({ top: 0 });
  }, [buildingId]);

  const states = useMemo(
    () =>
      deriveAll(
        [...BUILDING_BY_ID.keys()],
        snapshot.save,
        GRAPH,
        STARTS,
      ),
    [snapshot.save],
  );

  if (!building) {
    return (
      <dialog ref={ref} className="panel-dialog" onClose={handleClose} aria-label="Unknown building">
        <div className="p-5">
          <p>That building does not exist.</p>
          <button type="button" className="btn mt-3" onClick={onClose}>
            Back to the city
          </button>
        </div>
      </dialog>
    );
  }

  const state: BuildingState = states.get(building.id) ?? 'planned';
  const district = DISTRICT_BY_ID[building.district];
  const task = building.task ? TASK_BY_ID.get(building.task) : null;
  const domain = OUTLINE_DOMAINS.find((d) => d.id === district.domain);
  const prereqs = prerequisitesOf(building.id);
  const unlocks = unlocksOf(building.id);
  const links = atlasLinks(building.id);
  const linkedFamilies = [...new Set(links.map((l) => l.family))];

  const roadItem = (id: string, reason: string) => {
    const other = BUILDING_BY_ID.get(id);
    if (!other) return null;
    const s = states.get(id) ?? 'planned';
    return (
      <li key={id} className="rounded-lg border border-[var(--line)] bg-[rgba(11,26,43,0.5)] p-2.5">
        <a href={hrefFor({ view, building: id })} className="flex min-h-11 items-center gap-2 font-semibold text-[var(--fg)] underline decoration-[var(--line)] underline-offset-4 hover:decoration-[var(--accent)]">
          <StateIcon state={s} />
          <span>{other.name}</span>
          <span className="chip ml-auto">{STATE_LABEL[s]}</span>
        </a>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">{reason}</p>
      </li>
    );
  };

  return (
    <dialog
      ref={ref}
      className="panel-dialog"
      data-district={building.district}
      aria-labelledby="panel-title"
      onClose={handleClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-[var(--fg-muted)]">
              <span className="mr-2 inline-block h-3 w-3 rounded-sm bg-[var(--d)] align-middle" aria-hidden="true" />
              {district.name}
              {building.island ? ` · Island ${building.island}` : ''}
            </p>
            <h2 id="panel-title" className="text-3xl font-semibold leading-tight">
              {building.name}
            </h2>
            <p className="mt-1 text-[0.95rem]">{building.skill}</p>
          </div>
          <button type="button" className="btn shrink-0" onClick={onClose} aria-label="Close building details">
            <CloseIcon />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="chip" data-kind="state">
            <StateIcon state={state} /> {STATE_LABEL[state]}
          </span>
          {task ? (
            <span className="chip">
              Task {task.id}: {task.title}
            </span>
          ) : (
            <span className="chip">Foundation</span>
          )}
          {domain && <span className="chip">Domain {domain.id} · {domain.weightPercent}% of scored content</span>}
        </div>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">{STATE_HELP[state]}</p>

        {building.foundationReason && (
          <section className="mt-4" aria-labelledby="p-found">
            <h3 id="p-found" className="text-lg font-semibold">
              Why this Foundation exists
            </h3>
            <p className="text-sm">{building.foundationReason}</p>
          </section>
        )}

        {building.bullets.length > 0 && (
          <section className="mt-4" aria-labelledby="p-covers">
            <h3 id="p-covers" className="text-lg font-semibold">
              Exam guide bullets covered
            </h3>
            <ul className="mt-1 grid gap-1.5 text-sm">
              {building.bullets.map((id) => {
                const bullet = BULLET_BY_ID.get(id);
                if (!bullet) return null;
                return (
                  <li key={id} className="flex gap-2">
                    <span className="chip shrink-0 self-start" title={bullet.type === 'knowledge' ? 'Knowledge of' : 'Skills in'}>
                      {bullet.type === 'knowledge' ? 'Knowledge' : 'Skill'}
                    </span>
                    <span>{bullet.text}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="mt-4" aria-labelledby="p-needs">
          <h3 id="p-needs" className="flex items-center gap-2 text-lg font-semibold">
            <RoadIcon /> Roads in (prerequisites)
          </h3>
          {prereqs.length === 0 ? (
            <p className="text-sm text-[var(--fg-muted)]">None. This is a starting building.</p>
          ) : (
            <ul className="mt-1 grid gap-2">{prereqs.map((r) => roadItem(r.from, r.reason))}</ul>
          )}
        </section>

        <section className="mt-4" aria-labelledby="p-unlocks">
          <h3 id="p-unlocks" className="flex items-center gap-2 text-lg font-semibold">
            <RoadIcon /> Roads out (unlocks)
          </h3>
          {unlocks.length === 0 ? (
            <p className="text-sm text-[var(--fg-muted)]">Nothing depends on this building.</p>
          ) : (
            <ul className="mt-1 grid gap-2">{unlocks.map((r) => roadItem(r.to, r.reason))}</ul>
          )}
        </section>

        <section className="mt-4" aria-labelledby="p-services">
          <h3 id="p-services" className="text-lg font-semibold">
            Services and families
          </h3>
          {building.families.length > 0 && (
            <p className="mt-1 flex flex-wrap gap-1.5">
              {building.families.map((f) => (
                <span key={f} className="chip">
                  {FAMILY_NAME[f]}
                </span>
              ))}
            </p>
          )}
          {building.services.length > 0 ? (
            <p className="mt-2 text-sm text-[var(--fg-muted)]">{building.services.join(' · ')}</p>
          ) : (
            <p className="mt-2 text-sm text-[var(--fg-muted)]">Concept building: no single service.</p>
          )}
          {links.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-semibold">Same family, other districts (Service Atlas)</p>
              {linkedFamilies.map((f) => (
                <div key={f} className="mt-1">
                  <p className="text-xs uppercase tracking-wide text-[var(--fg-muted)]">{FAMILY_NAME[f]}</p>
                  <ul className="mt-0.5 flex flex-wrap gap-1.5">
                    {links
                      .filter((l) => l.family === f)
                      .map((l) => (
                        <li key={l.building.id}>
                          <a
                            href={hrefFor({ view, building: l.building.id })}
                            className="chip min-h-11 underline underline-offset-2"
                            data-district={l.building.district}
                          >
                            {l.building.name} ({DISTRICT_BY_ID[l.building.district].name})
                          </a>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {(building.portfolio || building.azure) && (
          <section className="mt-4" aria-labelledby="p-carry">
            <h3 id="p-carry" className="text-lg font-semibold">
              Carryover
            </h3>
            {building.portfolio && (
              <div className="mt-1">
                <p className="text-sm font-semibold">From your portfolio projects</p>
                <ul className="mt-1 grid gap-1 text-sm">
                  {building.portfolio.map((p) => (
                    <li key={p.tech}>
                      <span className="chip mr-1.5" data-kind="portfolio">
                        {p.tech}
                      </span>
                      {p.note}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-[var(--fg-muted)]">A placement check on SAA-level design decisions arrives in Step 4.</p>
              </div>
            )}
            {building.azure && (
              <div className="mt-3">
                <p className="text-sm font-semibold">Coming from Azure</p>
                <ul className="mt-1 grid gap-1 text-sm">
                  {building.azure.map((a) => (
                    <li key={`${a.concept}|${a.aws}`}>
                      <span className="chip mr-1.5" data-kind="azure">
                        {a.background}
                      </span>
                      {a.concept} <span className="text-[var(--fg-muted)]">compares with</span> {a.aws}
                      {a.sourceUrl ? (
                        <>
                          {' '}
                          <a
                            href={a.sourceUrl}
                            className="inline-flex min-h-11 items-center underline underline-offset-2"
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            (Microsoft Learn)
                          </a>
                        </>
                      ) : (
                        <span className="text-[var(--fg-muted)]"> (source to be verified)</span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-[var(--fg-muted)]">
                  The short note, including where each analogy breaks, arrives in Step 2.
                </p>
              </div>
            )}
          </section>
        )}

        <section className="mt-4" aria-labelledby="p-notes">
          <h3 id="p-notes" className="text-lg font-semibold">
            Study notes
          </h3>
          <a className="btn mt-1" href={hrefNotes(building.id)}>
            Open the study notes
          </a>
        </section>

        {DevBuildingControls && (
          <Suspense fallback={null}>
            <DevBuildingControls id={building.id} />
          </Suspense>
        )}
      </div>
    </dialog>
  );
}
