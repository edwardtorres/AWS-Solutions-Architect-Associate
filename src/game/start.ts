import type { Question } from '../content/types';
import type { ActiveAttempt, AttemptKind, Save } from '../save/schema';
import { today, type DayKey } from './day';
import { drawAttempt } from './draw';
import type { Ctx } from './engine';
import { inspectionAvailability, placementAvailability, startupAvailability, type Availability } from './lifecycle';
import { RULES } from './scoring';

type Fail = { ok: false; availability: Extract<Availability, { ok: false }> };
export type StartResult = { ok: true; save: Save; attempt: ActiveAttempt; resumed: boolean } | Fail | { ok: false; availability: { ok: false; code: 'no-questions'; message: string } };


const iso = (clock: Ctx['clock']): string => clock.now().toISOString();

function availabilityFor(save: Save, kind: AttemptKind, building: string, ctx: Ctx, day: DayKey): Availability {
  if (!ctx.env.buildingIds.includes(building)) return { ok: false, code: 'wrong-state', message: 'Unknown building.' };
  if (kind === 'startup') return startupAvailability(save, building, ctx.env);
  if (kind === 'inspection') return inspectionAvailability(save, building, ctx.env, day);
  return placementAvailability(save, building, ctx.env, day);
}

/**
 * Starts an attempt, or resumes the one in progress for this building and kind (the same questions in the
 * same order, so a reload never re-rolls). A placement attempt is counted against the day when it starts.
 */
export function startAttempt(
  save: Save,
  kind: AttemptKind,
  building: string,
  bank: readonly Question[],
  ctx: Ctx,
  random: () => number,
): StartResult {
  const day = today(ctx.clock);
  const a = save.game.active;
  if (a && a.kind === kind && a.building === building) return { ok: true, save, attempt: a, resumed: true };
  const availability = availabilityFor(save, kind, building, ctx, day);
  if (!availability.ok) return { ok: false, availability };
  const prevIds = kind === 'inspection' ? save.game.inspections[building]?.prevIds : kind === 'startup' ? save.game.startups[building]?.prevIds : undefined;
  const picked = drawAttempt(kind, building, bank, { random, prevIds, seen: save.game.seen, bullets: ctx.env.bulletsOf(building) });
  if (picked.length < RULES[kind].total) {
    return { ok: false, availability: { ok: false, code: 'no-questions', message: 'Not enough questions are available for this check yet.' } };
  }
  const attempt: ActiveAttempt = {
    id: `${kind}-${building}-${iso(ctx.clock)}`,
    kind,
    building,
    questionIds: picked.map((q) => q.id),
    seed: Math.floor(random() * 2 ** 31),
    startedAt: iso(ctx.clock),
    day,
    answers: {},
  };
  const game = { ...save.game, active: attempt };
  if (kind === 'placement') game.placements = { ...game.placements, [building]: { lastStartDay: day } };
  return { ok: true, save: { ...save, game }, attempt, resumed: false };
}

