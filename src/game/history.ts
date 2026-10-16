import type { GameState, ItemHistory, LogKind, RecentEntry } from '../save/schema';
import { RECENT_NONPUZZLE_CAP, RECENT_PUZZLE_CAP } from '../save/schema';

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

/**
 * Records one answered item in the per-item history and, for counted kinds with a domain, in the readiness list.
 * `domain` is the exam domain number 1 to 4, or null for Foundations (they belong to no domain).
 */
export function recordResult(game: GameState, item: { id: string; ok: boolean; kind: LogKind; at: string; domain: number | null }): Pick<GameState, 'history' | 'recent'> {
  const history = { ...game.history, [item.id]: nextHistory(game.history[item.id], item.ok, item.kind, item.at) };
  if (item.domain === null || !COUNTED_KINDS.has(item.kind)) return { history, recent: game.recent };
  const key = String(item.domain);
  const list = [...(game.recent[key] ?? []), [item.id, item.ok ? 1 : 0, item.kind] as RecentEntry];
  return { history, recent: { ...game.recent, [key]: pruneRecent(list) } };
}
