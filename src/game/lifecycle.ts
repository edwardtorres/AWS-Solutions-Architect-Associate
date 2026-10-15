import type { BuildingState } from '../data/types';
import { deriveState } from '../save/state';
import type { Save } from '../save/schema';
import { addDays, type DayKey } from './day';
import type { GameEnv } from './env';
import { INSPECTION_FAILS_BEFORE_LOCK } from './scoring';

export type Availability =
  | { ok: true }
  | { ok: false; code: 'wrong-state' | 'notes-first' | 'active-attempt' | 'locked' | 'placement-used' | 'not-portfolio' | 'already-commissioned'; message: string };

export function stateOf(save: Save, id: string, env: GameEnv): BuildingState {
  return deriveState(id, save, env.graph, env.startIds);
}

const no = (code: Extract<Availability, { ok: false }>['code'], message: string): Availability => ({ ok: false, code, message });

function otherActive(save: Save, id: string, kind: string): Availability | null {
  const a = save.game.active;
  if (!a) return null;
  if (a.building === id && a.kind === kind) return null;
  return no('active-attempt', 'Another attempt is in progress. Finish it first.');
}

/** Start-up check: the building is surveyed and its notes were opened. */
export function startupAvailability(save: Save, id: string, env: GameEnv): Availability {
  const busy = otherActive(save, id, 'startup');
  if (busy) return busy;
  const state = stateOf(save, id, env);
  if (state !== 'surveyed') return no('wrong-state', state === 'planned' ? 'This building is still planned: commission its prerequisites first.' : 'The start-up check is only for surveyed buildings.');
  if (!save.game.notesOpened[id]) return no('notes-first', 'Open the study notes first, then take the start-up check.');
  return { ok: true };
}

/** The day an inspection lock ends, or null when the building is not locked on `today`. */
export function inspectionLockedUntil(save: Save, id: string, today: DayKey): DayKey | null {
  const rec = save.game.inspections[id];
  if (!rec || rec.day !== today || rec.fails < INSPECTION_FAILS_BEFORE_LOCK) return null;
  return addDays(today, 1);
}

export function inspectionAvailability(save: Save, id: string, env: GameEnv, today: DayKey): Availability {
  const busy = otherActive(save, id, 'inspection');
  if (busy) return busy;
  const state = stateOf(save, id, env);
  if (state !== 'under_construction') return no('wrong-state', 'Inspections are for buildings under construction. Pass the start-up check first.');
  if (inspectionLockedUntil(save, id, today)) {
    return no('locked', 'You failed two inspections of this building today, so inspections are locked until tomorrow (your local date changes at midnight). Re-read the notes in the meantime.');
  }
  return { ok: true };
}

/** Placement: portfolio buildings only, any state except commissioned, one attempt started per local day. */
export function placementAvailability(save: Save, id: string, env: GameEnv, today: DayKey): Availability {
  const busy = otherActive(save, id, 'placement');
  if (busy) return busy;
  if (!env.portfolio.has(id)) return no('not-portfolio', 'Placement is only for buildings that build on a portfolio project.');
  if (stateOf(save, id, env) === 'commissioned') return no('already-commissioned', 'This building is already commissioned.');
  const resuming = save.game.active?.kind === 'placement' && save.game.active.building === id;
  if (!resuming && save.game.placements[id]?.lastStartDay === today) {
    return no('placement-used', 'You already used today’s placement attempt for this building. Try again tomorrow (your local date changes at midnight).');
  }
  return { ok: true };
}

export type NextAction = 'locked-planned' | 'notes' | 'startup' | 'inspection' | 'inspection-locked' | 'done';

/** What the building panel should offer next. */
export function nextAction(save: Save, id: string, env: GameEnv, today: DayKey): NextAction {
  const state = stateOf(save, id, env);
  if (state === 'commissioned') return 'done';
  if (state === 'planned') return 'locked-planned';
  if (state === 'surveyed') return save.game.notesOpened[id] ? 'startup' : 'notes';
  return inspectionLockedUntil(save, id, today) ? 'inspection-locked' : 'inspection';
}
