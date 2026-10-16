import { useEffect, useState } from 'react';
import { BUILDING_BY_ID } from '../../data';
import { DEFAULT_ENV } from '../../game/env';
import { workbenchAvailability } from '../../game/puzzle';
import { hrefFor } from '../../lib/route';
import { loadWorkbench } from '../../puzzles/load';
import { PUZZLE_TYPE_NAME, type Scenario } from '../../puzzles/types';
import { useSnapshot } from '../../save/context';

export default function WorkbenchPage({ buildingId }: { buildingId: string | null }) {
  const { save } = useSnapshot();
  const building = buildingId ? BUILDING_BY_ID.get(buildingId) : undefined;
  const [items, setItems] = useState<Scenario<unknown>[] | null>(null);

  useEffect(() => {
    let live = true;
    if (buildingId) {
      void loadWorkbench(buildingId).then((r) => {
        if (live) setItems(r.map((x) => x.scenario));
      });
    }
    return () => {
      live = false;
    };
  }, [buildingId]);

  if (!building) {
    return (
      <p>
        That building does not exist. <a className="inline-link" href="#/map">Back to the city map</a>.
      </p>
    );
  }
  const avail = workbenchAvailability(save, building.id, { env: DEFAULT_ENV });
  const back = hrefFor({ view: 'map', building: building.id });
  return (
    <section aria-labelledby="wb-title" data-district={building.district}>
      <p className="text-sm text-[var(--fg-muted)]">{building.name}</p>
      <h2 id="wb-title" className="text-3xl font-semibold">
        Workbench
      </h2>
      <p className="mt-1 max-w-prose text-sm text-[var(--fg-muted)]">Practice puzzles for this building. They earn XP and feed readiness, but never commission a building.</p>
      {!avail.ok ? (
        <p role="status" className="mt-3 rounded-xl border-2 border-[var(--line)] p-3" data-testid="workbench-locked">
          {avail.message}
        </p>
      ) : items === null ? (
        <p role="status">Loading puzzles…</p>
      ) : items.length === 0 ? (
        <p className="mt-3">No puzzles are attached to this building.</p>
      ) : (
        <ul className="mt-3 grid gap-2" data-testid="workbench-list">
          {items.map((s) => {
            const h = save.game.history[s.id];
            return (
              <li key={s.id}>
                <a className="flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] bg-[rgba(11,26,43,0.6)] p-3 hover:border-[var(--accent)]" href={`#/puzzle/${s.id}`}>
                  <span className="chip">{PUZZLE_TYPE_NAME[s.type]}</span>
                  <span className="font-semibold">{s.title}</span>
                  <span className="ml-auto text-sm text-[var(--fg-muted)]">
                    level {s.difficulty}
                    {h ? ` · played ${h.n}× · last ${h.lastOk ? 'right' : 'wrong'}` : ''}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
      <a className="btn mt-4" href={back}>
        Back to the building
      </a>
    </section>
  );
}
