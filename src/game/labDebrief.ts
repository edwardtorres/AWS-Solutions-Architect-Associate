import type { Question } from '../content/types';
import { eligible } from '../questions/pool';
import { DEBRIEF_SIZE } from '../labs/types';
import type { LabDebrief, Save } from '../save/schema';
import type { Ctx } from './engine';
import { progressOf, withProgress, type DebriefStart, type LabRef } from './lab';

const iso = (clock: Ctx['clock']): string => clock.now().toISOString();

// The draw names the mock-reserve tag (through the question pool), so it loads with the question bank, never in the first chunk.
/** The lab's own bullets decide the pool; live questions only (never the mock reserve). Spreads over bullets, avoids the last debrief, prefers less-seen questions. */
export function drawDebrief(bank: readonly Question[], bullets: readonly string[], opts: { random: () => number; prevIds?: readonly string[]; seen?: Readonly<Record<string, number>> }): Question[] {
  const prev = new Set(opts.prevIds ?? []);
  const seen = opts.seen ?? {};
  const pool = eligible(bank, 'debrief').filter((q) => q.bullets.some((b) => bullets.includes(b)));
  const rank = new Map<string, number>();
  for (const q of pool) rank.set(q.id, (prev.has(q.id) ? 1_000_000 : 0) + (seen[q.id] ?? 0) * 1000 + opts.random());
  const sorted = [...pool].sort((a, b) => (rank.get(a.id) as number) - (rank.get(b.id) as number));
  const picked: Question[] = [];
  const has = (q: Question) => picked.some((p) => p.id === q.id);
  const order = [...bullets].map((b) => ({ b, r: opts.random() })).sort((x, y) => x.r - y.r).map((x) => x.b);
  for (const b of order) {
    if (picked.length >= DEBRIEF_SIZE) break;
    const cand = sorted.find((q) => !has(q) && q.bullets.includes(b) && !picked.some((p) => p.bullets.includes(b)));
    if (cand) picked.push(cand);
  }
  for (const q of sorted) {
    if (picked.length >= DEBRIEF_SIZE) break;
    if (!has(q)) picked.push(q);
  }
  return picked.map((q) => ({ q, r: opts.random() })).sort((x, y) => x.r - y.r).map((x) => x.q);
}

/** Starts the debrief (or resumes an unfinished one). Available once the lab is marked complete. */
export function startDebrief(save: Save, lab: LabRef, bank: readonly Question[], ctx: Ctx, random: () => number): DebriefStart {
  const p = progressOf(save, lab.id);
  if (!p.completedAt) return { ok: false, message: 'Mark the lab complete first.' };
  if (p.debrief && !p.debrief.finishedAt) return { ok: true, save, debrief: p.debrief, resumed: true };
  const picked = drawDebrief(bank, lab.bullets, { random, prevIds: p.debrief?.questionIds, seen: save.game.seen });
  if (picked.length < DEBRIEF_SIZE) return { ok: false, message: 'Not enough questions are available for this debrief yet.' };
  const debrief: LabDebrief = { questionIds: picked.map((q) => q.id), seed: Math.floor(random() * 2 ** 31), startedAt: iso(ctx.clock), answers: {} };
  return { ok: true, save: withProgress(save, lab.id, { ...p, debrief }), debrief, resumed: false };
}

