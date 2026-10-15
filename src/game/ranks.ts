export interface Rank {
  name: string;
  xp: number;
}

export const RANKS: readonly Rank[] = [
  { name: 'Surveyor', xp: 0 },
  { name: 'Apprentice', xp: 150 },
  { name: 'Foreman', xp: 500 },
  { name: 'Mason', xp: 1200 },
  { name: 'Builder', xp: 2500 },
  { name: 'Architect', xp: 4500 },
  { name: 'Master Builder', xp: 7000 },
  { name: 'City Planner', xp: 10000 },
  { name: 'Chief Architect', xp: 13000 },
];

export interface RankInfo {
  index: number;
  rank: Rank;
  next: Rank | null;
  /** XP into the current rank and the XP needed to reach the next one (both 0 at the top). */
  into: number;
  span: number;
}

export function rankFor(xp: number): RankInfo {
  const safe = Math.max(0, Math.floor(xp));
  let index = 0;
  RANKS.forEach((r, i) => {
    if (safe >= r.xp) index = i;
  });
  const rank = RANKS[index] as Rank;
  const next = RANKS[index + 1] ?? null;
  return { index, rank, next, into: next ? safe - rank.xp : 0, span: next ? next.xp - rank.xp : 0 };
}
