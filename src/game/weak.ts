import type { BuildingDef } from '../data/types';
import type { GameState, Save } from '../save/schema';
import { BULLET_WINDOW } from '../save/schema';
import type { QMeta } from './readiness';

/** Fewer recent answers than this and a bullet shows "not enough data". */
export const MIN_BULLET_ANSWERS = 3;
/** Below this recent accuracy a bullet or family counts as weak. */
export const WEAK_BELOW = 0.7;
/** Families need at least this many pooled answers before they are judged. */
export const MIN_FAMILY_ANSWERS = 10;

export interface BulletStat {
  bullet: string;
  n: number;
  correct: number;
  /** Null under MIN_BULLET_ANSWERS ("not enough data"). */
  accuracy: number | null;
}

export const bitsStat = (bits: string | undefined): { n: number; correct: number } => ({ n: bits?.length ?? 0, correct: [...(bits ?? '')].filter((c) => c === '1').length });

export function bulletStat(byBullet: Readonly<Record<string, string>>, bullet: string): BulletStat {
  const { n, correct } = bitsStat(byBullet[bullet]);
  return { bullet, n, correct, accuracy: n >= MIN_BULLET_ANSWERS ? correct / n : null };
}

/**
 * Bullets ranked weakest first: those with enough data by accuracy ascending (more answers first on a tie), then those with
 * too little data (more answers first), then bullets never answered. Each row says how many answers its score rests on.
 */
export function rankBullets(byBullet: Readonly<Record<string, string>>, allBullets: readonly string[]): BulletStat[] {
  const stats = allBullets.map((b) => bulletStat(byBullet, b));
  const tier = (s: BulletStat) => (s.accuracy !== null ? 0 : s.n > 0 ? 1 : 2);
  return stats.sort((a, b) => tier(a) - tier(b) || (a.accuracy ?? 0) - (b.accuracy ?? 0) || b.n - a.n || (a.bullet < b.bullet ? -1 : 1));
}

export interface TrapStat {
  pair: string;
  n: number;
  miss: number;
  rate: number;
}

/** Don't-confuse pairs missed most: by misses, then by miss rate. Pairs never missed are left out. */
export function rankTraps(traps: Readonly<Record<string, { n: number; miss: number }>>): TrapStat[] {
  return Object.entries(traps)
    .filter(([, t]) => t.miss > 0)
    .map(([pair, t]) => ({ pair, n: t.n, miss: t.miss, rate: t.miss / t.n }))
    .sort((a, b) => b.miss - a.miss || b.rate - a.rate || (a.pair < b.pair ? -1 : 1));
}

export interface FamilyStat {
  family: string;
  n: number;
  correct: number;
  accuracy: number | null;
  weak: boolean;
}

/**
 * Service families (the Atlas groups): the recent results of every bullet of every building that carries the family, pooled.
 * The outline repeats a service across domains, so a weak family shows up even when no single bullet has much data.
 */
export function familyStats(byBullet: Readonly<Record<string, string>>, buildings: readonly Pick<BuildingDef, 'families' | 'bullets'>[]): FamilyStat[] {
  const pooled = new Map<string, { n: number; correct: number; bullets: Set<string> }>();
  for (const b of buildings) {
    for (const f of b.families) {
      const cur = pooled.get(f) ?? { n: 0, correct: 0, bullets: new Set<string>() };
      for (const bullet of b.bullets) {
        if (cur.bullets.has(bullet)) continue;
        cur.bullets.add(bullet);
        const s = bitsStat(byBullet[bullet]);
        cur.n += s.n;
        cur.correct += s.correct;
      }
      pooled.set(f, cur);
    }
  }
  return [...pooled.entries()]
    .map(([family, p]) => {
      const accuracy = p.n >= MIN_FAMILY_ANSWERS ? p.correct / p.n : null;
      return { family, n: p.n, correct: p.correct, accuracy, weak: accuracy !== null && accuracy < WEAK_BELOW };
    })
    .sort((a, b) => Number(b.weak) - Number(a.weak) || (a.accuracy ?? 2) - (b.accuracy ?? 2) || (a.family < b.family ? -1 : 1));
}

/**
 * One-time backfill for saves made before version 5: rebuilds the per-bullet figure from `recent` (the newest counted results per
 * domain, oldest first) with the bullets of each item. Nothing is lost: it only fills figures that were never recorded.
 */
export function backfillByBullet(save: Save, meta: ReadonlyMap<string, QMeta>): Save {
  if (save.game.statsBackfilled) return save;
  const byBullet: GameState['byBullet'] = { ...save.game.byBullet };
  for (const list of Object.values(save.game.recent)) {
    for (const [id, ok] of list) {
      const m = meta.get(id);
      if (!m) continue;
      for (const b of m.bullets) byBullet[b] = `${byBullet[b] ?? ''}${ok === 1 ? '1' : '0'}`.slice(-BULLET_WINDOW);
    }
  }
  return { ...save, game: { ...save.game, byBullet, statsBackfilled: true } };
}
