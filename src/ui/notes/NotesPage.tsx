import { useEffect, useState } from 'react';
import { BUILDING_BY_ID, BULLET_BY_ID, DISTRICT_BY_ID, FAMILY_NAME, TASK_BY_ID } from '../../data';
import { loadBuildingNotes, loadShared, type Shared } from '../../content/store';
import type { BuildingNotes } from '../../content/types';
import { hrefFor } from '../../lib/route';
import { BlockView, CitesContext } from './Inline';
import { ConfuseCard } from './ConfuseCard';
import { SourceList } from './SourceList';
import { useCitesValue } from './useCites';

type State =
  | { status: 'ready'; forId: string; notes: BuildingNotes | null; shared: Shared }
  | { status: 'error'; forId: string; message: string }
  | null;

export default function NotesPage({ buildingId }: { buildingId: string | null }) {
  const [state, setState] = useState<State>(null);
  const building = buildingId ? BUILDING_BY_ID.get(buildingId) : undefined;

  useEffect(() => {
    let cancelled = false;
    if (!buildingId) return;
    Promise.all([loadBuildingNotes(buildingId), loadShared()])
      .then(([notes, shared]) => {
        if (!cancelled) setState({ status: 'ready', forId: buildingId, notes, shared });
      })
      .catch((e: unknown) => {
        if (!cancelled) setState({ status: 'error', forId: buildingId, message: String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [buildingId]);

  if (!building) {
    return (
      <p>
        That building does not exist. <a className="inline-link" href="#/map">Back to the city map</a>.
      </p>
    );
  }
  if (!state || state.forId !== building.id) return <p role="status">Loading notes…</p>;
  if (state.status === 'error') return <p role="alert">Could not load the notes: {state.message}</p>;
  if (!state.notes) {
    return (
      <div>
        <h2 className="text-3xl font-semibold">{building.name}</h2>
        <p className="mt-2">Notes for this building are not written yet.</p>
        <a className="btn mt-3" href={hrefFor({ view: 'map', building: building.id })}>
          Back to the building
        </a>
      </div>
    );
  }
  return <NotesBody building={building.id} notes={state.notes} shared={state.shared} />;
}

function NotesBody({ building: id, notes, shared }: { building: string; notes: BuildingNotes; shared: Shared }) {
  const building = BUILDING_BY_ID.get(id);
  const cites = useCitesValue(shared);
  if (!building) return null;
  const district = DISTRICT_BY_ID[building.district];
  const task = building.task ? TASK_BY_ID.get(building.task) : null;
  const pairs = notes.confuse.map((pid) => shared.confuse.find((c) => c.id === pid)).filter((p) => p !== undefined);

  return (
    <CitesContext.Provider value={cites}>
      <article data-district={building.district} aria-labelledby="notes-title">
        <p className="text-sm text-[var(--fg-muted)]">
          <span className="mr-2 inline-block h-3 w-3 rounded-sm bg-[var(--d)] align-middle" aria-hidden="true" />
          {district.name} · Study notes
        </p>
        <h2 id="notes-title" className="text-3xl font-semibold leading-tight sm:text-4xl">
          {building.name}
        </h2>
        <p className="mt-1">{building.skill}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a className="btn" href={hrefFor({ view: 'map', building: building.id })}>
            Building and roads
          </a>
          {building.families.map((f) => (
            <span key={f} className="chip self-center">
              {FAMILY_NAME[f]}
            </span>
          ))}
          {task && <span className="chip self-center">Task {task.id}: {task.title}</span>}
        </div>

        <Section id="overview" title="Overview">
          {notes.overview.map((b, i) => (
            <BlockView key={i} block={b} />
          ))}
        </Section>

        {notes.beyondProject && (
          <Section id="beyond" title="What SAA adds beyond your project">
            {notes.beyondProject.map((b, i) => (
              <BlockView key={i} block={b} />
            ))}
          </Section>
        )}

        {notes.bullets.map((bn) => {
          const bullet = BULLET_BY_ID.get(bn.id);
          return (
            <Section key={bn.id} id={`b-${bn.id}`} title={bullet ? bullet.text : bn.id} kicker={bullet?.type === 'knowledge' ? 'Knowledge of' : 'Skills in'}>
              <h4 className="mt-1 font-semibold">Key concepts</h4>
              {bn.concepts.map((b, i) => (
                <BlockView key={i} block={b} />
              ))}
              {bn.services.length > 0 && (
                <p className="flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="font-semibold">Services:</span>
                  {bn.services.map((s) => (
                    <span key={s} className="chip">
                      {s}
                    </span>
                  ))}
                </p>
              )}
              <h4 className="mt-1 font-semibold">In a design</h4>
              <p className="text-sm text-[var(--fg-muted)]" data-kind="guidance">
                Study guidance built on the facts above: a way to apply them, not a statement from AWS.
              </p>
              {bn.design.map((b, i) => (
                <BlockView key={i} block={b} />
              ))}
            </Section>
          );
        })}

        {notes.cues.length > 0 && (
          <Section id="cues" title="Scenario cues">
            <p className="text-sm text-[var(--fg-muted)]" data-kind="guidance">
              Exam heuristics. The quoted fact explains why the service fits; matching a phrase to a service is study guidance, not a statement from AWS.
            </p>
            <ul className="grid gap-2">
              {notes.cues.map((c, i) => (
                <li key={i} className="rounded-xl border border-[var(--line)] p-2.5">
                  <p>
                    <span className="text-[var(--fg-muted)]">If the question says </span>
                    <strong>&ldquo;{c.phrase}&rdquo;</strong>
                    <span className="text-[var(--fg-muted)]"> think </span>
                    <strong>{c.points}</strong>
                  </p>
                  <BlockView block={c.fact} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {notes.examples.length > 0 && (
          <Section id="examples" title="Worked examples">
            {notes.examples.map((ex, i) => (
              <div key={i} className="rounded-xl border border-[var(--line)] p-2.5">
                <h4 className="font-display text-lg font-semibold">
                  {ex.title} <span className="chip align-middle" data-kind="status">Illustrative</span>
                </h4>
                <pre className="notes-code" tabIndex={0} aria-label={`${ex.title} (code)`}>
                  <code>{ex.code}</code>
                </pre>
                <h5 className="font-semibold">What each part does</h5>
                <ul className="grid gap-1.5 text-sm">
                  {ex.explanation.map((b, j) => (
                    <BlockView key={j} block={b} as="li" />
                  ))}
                </ul>
              </div>
            ))}
          </Section>
        )}

        {pairs.length > 0 && (
          <Section id="confuse" title="Don't confuse">
            <div className="grid gap-4">
              {pairs.map((p) => (
                <ConfuseCard key={p.id} pair={p} showHome={p.home !== building.id} />
              ))}
            </div>
          </Section>
        )}

        {notes.azure && (
          <Section id="azure" title="Coming from Azure">
            {notes.azure.map((a, i) => (
              <div key={i} className="rounded-xl border border-[var(--line)] p-2.5" data-kind="azure">
                <h4 className="font-display text-lg font-semibold">
                  {a.concept} <span className="text-[var(--fg-muted)]">compares with</span> {a.aws}
                </h4>
                <BlockView block={a.mapping} />
                <p className="mt-1 font-semibold">Where the analogy breaks</p>
                <BlockView block={a.breaks} />
              </div>
            ))}
          </Section>
        )}

        <SourceList list={cites.list} />
      </article>
    </CitesContext.Provider>
  );
}

function Section({ id, title, kicker, children }: { id: string; title: string; kicker?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-6 grid gap-2" aria-labelledby={`${id}-h`}>
      {kicker && <p className="text-xs uppercase tracking-wide text-[var(--fg-muted)]">{kicker}</p>}
      <h3 id={`${id}-h`} className="text-2xl font-semibold leading-snug">
        {title}
      </h3>
      {children}
    </section>
  );
}
