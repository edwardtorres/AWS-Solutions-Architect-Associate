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
import { useSaveStore, useSnapshot } from '../save/context';
import { DEFAULT_ENV } from '../game/env';
import { inspectionLockedUntil, nextAction, placementAvailability } from '../game/lifecycle';
import { hrefAttempt, hrefFor, hrefLab, hrefNotes, hrefWorkbench, type PanelView } from '../lib/route';
import { QUESTION_META } from '../questions/meta';
import { puzzleTypeOf } from '../puzzles/load';
import { PUZZLE_TYPE_NAME } from '../puzzles/types';
import { workbenchAvailability } from '../game/puzzle';
import { LAB_META } from '../labs/meta';
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
  const store = useSaveStore();
  const building = BUILDING_BY_ID.get(buildingId);

  // Ignore the close event when the dialog was closed and reopened (e.g. effect re-run in StrictMode).
  const unmounting = useRef(false);
  const handleClose = () => {
    // A close caused by leaving the view must not navigate again (it would undo the navigation that caused it).
    if (ref.current?.open || unmounting.current) return;
    onClose();
  };

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    unmounting.current = false;
    if (!dialog.open) dialog.showModal();
    return () => {
      unmounting.current = true;
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

  const save = snapshot.save;
  const day = store.today();
  const action = nextAction(save, building.id, DEFAULT_ENV, day);
  const placement = placementAvailability(save, building.id, DEFAULT_ENV, day);
  const lockedUntil = inspectionLockedUntil(save, building.id, day);
  const activeHere = save.game.active && save.game.active.building === building.id ? save.game.active : null;
  const placed = save.buildings[building.id]?.via === 'placement' && state === 'commissioned';
  const resumeHref = activeHere ? hrefAttempt(activeHere.kind === 'inspection' ? 'inspect' : activeHere.kind === 'placement' ? 'place' : 'startup', building.id) : null;

  const workbench = workbenchAvailability(save, building.id, { env: DEFAULT_ENV });
  const puzzleCounts = new Map<string, number>();
  for (const m of QUESTION_META.values()) {
    const t = m.building === building.id ? puzzleTypeOf(m.id) : null;
    if (t) puzzleCounts.set(PUZZLE_TYPE_NAME[t], (puzzleCounts.get(PUZZLE_TYPE_NAME[t]) ?? 0) + 1);
  }

  const labsHere = LAB_META.filter((l) => l.buildings.includes(building.id));

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
          {placed && (
            <span className="chip" data-kind="placed">
              Placed
            </span>
          )}
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
                <p className="mt-1 text-xs text-[var(--fg-muted)]">A placement check on SAA-level design decisions is available under “Build this”.</p>
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

        <section className="mt-4" aria-labelledby="p-build" data-testid="build-section">
          <h3 id="p-build" className="text-lg font-semibold">
            Build this
          </h3>
          {resumeHref && (
            <p className="mt-1">
              <a className="btn" href={resumeHref} data-testid="resume">
                Resume your {activeHere?.kind === 'inspection' ? 'inspection' : activeHere?.kind === 'placement' ? 'placement check' : 'start-up check'}
              </a>
            </p>
          )}
          {action === 'done' && <p className="mt-1 text-sm">Commissioned{placed ? ' by placement' : ''}. Nothing more to do here.</p>}
          {action === 'locked-planned' && <p className="mt-1 text-sm">Locked until its prerequisite roads are commissioned.</p>}
          {action === 'notes' && (
            <p className="mt-1 text-sm">
              Open the study notes first: the start-up check unlocks once you have.{' '}
              <a className="btn ml-1" href={hrefNotes(building.id)}>
                Open the notes
              </a>
            </p>
          )}
          {action === 'startup' && !resumeHref && (
            <p className="mt-1">
              <a className="btn" href={hrefAttempt('startup', building.id)}>
                Start-up check
              </a>
              <span className="ml-2 text-sm text-[var(--fg-muted)]">2 questions, both right to start construction.</span>
            </p>
          )}
          {action === 'inspection' && !resumeHref && (
            <p className="mt-1">
              <a className="btn" href={hrefAttempt('inspect', building.id)}>
                Inspection
              </a>
              <span className="ml-2 text-sm text-[var(--fg-muted)]">5 questions, 4 right to commission.</span>
            </p>
          )}
          {action === 'inspection-locked' && lockedUntil && (
            <p role="status" className="mt-1 text-sm" data-testid="lock-message">
              Inspections for this building are locked until tomorrow ({lockedUntil}): you failed twice today. Re-read the notes.
            </p>
          )}
          {building.portfolio && state !== 'commissioned' && !resumeHref && (
            <div className="mt-3">
              {placement.ok ? (
                <p>
                  <a className="btn" href={hrefAttempt('place', building.id)} data-testid="place-link">
                    Placement check
                  </a>
                  <span className="ml-2 text-sm text-[var(--fg-muted)]">5 questions, all right to place this building now. One try per day.</span>
                </p>
              ) : (
                <p role="status" className="text-sm" data-testid="placement-message">
                  {placement.message}
                </p>
              )}
            </div>
          )}
        </section>

        {puzzleCounts.size > 0 && (
          <section className="mt-4" aria-labelledby="p-bench" data-testid="workbench-section">
            <h3 id="p-bench" className="text-lg font-semibold">
              Workbench
            </h3>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              Practice puzzles: {[...puzzleCounts].map(([n, c]) => `${n} (${c})`).join(', ')}. They earn XP and feed readiness, but never commission a building.
            </p>
            {workbench.ok ? (
              <a className="btn mt-1" href={hrefWorkbench(building.id)} data-testid="workbench-link">
                Open the Workbench
              </a>
            ) : (
              <p role="status" className="mt-1 text-sm" data-testid="workbench-locked">
                {workbench.message}
              </p>
            )}
          </section>
        )}

        {labsHere.length > 0 && (
          <section className="mt-4" aria-labelledby="p-workshop" data-testid="workshop-section">
            <h3 id="p-workshop" className="text-lg font-semibold">
              Workshop
            </h3>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              Hands-on labs for your own AWS account. Finishing one earns fixed XP and a short debrief; it never commissions a building.
            </p>
            <ul className="mt-1 grid gap-1">
              {labsHere.map((l) => (
                <li key={l.id}>
                  <a className="flex min-h-11 flex-wrap items-center gap-2 underline underline-offset-4" href={hrefLab(l.id)} data-testid="workshop-link">
                    Lab {l.n}: {l.title}
                    <span className="text-sm text-[var(--fg-muted)]">{l.minutes} min</span>
                    {save.labs.progress[l.id]?.completedAt && <span className="chip">Complete</span>}
                  </a>
                </li>
              ))}
            </ul>
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
