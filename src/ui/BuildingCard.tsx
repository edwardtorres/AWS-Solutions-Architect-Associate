import { memo } from 'react';
import { BUILDING_BY_ID, DISTRICT_BY_ID, prerequisitesOf, type Building, type BuildingState } from '../data';
import { STATE_LABEL } from '../save/state';
import { StateIcon } from './icons';

interface Props {
  building: Building;
  state: BuildingState;
  /** The building whose panel is open (or null). */
  active: boolean;
  /** Prerequisite or dependent of the highlighted building. */
  related: boolean;
  onOpen: (id: string) => void;
  onHover: (id: string | null) => void;
  registerRef?: (id: string, el: HTMLButtonElement | null) => void;
}

function BuildingCardImpl({ building, state, active, related, onOpen, onHover, registerRef }: Props) {
  // Locked cards say what unlocks them.
  const needs = state === 'planned' ? prerequisitesOf(building.id).map((r) => BUILDING_BY_ID.get(r.from)?.name ?? r.from) : [];
  const district = DISTRICT_BY_ID[building.district];
  return (
    <button
      type="button"
      ref={registerRef ? (el) => registerRef(building.id, el) : undefined}
      className="building"
      data-district={building.district}
      data-state={state}
      data-active={active ? 'true' : undefined}
      data-related={related ? 'true' : undefined}
      data-building={building.id}
      aria-haspopup="dialog"
      onClick={() => onOpen(building.id)}
      onMouseEnter={() => onHover(building.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(building.id)}
      onBlur={() => onHover(null)}
    >
      <span className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0">
          <StateIcon state={state} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[1.05rem] font-semibold leading-tight">{building.name}</span>
          <span className="mt-1 block text-[0.82rem] leading-snug">{building.skill}</span>
        </span>
      </span>
      <span className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="chip" data-kind="state">
          {STATE_LABEL[state]}
        </span>
        {building.task ? <span className="chip">Task {building.task}</span> : <span className="chip">Foundation</span>}
        {building.portfolio && (
          <span className="chip" data-kind="portfolio">
            Portfolio
          </span>
        )}
        {building.azure && building.azure.length > 0 && (
          <span className="chip" data-kind="azure">
            Azure
          </span>
        )}
      </span>
      {needs.length > 0 && (
        <span className="mt-2 block text-[0.78rem] text-[var(--fg-muted)]">
          Needs: {needs.slice(0, 2).join(', ')}
          {needs.length > 2 ? ` +${needs.length - 2} more` : ''}
        </span>
      )}
      <span className="visually-hidden">
        {' '}
        in {district.name}
        {building.island ? `, island ${building.island}` : ''}
      </span>
    </button>
  );
}

export const BuildingCard = memo(BuildingCardImpl);
