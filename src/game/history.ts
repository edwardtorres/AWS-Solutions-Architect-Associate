import type { GameState, ItemHistory, LogKind, RecentEntry } from '../save/schema';
import { BULLET_WINDOW, MAINT_WINDOW, RECENT_NONPUZZLE_CAP, RECENT_PUZZLE_CAP } from '../save/schema';

/** Answer kinds that count towards readiness. Start-up checks never do. */
export const COUNTED_KINDS: ReadonlySet<LogKind> = new Set<LogKind>(['inspection', 'placement', 'review', 'puzzle', 'lab', 'mock']);

/** Keeps the newest non-puzzle results and the newest puzzle plays; both are exactly what readiness can look at. */
export function pruneRecent(list: readonly RecentEntry[]): RecentEntry[] {
  let nonPuzzle = 0;
  let puzzle = 0;
  const keep = new Array<boolean>(list.length).fill(false);
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const isPuzzle = (list[i] as RecentEntry)[2] === 'puzzle';
    if (isPuzzle ? puzzle < RECENT_PUZZLE_CAP : nonPuzzle < RECENT_NONPUZZLE_CAP) {
      keep[i] = true;
      if (isPuzzle) puzzle += 1;
      else nonPuzzle += 1;
    }
  }
  return list.filter((_, i) => keep[i]);
}

export function nextHistory(prev: ItemHistory | undefined, ok: boolean, kind: LogKind, at: string): ItemHistory {
  return { n: (prev?.n ?? 0) + 1, ok: (prev?.ok ?? 0) + (ok ? 1 : 0), streak: ok ? (prev?.streak ?? 0) + 1 : 0, last: at, lastOk: ok ? 1 : 0, lastKind: kind };
}

/** Don't-confuse pair ids from a question's `trap:<pair>` tags. */
export const trapPairs = (tags: readonly string[]): string[] => tags.filter((t) => t.startsWith('trap:')).map((t) => t.slice(5));

/** Kinds whose results feed the per-building maintenance figure. */
export const MAINT_KINDS: ReadonlySet<LogKind> = new Set<LogKind>(['review', 'mock']);

const push = (cur: string | undefined, ok: boolean, cap: number): string => `${cur ?? ''}${ok ? '1' : '0'}`.slice(-cap);

export interface ResultItem {
  id: string;
  ok: boolean;
  kind: LogKind;
  at: string;
  domain: number | null;
  /** Outline bullets of the item (questions and puzzle scenarios); feeds the per-bullet figure. */
  bullets?: readonly string[];
  /** Don't-confuse pair ids of the item. */
  traps?: readonly string[];
  /** The item's building; feeds the maintenance figure for review and mock results. */
  building?: string;
}

/**
 * Records one answered item in the per-item history and, for counted kinds, in the readiness list (when it has a domain),
 * the per-bullet figure, the trap counters, and (review and mock results only) the per-building maintenance figure.
 * `domain` is the exam domain number 1 to 4, or null for Foundations (they belong to no domain).
 */
export function recordResult(game: GameState, item: ResultItem): Pick<GameState, 'history' | 'recent' | 'byBullet' | 'traps' | 'maint'> {
  const history = { ...game.history, [item.id]: nextHistory(game.history[item.id], item.ok, item.kind, item.at) };
  if (!COUNTED_KINDS.has(item.kind)) return { history, recent: game.recent, byBullet: game.byBullet, traps: game.traps, maint: game.maint };
  let recent = game.recent;
  if (item.domain !== null) {
    const key = String(item.domain);
    const list = [...(game.recent[key] ?? []), [item.id, item.ok ? 1 : 0, item.kind] as RecentEntry];
    recent = { ...game.recent, [key]: pruneRecent(list) };
  }
  let byBullet = game.byBullet;
  if (item.bullets && item.bullets.length > 0) {
    byBullet = { ...game.byBullet };
    for (const b of item.bullets) byBullet[b] = push(byBullet[b], item.ok, BULLET_WINDOW);
  }
  let traps = game.traps;
  if (item.traps && item.traps.length > 0) {
    traps = { ...game.traps };
    for (const t of item.traps) {
      const cur = traps[t] ?? { n: 0, miss: 0 };
      traps[t] = { n: cur.n + 1, miss: cur.miss + (item.ok ? 0 : 1) };
    }
  }
  let maint = game.maint;
  if (item.building && MAINT_KINDS.has(item.kind)) maint = { ...game.maint, [item.building]: push(game.maint[item.building], item.ok, MAINT_WINDOW) };
  return { history, recent, byBullet, traps, maint };
}
